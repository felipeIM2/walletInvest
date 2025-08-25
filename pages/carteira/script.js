const DOM = {
  tabelaAcoes: '#tabelaAcoes',
  modalCarteira: '#modalCarteira',
  acaoCategorias: '#acaoCategorias',
  acaoCodigo: '#acaoCodigo',
  acaoValor: '#acaoValor',
  acaoQuantidade: '#acaoQuantidade',
  adicionarAcao: '#adicionarAcao',
  metaValor: '#metaValor',
  atualizarPreco: '#atualizarPreco'
};

const categoriasSemCodigo = [
  "", 'CDB', 'LCI', 'LCA', 'FDI', 'Cripto', 
  'CRI/CRA', 'Debêntures', 'PP', 'COE', 'Derivativos', 
   'Moedas'
];

let acaoEditandoId = null;
let usuario = null;

// Função para obter usuário do sessionStorage de forma segura
const obterUsuario = () => {
  try {
    const usuarioStr = sessionStorage.getItem("usuario");
    if (usuarioStr) {
      return JSON.parse(usuarioStr);
    }
  } catch (error) {
    console.error("Erro ao parsear usuário:", error);
    sessionStorage.removeItem("usuario"); // Remove dados corrompidos
  }
  return null;
};

// Função para validar usuário com o backend
const validarUsuario = async () => {
  try {
    const usuarioLocal = obterUsuario();
    if (!usuarioLocal || !usuarioLocal.login || !usuarioLocal.conta) {
      throw new Error('Dados do usuário ausentes');
    }

    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.VALIDAR_USUARIO),
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        login: usuarioLocal.login,
        conta: usuarioLocal.conta
      })
    });

    if (!response.valid) {
      throw new Error(response.message || 'Sessão inválida');
    }

    return response.usuario;
  } catch (error) {
    console.error('Erro na validação:', error);
    sessionStorage.removeItem('usuario');
    showMessage('Sua sessão expirou. Por favor, faça login novamente.', 'error');
    location.href = '/';
    return null;
  }
};

// Inicializar usuário
usuario = obterUsuario();
let cotacoes = {};
let totais = {
  investido: 0,
  quantidade: 0,
  atual: 0,
  lucro: 0,
  lucroPorcento: 0
};

const formatarMoeda = valor => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(valor);

// Funções para interação com a API
const carregarCarteira = async () => {
  try {
    if (!usuario || !usuario.conta) {
      console.error('Usuário não autenticado ou sem conta');
      return [];
    }
    const response = await $.get(CONFIG.getUrl(CONFIG.ENDPOINTS.CARTEIRA, `/${usuario.conta}`));
    return response.acoes || [];
  } catch (error) {
    console.error("Erro ao carregar carteira:", error);
    return [];
  }
};

const carregarCotacoes = async () => {
  try {
    if (!usuario || !usuario.conta) {
      console.error('Usuário não autenticado ou sem conta');
      return {};
    }
    const response = await $.get(CONFIG.getUrl(CONFIG.ENDPOINTS.COTACOES, `/${usuario.conta}`));
    return response.reduce((acc, cotacao) => {
      acc[cotacao.codigo] = cotacao;
      return acc;
    }, {});
  } catch (error) {
    console.error("Erro ao carregar cotações:", error);
    return {};
  }
};

const salvarAcao = async (acao) => {
  try {
    if (!usuario || !usuario.conta) {
      throw new Error('Usuário não autenticado ou sem conta');
    }
    acao.conta = usuario.conta;
    
    if (acao._id) {
      // Atualizar ação existente
      const response = await $.ajax({
        url: CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${acao._id}`),
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify({
          quantidade: acao.quantidade,
          valor: acao.valor
        })
      });
      return response;
    } else {
      // Adicionar nova ação
      const response = await $.ajax({
        url: CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO),
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(acao)
      });
      return response;
    }
  } catch (error) {
    console.error("Erro ao salvar ação:", error);
    throw error;
  }
};

const removerAcao = async (id) => {
  try {
    await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${id}`),
      method: "DELETE"
    });
    return true;
  } catch (error) {
    console.error("Erro ao remover ação:", error);
    throw error;
  }
};

