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

// Função para validar usuário com o backend usando token
const validarUsuario = async () => {
  try {
    const usuarioLocal = obterUsuario();
    if (!usuarioLocal || !usuarioLocal.login || !usuarioLocal.conta || !usuarioLocal.token) {
      throw new Error('Dados do usuário ausentes');
    }

    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.VALIDAR_USUARIO),
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        login: usuarioLocal.login,
        conta: usuarioLocal.conta,
        token: usuarioLocal.token
      })
    });

    if (!response.valid) {
      throw new Error(response.message || 'Sessão inválida');
    }

    return response.usuario;
  } catch (error) {
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

// Funções para interação com a API com autenticação
const carregarCarteira = async () => {
  try {
    if (!usuario || !usuario.conta || !usuario.token) {
      return [];
    }
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.CARTEIRA, `/${usuario.conta}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      },
      timeout: 10000
    });
    return response.acoes || [];
  } catch (error) {
    if (error.status === 401) {
      AuthManager.logout();
    }
    return [];
  }
};

const carregarCotacoes = async () => {
  try {
    if (!usuario || !usuario.conta || !usuario.token) {
      return {};
    }
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.COTACOES, `/${usuario.conta}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      },
      timeout: 10000
    });
    return response.reduce((acc, cotacao) => {
      acc[cotacao.codigo] = cotacao;
      return acc;
    }, {});
  } catch (error) {
    if (error.status === 401) {
      AuthManager.logout();
    }
    return {};
  }
};

