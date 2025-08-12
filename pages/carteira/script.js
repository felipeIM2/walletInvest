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
  "", 'Tesouro Direto', 'CDB', 'LCI', 'LCA', 'FDI', 'Cripto', 
  'CRI/CRA', 'Debêntures', 'PP', 'COE', 'Derivativos', 
  'Commodities', 'Moedas'
];

let acaoEditandoId = null;
let usuario = JSON.parse(sessionStorage.getItem("usuario")) || null;
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
    if (!usuario) throw new Error('Usuário não autenticado');
    const response = await $.get(`/api/carteira/${usuario.conta}`);
    return response;
  } catch (error) {
    console.error("Erro ao carregar carteira:", error);
    return [];
  }
};

const carregarCotacoes = async () => {
  try {
    if (!usuario) throw new Error('Usuário não autenticado');
    const response = await $.get(`/api/cotacoes/${usuario.conta}`);
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
    if (!usuario) throw new Error('Usuário não autenticado');
    acao.conta = usuario.conta;
    
    if (acao._id) {
      // Atualizar ação existente
      const response = await $.ajax({
        url: `/api/carteira/${acao._id}`,
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify(acao)
      });
      return response;
    } else {
      // Adicionar nova ação
      const response = await $.ajax({
        url: "/api/carteira",
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
      url: `/api/carteira/${id}`,
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
  
  if (!categoria || isNaN(valor) || isNaN(quantidade) || valor <= 0 || quantidade <= 0) {
    alert('Preencha todos os campos corretamente com valores positivos.');
    return false;
  }

  if (categoriasSemCodigo.includes(categoria)) {
    return true;
  }

  if (!codigo) {
    alert('Por favor, informe um código válido!');
    return false;
  }

  if (categoria === 'FII' && !regexFII.test(codigo)) {
    alert('Código de FII inválido!');
    return false;
  }

  if (categoria === 'ETF' && !regexETF.test(codigo)) {
    alert('Código de ETF inválido!');
    return false;
  }

  if (categoria === 'BDR' && !codigo.includes('.')) {
    alert('Código de BDR inválido!');
    return false;
  }

  if (!categoriasSemCodigo.includes(categoria) && !regexCodigoAcao.test(codigo)) {
    alert('Código em formato inválido para esta categoria.');
    return false;
  }

  return true;
};

const adicionarAcao = async (acao) => {
  try {
    await salvarAcao(acao);
    await atualizarTabela();
    fecharModal();
  } catch (error) {
    alert("Erro ao adicionar ação: " + error.message);
  }
};

const editarAcao = async (acao) => {
  try {
    await salvarAcao(acao);
    await atualizarTabela();
    fecharModalEditar();
  } catch (error) {
    alert("Erro ao editar ação: " + error.message);
  }
};

// Funções de interface
const abrirModalConfirmarExclusao = (acao) => {
  $('#excluirCodigo').text(acao.codigo);
  $('#excluirCategoria').text(acao.categoria);
  $('#modalConfirmarExclusao').data('acao-id', acao._id).fadeIn();
};

const handleConfirmarExclusao = async () => {
  const acaoId = $('#modalConfirmarExclusao').data('acao-id');
  if (acaoId) {
    try {
      await removerAcao(acaoId);
      await atualizarTabela();
      fecharModalConfirmarExclusao();
    } catch (error) {
      alert("Erro ao remover ação: " + error.message);
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
  $(DOM.modalCarteira).fadeIn();
};

const fecharModal = () => {
  $(DOM.modalCarteira).fadeOut();
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
  } catch (error) {
    alert("Erro ao adicionar ação: " + error.message);
  }
};

const abrirModalEditar = async (acaoId) => {
  try {
    const response = await $.get(`/api/carteira/item/${acaoId}`);
    const acao = response;
    
    $('#editCodigo').text(acao.codigo);
    $('#editCategoria').text(acao.categoria);
    $('#editQuantidadeAtual').text(acao.quantidade);
    $('#editPrecoMedio').text(formatarMoeda(acao.valor));
    
    $('#editNovaQuantidade').val(acao.quantidade);
    $('#editNovoValor').val(acao.valor.toFixed(2));
    
    $('#modalEditarAcao').data('acao-id', acao._id).fadeIn();
  } catch (error) {
    alert("Erro ao carregar ação para edição: " + error.message);
  }
};

const handleConfirmarEdicao = async () => {
  const acaoId = $('#modalEditarAcao').data('acao-id');
  const novaQuantidade = parseInt($('#editNovaQuantidade').val());
  const novoValor = parseFloat($('#editNovoValor').val());
  
  if (isNaN(novaQuantidade) || novaQuantidade <= 0) {
    alert('Por favor, insira uma quantidade válida (maior que zero).');
    return;
  }
  
  if (isNaN(novoValor) || novoValor <= 0) {
    alert('Por favor, insira um valor válido (maior que zero).');
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
    alert("Erro ao editar ação: " + error.message);
  }
};

const abrirModalAdicionarMais = async (acaoId) => {
  try {
    const response = await $.get(`/api/carteira/item/${acaoId}`);
    const acao = response;
    const cotacao = cotacoes[acao.codigo + ".SA"];
    const valorAtual = cotacao ? cotacao.preco : acao.valor;

    $('#infoCodigo').text(acao.codigo);
    $('#infoQuantidade').text(acao.quantidade);
    $('#infoPrecoMedio').text(formatarMoeda(acao.valor));
    $('#infoPrecoAtual').text(formatarMoeda(valorAtual));
    
    $('#quantidadeAdicional').val('');
    $('#precoAdicional').val('');
    
    $('#modalAdicionarMais').data('acao-id', acao._id).fadeIn();
  } catch (error) {
    alert("Erro ao carregar ação: " + error.message);
  }
};

const handleConfirmarAdicao = async () => {
  const acaoId = $('#modalAdicionarMais').data('acao-id');
  const quantidadeAdicional = parseInt($('#quantidadeAdicional').val());
  const precoAdicionalInput = $('#precoAdicional').val();
  
  if (isNaN(quantidadeAdicional) || quantidadeAdicional <= 0) {
    alert('Por favor, insira uma quantidade válida.');
    return;
  }
  
  try {
    const response = await $.get(`/api/carteira/item/${acaoId}`);
    const acao = response;
    const cotacao = cotacoes[acao.codigo + ".SA"];
    
    let precoAdicional;
    if (precoAdicionalInput && parseFloat(precoAdicionalInput) > 0) {
      precoAdicional = parseFloat(precoAdicionalInput);
    } else {
      precoAdicional = cotacao ? cotacao.preco : acao.valor;
    }
    
    const totalInicial = acao.quantidade * acao.valor;
    const totalAdicionado = quantidadeAdicional * precoAdicional;
    const novaQuantidade = acao.quantidade + quantidadeAdicional;
    const novoPrecoMedio = (totalInicial + totalAdicionado) / novaQuantidade;

    const acaoAtualizada = {
      _id: acaoId,
      quantidade: novaQuantidade,
      valor: parseFloat(novoPrecoMedio.toFixed(2))
    };
    
    await editarAcao(acaoAtualizada);
    fecharModalAdicionarMais();
  } catch (error) {
    alert("Erro ao adicionar mais ações: " + error.message);
  }
};

const handleAtualizarPrecos = async () => {
  $('#loadingScreen').fadeIn();
  
  try {
    const carteira = await carregarCarteira();
    const acoes = carteira.map(c => c.codigo + ".SA");
    const tempoMinimoLoading = 1000;
    const inicio = Date.now();

    await $.ajax({
      url: "/api/buscarAcoes",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ 
        acoes, 
        conta: usuario.conta 
      })
    });

    const tempoDecorrido = Date.now() - inicio;
    const tempoRestante = Math.max(0, tempoMinimoLoading - tempoDecorrido);
    
    setTimeout(async () => {
      cotacoes = await carregarCotacoes();
      await atualizarTabela();
      $('#loadingScreen').fadeOut();
    }, tempoRestante);
  } catch (error) {
    console.error("Erro ao atualizar preços:", error);
    $('#loadingScreen').fadeOut();
    alert("Erro na requisição ao servidor, favor validar a conexão!");
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
    alert("Erro ao carregar dados da carteira");
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
  if (!usuario) {
    alert("Usuário não autenticado. Redirecionando para login...");
    setTimeout(() => location.href = "/", 1000);
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
    $.get(`/api/carteira/item/${acaoId}`, (acao) => {
      abrirModalConfirmarExclusao(acao);
    }).fail(() => {
      alert("Erro ao carregar ação para exclusão");
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
};

$(document).ready(inicializar);