const validarFormulario = ({ categoria, codigo, valor, quantidade }) => {
  const regexCodigoAcao = /^[A-Z]{4}(3|4|11)$/;
  const regexFII = /^[A-Z]{4}11$/;
  const regexETF = /^[A-Z]{4}[0-9]{1,2}B$/;
  const regexTesouro = /^\d{4}$/;
  
  const anoAtual = new Date().getFullYear();
  
  // Validações de campos obrigatórios
  if (!categoria || isNaN(valor) || isNaN(quantidade) || valor <= 0 || quantidade <= 0) {
    showMessage('Preencha todos os campos corretamente com valores positivos.', 'warning');
    return false;
  }

  // Validações de categoria sem código
  if (categoriasSemCodigo.includes(categoria)) return true;

  // Verificar código
  if (!codigo) {
    showMessage('Por favor, informe um código válido!', 'warning');
    return false;
  }
  
  // Validações específicas por categoria
  switch (categoria) {
    case 'FII':
      if (!regexFII.test(codigo)) {
        showMessage('Código de FII inválido!', 'error');
        return false;
      }
      break;
    
    case 'ETF':
      if (!regexETF.test(codigo)) {
        showMessage('Código de ETF inválido!', 'error');
        return false;
      }
      break;
    
    case 'BDR':
      if (!codigo.includes('.')) {
        showMessage('Código de BDR inválido!', 'error');
        return false;
      }
      break;
    
    case 'Tesouro Direto':
      if (parseInt(codigo) < anoAtual || !regexTesouro.test(codigo)) {
        showMessage('Código do Tesouro Direto inválido! Deve conter 4 dígitos e ser maior ou igual ao ano atual.', 'error');
        return false;
      }
      break;
    
    default:
      // Para as categorias restantes, verifica se o código é válido
      if (!regexCodigoAcao.test(codigo)) {
        showMessage('Código em formato inválido para esta categoria.', 'error');
        return false;
      }
      break;
  }

  return true;
};



const adicionarAcao = async (acao) => {
  try {
    await salvarAcao(acao);
    await atualizarTabela();
    fecharModal();
    // Success message will be shown by the calling function
  } catch (error) {
    console.error('Erro ao adicionar ação:', error);
    showMessage('Erro ao adicionar ação: ' + error.message, 'error');
    throw error; // Re-throw to let calling function handle it
  }
};

const editarAcao = async (acao, showSuccessMessage = true) => {
  try {
    await salvarAcao(acao);
    await atualizarTabela();
    fecharModalEditar();
    if (showSuccessMessage) {
      showMessage('Ação editada com sucesso!', 'success');
    }
  } catch (error) {
    console.error('Erro ao editar ação:', error);
    showMessage('Erro ao editar ação: ' + error.message, 'error');
  }
};

// Funções de interface
const abrirModalConfirmarExclusao = (acao) => {
  $('#excluirCodigo').text(acao.codigo);
  $('#excluirCategoria').text(acao.categoria);
  $('#modalConfirmarExclusao').data('acao-id', acao._id).show();
};

const handleConfirmarExclusao = async () => {
  const acaoId = $('#modalConfirmarExclusao').data('acao-id');
  if (acaoId) {
    try {
      await removerAcao(acaoId);
      await atualizarTabela();
      fecharModalConfirmarExclusao();
      showMessage('Ação removida com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao remover ação:', error);
      showMessage('Erro ao remover ação: ' + error.message, 'error');
    }
  }
};

const limparFormulario = () => {
  $(DOM.acaoCategorias).val('');
  $(DOM.acaoCodigo).val('');
  $(DOM.acaoValor).val('');
  $(DOM.acaoQuantidade).val('');
};

const abrirModal = () => {
  limparFormulario();
  $(DOM.adicionarAcao).text('Adicionar').off('click').click(handleAdicionar);
  $(DOM.modalCarteira).show();
};

const fecharModal = () => {
  $(DOM.modalCarteira).hide();
};

const fecharModalEditar = () => {
  $('#modalEditarAcao').hide();
};

const fecharModalAdicionarMais = () => {
  $('#modalAdicionarMais').hide();
};

const fecharModalConfirmarExclusao = () => {
  $('#modalConfirmarExclusao').hide();
};