const salvarAcao = async (acao) => {
  try {
    if (!usuario || !usuario.conta || !usuario.token) {
      throw new Error('Usuário não autenticado ou sem conta');
    }
    acao.conta = usuario.conta;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${usuario.token}`
    };
    
    if (acao._id) {
      // Atualizar ação existente
      const response = await $.ajax({
        url: CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${acao._id}`),
        method: "PUT",
        headers: headers,
        data: JSON.stringify({
          quantidade: acao.quantidade,
          valor: acao.valor
        }),
        timeout: 10000
      });
      return response;
    } else {
      // Adicionar nova ação
      const response = await $.ajax({
        url: CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO),
        method: "POST",
        headers: headers,
        data: JSON.stringify(acao),
        timeout: 10000
      });
      return response;
    }
  } catch (error) {
    if (error.status === 401) {
      AuthManager.logout();
      return;
    }
    
    // Tentar extrair a mensagem de erro do servidor
    let errorMessage = 'Erro desconhecido';
    if (error.responseJSON && error.responseJSON.erro) {
      errorMessage = error.responseJSON.erro;
    } else if (error.responseText) {
      try {
        const errorObj = JSON.parse(error.responseText);
        errorMessage = errorObj.erro || errorObj.message || error.responseText;
      } catch {
        errorMessage = error.responseText;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

const removerAcao = async (id) => {
  try {
    await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${id}`),
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      }
    });
    return true;
  } catch (error) {
    if (error.status === 401) {
      AuthManager.logout();
      return false;
    }
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
  } catch (error) {
    console.error('Erro ao adicionar ação:', error);
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
  const $botao = $('#confirmarExclusao');
  
  // Prevenir duplo clique
  if ($botao.prop('disabled')) return;
  $botao.prop('disabled', true).text('Excluindo...');
  
  try {
    const acaoId = $('#modalConfirmarExclusao').data('acao-id');
    if (acaoId) {
      await removerAcao(acaoId);
      await atualizarTabela();
      fecharModalConfirmarExclusao();
      showMessage('Ação removida com sucesso!', 'success');
    }
  } catch (error) {
    showMessage('Erro ao remover ação: ' + error.message, 'error');
  } finally {
    // Reabilitar botão
    $botao.prop('disabled', false).text('Confirmar');
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
    const resumoAtualPorCategoria = {};
    let totalGeral = 0;
    let totalAtual = 0
    
    carteira.forEach(acao => {
    
      const categoria = acao.categoria;
      const totalInvestido = acao.valor * acao.quantidade;
      let totalInvestidoAtual = cotacoes[acao.codigo + ".SA"] ? cotacoes[acao.codigo + ".SA"].preco * acao.quantidade : totalInvestido;
      

      if (!resumoPorCategoria[categoria]) {
        resumoPorCategoria[categoria] = {
          valor: 0,
          percentual: 0
        };
      }


    if (!resumoAtualPorCategoria[categoria]) {
        resumoAtualPorCategoria[categoria] = {
          valor: 0,
          percentual: 0
        };
      }
      
      resumoPorCategoria[categoria].valor += totalInvestido;
      resumoAtualPorCategoria[categoria].valor += totalInvestidoAtual;

      totalGeral += totalInvestido;
      totalAtual += totalInvestidoAtual
        console.log(totalAtual, totalGeral)
    });
    
    // Calcular percentuais
    Object.keys(resumoPorCategoria).forEach(categoria => {
      resumoPorCategoria[categoria].percentual = 
        totalGeral > 0 ? ((resumoPorCategoria[categoria].valor / totalGeral) * 100).toFixed(1) : 0;
    });

    Object.keys(resumoAtualPorCategoria).forEach(categoria => {
      resumoAtualPorCategoria[categoria].percentual = 
        totalAtual > 0 ? ((resumoAtualPorCategoria[categoria].valor / totalAtual) * 100).toFixed(1) : 0;
    });
    
    // Atualizar o modal com os dados
    $('#resumoTotalInvestido').text(formatarMoeda(totalGeral));
    $('#resumoTotalAtualInvestido').text(formatarMoeda(totalAtual));
    
    // Limpar e popular as categorias
    const containerCategorias = $('#resumoCategorias');
    containerCategorias.empty();
    
    // Ordenar categorias por valor (maior para menor)
    const categoriasOrdenadas = Object.entries(resumoPorCategoria)
      .sort(([,a], [,b]) => b.valor - a.valor);
    
    categoriasOrdenadas.forEach(([categoria, dados]) => {

      

      let classAtual;
      if(dados.valor <= resumoAtualPorCategoria[categoria]?.valor){
         classAtual = "acima" 
      }else {
         classAtual = "abaixo"
      }

      const itemCategoria = $(`
        <div class="categoria-item">
          <div class="categoria-nome">${categoria}</div>
          <div class="categoria-valores">
          <div>${formatarMoeda(dados.valor)}</div>
            <div class="categoria-percentual">${dados.percentual}%</div>
          <div class="${classAtual}">${formatarMoeda(resumoAtualPorCategoria[categoria]?.valor)}</div>
            <div class="categoria-percentual">${resumoAtualPorCategoria[categoria]?.percentual}%</div>
          </div>
        </div>
      `);
      containerCategorias.append(itemCategoria);
    });
    
    // Mostrar o modal
    $('#modalResumoCarteira').show();
    
  } catch (error) {
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

  carteira
  .sort((a, b) => {
    // Calcular valorAtual para cada ação
    const cotacaoA = cotacoes[a.codigo + ".SA"];
    const valorAtualA = cotacaoA ? cotacaoA.preco : a.valor;
    const cotacaoB = cotacoes[b.codigo + ".SA"];
    const valorAtualB = cotacaoB ? cotacaoB.preco : b.valor;

    // Priorizar ações cujo valor de aquisição seja maior que o valor atual
    const prioridadeA = a.valor > valorAtualA ? -1 : 0;
    const prioridadeB = b.valor > valorAtualB ? -1 : 0;
    if (prioridadeA !== prioridadeB) {
      return prioridadeB - prioridadeA;
    }
    // Se mesma prioridade, ordenar por categoria e código
    return a.categoria.localeCompare(b.categoria) || a.codigo.localeCompare(b.codigo);
  })
  .forEach((acao) => {

    const totalAcao = acao.valor * acao.quantidade;
    const cotacao = cotacoes[acao.codigo + ".SA"];
    const valorAtual = cotacao ? cotacao.preco : acao.valor;
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
  const $botao = $(DOM.adicionarAcao);
  
  // Prevenir duplo clique
  if ($botao.prop('disabled')) return;
  $botao.prop('disabled', true).text('Adicionando...');
  
  try {
    const acao = {
      categoria: $(DOM.acaoCategorias).val(),
      codigo: $(DOM.acaoCodigo).val().toUpperCase().trim(),
      valor: parseFloat($(DOM.acaoValor).val()),
      quantidade: parseInt($(DOM.acaoQuantidade).val())
    };
    
    // Verificar se os valores foram convertidos corretamente
    if (isNaN(acao.valor) || isNaN(acao.quantidade)) {
      showMessage('Valores inválidos. Verifique se valor e quantidade são números válidos.', 'error');
      return;
    }

    if (!validarFormulario(acao)) return;

    await adicionarAcao(acao);
    showMessage('Ação adicionada com sucesso!', 'success');
  } catch (error) {
    showMessage('Erro ao adicionar ação: ' + error.message, 'error');
  } finally {
    // Reabilitar botão
    $botao.prop('disabled', false).text('Adicionar');
  }
};

const abrirModalEditar = async (acaoId) => {
  try {
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${acaoId}`),
      method: 'GET',
      timeout: 10000
    });
    const acao = response;
    
    $('#editCodigo').text(acao.codigo);
    $('#editCategoria').text(acao.categoria);
    $('#editQuantidadeAtual').text(acao.quantidade);
    $('#editPrecoMedio').text(formatarMoeda(acao.valor));
    
    $('#editNovaQuantidade').val(acao.quantidade);
    $('#editNovoValor').val(acao.valor.toFixed(2));
    
    $('#modalEditarAcao').data('acao-id', acao._id).show();
  } catch (error) {
    showMessage('Erro ao carregar ação para edição: ' + error.message, 'error');
  }
};