// Função para abrir o modal de resumo da carteira
const abrirModalResumo = async () => {
  try {
    const carteira = await carregarCarteira();
    
    // Agrupar por categoria e calcular totais
    const resumoPorCategoria = {};
    let totalGeral = 0;
    
    carteira.forEach(acao => {
      const categoria = acao.categoria;
      const totalInvestido = acao.valor * acao.quantidade;
      
      if (!resumoPorCategoria[categoria]) {
        resumoPorCategoria[categoria] = {
          valor: 0,
          percentual: 0
        };
      }
      
      resumoPorCategoria[categoria].valor += totalInvestido;
      totalGeral += totalInvestido;
    });
    
    // Calcular percentuais
    Object.keys(resumoPorCategoria).forEach(categoria => {
      resumoPorCategoria[categoria].percentual = 
        totalGeral > 0 ? ((resumoPorCategoria[categoria].valor / totalGeral) * 100).toFixed(1) : 0;
    });
    
    // Atualizar o modal com os dados
    $('#resumoTotalInvestido').text(formatarMoeda(totalGeral));
    
    // Limpar e popular as categorias
    const containerCategorias = $('#resumoCategorias');
    containerCategorias.empty();
    
    // Ordenar categorias por valor (maior para menor)
    const categoriasOrdenadas = Object.entries(resumoPorCategoria)
      .sort(([,a], [,b]) => b.valor - a.valor);
    
    categoriasOrdenadas.forEach(([categoria, dados]) => {
      const itemCategoria = $(`
        <div class="categoria-item">
          <div class="categoria-nome">${categoria}</div>
          <div class="categoria-valores">
            <div class="categoria-valor">${formatarMoeda(dados.valor)}</div>
            <div class="categoria-percentual">${dados.percentual}%</div>
          </div>
        </div>
      `);
      
      containerCategorias.append(itemCategoria);
    });
    
    // Mostrar o modal
    $('#modalResumoCarteira').show();
    
  } catch (error) {
    console.error('Erro ao gerar resumo da carteira:', error);
    showMessage('Erro ao carregar resumo da carteira', 'error');
  }
};

const fecharModalResumo = () => {
  $('#modalResumoCarteira').hide();
};

const calcularTotais = (carteira) => {
  totais = {
    investido: carteira.reduce((total, acao) => total + (acao.valor * acao.quantidade), 0),
    quantidade: 0,
    atual: 0,
    lucro: 0,
    lucroPorcento: 0
  };

  carteira.forEach(acao => {
    const totalAcao = acao.valor * acao.quantidade;
    const cotacao = cotacoes[acao.codigo + ".SA"];
    const valorAtual = cotacao ? cotacao.preco : 0;
    const totalAtual = valorAtual !== 0 ? valorAtual * acao.quantidade : totalAcao;
    const lucro = totalAtual !== 0 ? totalAtual - totalAcao : 0;

    totais.quantidade += acao.quantidade;
    totais.atual += totalAtual;
    totais.lucro += lucro;
  });
  
  totais.lucroPorcento = totais.lucro !== 0 ? ((totais.lucro * 100) / totais.atual).toFixed(2) : 0;
};

const renderizarTabela = (carteira) => {
  let tbody = '';

  carteira.forEach((acao) => {
    const totalAcao = acao.valor * acao.quantidade;
    const cotacao = cotacoes[acao.codigo + ".SA"];
    const valorAtual = cotacao ? cotacao.preco : 0;
    const totalAtual = valorAtual * acao.quantidade;
    const lucro = totalAtual !== 0 ? totalAtual - totalAcao : 0;
    const lucroPorcento = lucro !== 0 ? ((lucro * 100) / totalAtual).toFixed(2) : 0;
    const posicaoI = ((totalAcao * 100) / (totais.investido || 1)).toFixed(2);
    
    const classeLucro = lucro >= 0 ? 'valor-superior' : 'valor-inferior';
    
    let classeValorAquisicao, classTotalIvestido;
    
    if (totalAtual !== 0) {
      classTotalIvestido = totalAtual >= totalAcao ? 'valor-superior' : 'valor-inferior';
      classeValorAquisicao = acao.valor <= valorAtual ? 'valor-superior' : 'valor-inferior';
    } else {
      classTotalIvestido = 'valor-superior';
      classeValorAquisicao = "valor-superior";
    }
        
    const dividendYield = cotacao ? cotacao.dividendYield : 0;

    tbody += `
      <tr data-acao-id="${acao._id}">
        <td>${acao.categoria}</td>
        <td>${acao.codigo}</td>
        <td style="font-weight:bold">${formatarMoeda(acao.valor)}</td>
        <td class="${classeValorAquisicao}">${formatarMoeda(valorAtual)}</td>
        <td>${acao.quantidade}</td>
        <td style="font-weight:bold">${formatarMoeda(totalAcao)}</td>
        <td class="${classTotalIvestido}">${formatarMoeda(totalAtual)}</td>
        <td class="${classeLucro}">${formatarMoeda(lucro)}</td>
        <td style="font-weight:bold">${lucroPorcento}%</td>
        <td>${posicaoI}%</td>
        <td style="font-weight:bold">${dividendYield}%</td>
        <td>
          <button class="mais" data-acao-id="${acao._id}"><i class="fa-solid fa-plus"></i></button>
          <button class="editar" data-acao-id="${acao._id}"><i class="fa-solid fa-pen"></i></button>
          <button class="excluir" data-acao-id="${acao._id}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  });

  $(DOM.tabelaAcoes).html(tbody);
  atualizarRodape();
};

const atualizarRodape = () => {
  const classeLucroTotal = totais.lucro >= 0 ? 'valor-superior' : 'valor-inferior';
  let classeTotalAtual = totais.atual !== 0 ? 
    (totais.atual >= totais.investido ? 'valor-superior' : 'valor-inferior') : 
    'valor-superior';

  $('#totalQuantidade').text(totais.quantidade);
  $('#totalInvestido').text(formatarMoeda(totais.investido));
  $('#totalAtual').addClass(classeTotalAtual).text(formatarMoeda(totais.atual));
  $('#totalLucro').addClass(classeLucroTotal).text(formatarMoeda(totais.lucro));
  $('#totalLucroPorcento').text(`${totais.lucroPorcento !== 0 ? totais.lucroPorcento : 0}%`);
};

const handleAdicionar = async () => {
  const acao = {
    categoria: $(DOM.acaoCategorias).val(),
    codigo: $(DOM.acaoCodigo).val().toUpperCase().trim(),
    valor: parseFloat($(DOM.acaoValor).val()),
    quantidade: parseInt($(DOM.acaoQuantidade).val())
  };

  if (!validarFormulario(acao)) return;

  try {
    await adicionarAcao(acao);
    showMessage('Ação adicionada com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao adicionar ação:', error);
    // Error message already shown by adicionarAcao function
  }
};

const abrirModalEditar = async (acaoId) => {
  try {
    // return console.log()
    const response = await $.get(CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${acaoId}`));
    const acao = response;
    
    $('#editCodigo').text(acao.codigo);
    $('#editCategoria').text(acao.categoria);
    $('#editQuantidadeAtual').text(acao.quantidade);
    $('#editPrecoMedio').text(formatarMoeda(acao.valor));
    
    $('#editNovaQuantidade').val(acao.quantidade);
    $('#editNovoValor').val(acao.valor.toFixed(2));
    
    $('#modalEditarAcao').data('acao-id', acao._id).show();
  } catch (error) {
    console.error('Erro ao carregar ação para edição:', error);
    showMessage('Erro ao carregar ação para edição: ' + error.message, 'error');
  }
};

const handleConfirmarEdicao = async () => {
  const acaoId = $('#modalEditarAcao').data('acao-id');
  const novaQuantidade = parseInt($('#editNovaQuantidade').val());
  const novoValor = parseFloat($('#editNovoValor').val());
  
  if (isNaN(novaQuantidade) || novaQuantidade <= 0) {
    showMessage('Por favor, insira uma quantidade válida (maior que zero).', 'warning');
    return;
  }
  
  if (isNaN(novoValor) || novoValor <= 0) {
    showMessage('Por favor, insira um valor válido (maior que zero).', 'warning');
    return;
  }
  
  try {
    const acao = {
      _id: acaoId,
      quantidade: novaQuantidade,
      valor: parseFloat(novoValor.toFixed(2))
    };
    
    await editarAcao(acao);
  } catch (error) {
    console.error('Erro ao editar ação:', error);
    showMessage('Erro ao editar ação: ' + error.message, 'error');
  }
};