const handleConfirmarEdicao = async () => {
  const $botao = $('#confirmarEdicao');
  
  // Prevenir duplo clique
  if ($botao.prop('disabled')) return;
  $botao.prop('disabled', true).text('Salvando...');
  
  try {
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
    
    const acao = {
      _id: acaoId,
      quantidade: novaQuantidade,
      valor: parseFloat(novoValor.toFixed(2))
    };
    
    await editarAcao(acao);
  } catch (error) {
    showMessage('Erro ao editar ação: ' + error.message, 'error');
  } finally {
    // Reabilitar botão
    $botao.prop('disabled', false).text('Confirmar');
  }
};

const abrirModalAdicionarMais = async (acaoId) => {
  try {
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${acaoId}`),
      method: 'GET',
      timeout: 10000
    });
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
    showMessage('Erro ao carregar ação: ' + error.message, 'error');
  }
};

const handleConfirmarAdicao = async () => {
  const $botao = $('#confirmarAdicao');
  
  // Prevenir duplo clique
  if ($botao.prop('disabled')) return;
  $botao.prop('disabled', true).text('Adicionando...');
  
  try {
    const acaoId = $('#modalAdicionarMais').data('acao-id');
    const quantidadeAdicional = parseInt($('#quantidadeAdicional').val());
    const precoAdicionalInput = $('#precoAdicional').val();
    
    if (isNaN(quantidadeAdicional) || quantidadeAdicional <= 0) {
      showMessage('Por favor, insira uma quantidade válida.', 'warning');
      return;
    }
    
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
    showMessage('Erro ao adicionar mais ações: ' + error.message, 'error');
  } finally {
    // Reabilitar botão
    $botao.prop('disabled', false).text('Confirmar');
  }
};

const handleAtualizarPrecos = async () => {
  const $botao = $(DOM.atualizarPreco);
  
  // Prevenir duplo clique
  if ($botao.prop('disabled')) return;
  $botao.prop('disabled', true).text('Atualizando...');
  
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
      }),
      timeout: 30000
    });

    cotacoes = await carregarCotacoes();
    await atualizarTabela();
    showMessage('Preços atualizados com sucesso!', 'success');
  } catch (error) {
    showMessage('Erro na requisição ao servidor, favor validar a conexão!', 'error');
  } finally {
    $('#loadingScreen').hide();
    $botao.prop('disabled', false).text('Atualizar Preços');
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
  } catch (error) {
    showMessage('Erro ao inicializar a aplicação', 'error');
  }
};

$(document).ready(inicializar);