const abrirModalAdicionarMais = async (acaoId) => {
  try {
    const response = await $.get(CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${acaoId}`));
    const acao = response;
    const cotacao = cotacoes[acao.codigo + ".SA"];
    const valorAtual = cotacao ? cotacao.preco : acao.valor;

    $('#infoCodigo').text(acao.codigo);
    $('#infoQuantidade').text(acao.quantidade);
    $('#infoPrecoMedio').text(formatarMoeda(acao.valor));
    $('#infoPrecoAtual').text(formatarMoeda(valorAtual));
    
    $('#quantidadeAdicional').val('');
    $('#precoAdicional').val('');
    
    $('#modalAdicionarMais').data('acao-id', acao._id).show();
  } catch (error) {
    console.error('Erro ao carregar ação:', error);
    showMessage('Erro ao carregar ação: ' + error.message, 'error');
  }
};

const handleConfirmarAdicao = async () => {
  const acaoId = $('#modalAdicionarMais').data('acao-id');
  const quantidadeAdicional = parseInt($('#quantidadeAdicional').val());
  const precoAdicionalInput = $('#precoAdicional').val();
  
  if (isNaN(quantidadeAdicional) || quantidadeAdicional <= 0) {
    showMessage('Por favor, insira uma quantidade válida.', 'warning');
    return;
  }
  
  try {
    const response = await $.get(CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${acaoId}`));
    const acao = response;
    const cotacao = cotacoes[acao.codigo + ".SA"];
    
    let precoAdicional;
    if (precoAdicionalInput && parseFloat(precoAdicionalInput) > 0) {
      precoAdicional = parseFloat(precoAdicionalInput);
    } else {
      precoAdicional = cotacao ? cotacao.preco : acao.valor;
    }
    
    const totalInicial = acao.quantidade * acao.valor;
    const totalAdicional = quantidadeAdicional * precoAdicional;
    const novaQuantidade = acao.quantidade + quantidadeAdicional;
    const novoPrecoMedio = (totalInicial + totalAdicional) / novaQuantidade;

    const acaoAtualizada = {
      _id: acaoId,
      quantidade: novaQuantidade,
      valor: parseFloat(novoPrecoMedio.toFixed(2))
    };
    
    await editarAcao(acaoAtualizada, false);
    fecharModalAdicionarMais();
    showMessage('Ações adicionadas com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao adicionar mais ações:', error);
    showMessage('Erro ao adicionar mais ações: ' + error.message, 'error');
  }
};

const handleAtualizarPrecos = async () => {
  $('#loadingScreen').show();
  
  try {
    const carteira = await carregarCarteira();
    const acoes = carteira.map(c => c.codigo + ".SA");

    await $.ajax({
              url: CONFIG.getUrl(CONFIG.ENDPOINTS.BUSCAR_ACOES),
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ 
        acoes, 
        conta: usuario.conta 
      })
    });

    cotacoes = await carregarCotacoes();
    await atualizarTabela();
    $('#loadingScreen').hide();
  } catch (error) {
    console.error("Erro ao atualizar preços:", error);
    $('#loadingScreen').hide();
    showMessage('Erro na requisição ao servidor, favor validar a conexão!', 'error');
  }
};

const atualizarTabela = async () => {
  try {
    const [carteira, novasCotacoes] = await Promise.all([
      carregarCarteira(),
      carregarCotacoes()
    ]);
    
    cotacoes = novasCotacoes;
    calcularTotais(carteira);
    renderizarTabela(carteira);
  } catch (error) {
    console.error("Erro ao atualizar tabela:", error);
    showMessage('Erro ao carregar dados da carteira', 'error');
  }
};

const configurarValidacaoCategoria = () => {
  $(DOM.acaoCategorias).on('change', function() {
    const categoria = $(this).val();
    const inputCodigo = $(DOM.acaoCodigo);
    
    if (categoriasSemCodigo.includes(categoria)) {
      if (categoria === "") {
        inputCodigo.prop('disabled', true).val('').css('background-color', '#f0f0f0');
      } else {
        inputCodigo.prop('disabled', true).val('N/A').css('background-color', '#f0f0f0');
      }
    } else {
      inputCodigo.prop('disabled', false).val('').css('background-color', '');
    }
  });
};

const inicializar = async () => {
  try {
    // Validar usuário com o backend
    usuario = await validarUsuario();
    
    if (!usuario || !usuario.conta) {
      // validarUsuario já trata o redirecionamento
      return;
    }

  configurarValidacaoCategoria();

  // Event listeners
  $(DOM.tabelaAcoes).on('click', '.mais', (e) => {
    abrirModalAdicionarMais($(e.currentTarget).closest('tr').data('acao-id'));
  });
  
  $(DOM.tabelaAcoes).on('click', '.editar', (e) => {
    abrirModalEditar($(e.currentTarget).closest('tr').data('acao-id'));
  });
  
  $(DOM.tabelaAcoes).on('click', '.excluir', (e) => {
    const acaoId = $(e.currentTarget).closest('tr').data('acao-id');
          $.get(CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${acaoId}`), (acao) => {
      abrirModalConfirmarExclusao(acao);
    }).fail(() => {
      showMessage('Erro ao carregar ação para exclusão', 'error');
    });
  });

  $('#modalAdicionarMais .fechar, #modalAdicionarMais').on('click', (e) => {
    if ($(e.target).is('#modalAdicionarMais') || $(e.target).is('.fechar')) {
      fecharModalAdicionarMais();
    }
  });
  
  $('#modalEditarAcao .fechar, #modalEditarAcao').on('click', (e) => {
    if ($(e.target).is('#modalEditarAcao') || $(e.target).is('.fechar')) {
      fecharModalEditar();
    }
  });
  
  $('#modalConfirmarExclusao .fechar, #modalConfirmarExclusao').on('click', (e) => {
    if ($(e.target).is('#modalConfirmarExclusao') || $(e.target).is('.fechar')) {
      fecharModalConfirmarExclusao();
    }
  });

  $('#confirmarAdicao').on('click', handleConfirmarAdicao);
  $('#confirmarEdicao').on('click', handleConfirmarEdicao);
  $('#confirmarExclusao').on('click', handleConfirmarExclusao);
  $('#cancelarExclusao').on('click', fecharModalConfirmarExclusao);

  // Event listeners para o modal de resumo
  $('#modalResumoCarteira .fechar, #modalResumoCarteira').on('click', (e) => {
    if ($(e.target).is('#modalResumoCarteira') || $(e.target).is('.fechar')) {
      fecharModalResumo();
    }
  });

  // Event listeners para hamburger menu
  $('#hamburgerMenu').click(function(e) {
    e.stopPropagation();
    $('#menuOptions').toggleClass('active');
  });

  $(document).click(function() {
    $('#menuOptions').removeClass('active');
  });

  $('#abrirModal').click(function() {
    abrirModal();
    $('#menuOptions').removeClass('active');
  });

  $('#menuRatear').click(function() {
    location = "../rateio/";
    $('#menuOptions').removeClass('active');
  });

  $('#menuResumo').click(function() {
    abrirModalResumo();
    $('#menuOptions').removeClass('active');
  });

  $('#menuProspectar').click(function() {
    location = "../prosperctar/";
    $('#menuOptions').removeClass('active');
  });

  $('#menuProventos').click(function() {
    location = "../proventos/";
    $('#menuOptions').removeClass('active');
  });

  $('#menuSair').click(function() {
    sessionStorage.removeItem("usuario");
    location = "../../";
    $('#menuOptions').removeClass('active');
  });

  $('#abrirModal').on('click', abrirModal);
  $('.fechar, #modalCarteira').on('click', (e) => {
    if ($(e.target).is(DOM.modalCarteira) || $(e.target).is('.fechar')) {
      fecharModal();
    }
  });

  $(DOM.atualizarPreco).on('click', handleAtualizarPrecos);

  // Adicionar rodapé à tabela
  $('table').append(`
    <tfoot>
      <tr>
        <td colspan="4" style="font-weight:bold">Total Investido:</td>
        <td id="totalQuantidade">0</td> 
        <td style="font-weight:bold" id="totalInvestido">R$ 0,00</td> 
        <td id="totalAtual">R$ 0,00</td> 
        <td id="totalLucro">R$ 0,00</td> 
        <td style="font-weight:bold" id="totalLucroPorcento">0</td> 
        <td colspan="3"></td>
      </tr>
    </tfoot>
  `);

  // Carregar dados iniciais
  await atualizarTabela();
}catch{
  console.log(Error)
}
};

$(document).ready(inicializar);