
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
  'Tesouro Direto', 'CDB', 'LCI', 'LCA', 'FDI', 'Cripto', 
  'CRI/CRA', 'Debêntures', 'PP', 'COE', 'Derivativos', 
  'Commodities', 'Moedas'
];

let acaoEditandoIndex = null;
let carteira = JSON.parse(localStorage.getItem('carteira')) || [];
let cotacoes = [];
let meta = parseFloat(localStorage.getItem('meta')) || 0;
let totais = {
  investido: 0,
  quantidade: 0,
  atual: 0,
  lucro: 0,
  lucroPorcento: 0
};

const salvarDados = () => {
  localStorage.setItem('carteira', JSON.stringify(carteira));
  localStorage.setItem('meta', meta.toString());
};

const formatarMoeda = valor => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(valor);

const validarFormulario = ({ categoria, codigo, valor, quantidade }) => {

  const regexCodigoAcao = /^[A-Z]{4}(3|4|11)$/;
  const regexFII = /^[A-Z]{4}11$/;
  const regexETF = /^[A-Z]{4}[0-9]{1,2}B$/;
  
  // Validações básicas que aplicam a todos
  if (!categoria || isNaN(valor) || isNaN(quantidade) || valor <= 0 || quantidade <= 0) {
    alert('Preencha todos os campos corretamente com valores positivos.');
    return false;
  }

  // Se for uma categoria que não precisa de código
  if (categoriasSemCodigo.includes(categoria)) {
    return true;
  }

  // Validações específicas por tipo de ativo
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

  // Validação padrão para ações
  if (!categoriasSemCodigo.includes(categoria) && !regexCodigoAcao.test(codigo)) {
    alert('Código em formato inválido para esta categoria.');
    return false;
  }

  return true;
};

const adicionarAcao = (acao) => {
  carteira.push(acao);
  atualizarTabela();
  fecharModal();
};

const editarAcao = (index, acao) => {
  carteira[index] = acao;
  atualizarTabela();
  fecharModal();
};

const abrirModalConfirmarExclusao = (index) => {
  acaoExcluindoIndex = index;
  const acao = carteira[index];
  
  // Preencher informações no modal
  $('#excluirCodigo').text(acao.codigo);
  $('#excluirCategoria').text(acao.categoria);
  
  // Mostrar modal
  $('#modalConfirmarExclusao').fadeIn();
};

const fecharModalConfirmarExclusao = () => {
  $('#modalConfirmarExclusao').fadeOut();
};

const handleConfirmarExclusao = () => {
  if (acaoExcluindoIndex !== null) {
    carteira.splice(acaoExcluindoIndex, 1);
    atualizarTabela();
    fecharModalConfirmarExclusao();
  }
};

const removerAcao = (index) => {
  abrirModalConfirmarExclusao(index);
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

const atualizarTabela = () => {
  $.getJSON('./server/cotacoes.json', (res) => {
    cotacoes = res.acoes;
    calcularTotais();
    renderizarTabela();
    salvarDados();
  });
};

const calcularTotais = () => {
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

const renderizarTabela = () => {
  let tbody = '';

  carteira.forEach((acao, index) => {

  

    const totalAcao = acao.valor * acao.quantidade;
    const cotacao = cotacoes[acao.codigo + ".SA"];
    const valorAtual = cotacao ? cotacao.preco : 0;

    const totalAtual = valorAtual * acao.quantidade;
    const lucro = totalAtual !== 0 ? totalAtual - totalAcao : 0;
    const lucroPorcento = lucro !== 0 ? ((lucro * 100) / totalAtual).toFixed(2) : 0;
    
    
    const posicaoI = ((totalAcao* 100)/totais.investido).toFixed(2);
    // const posicaoG = ((100 / carteira.length)).toFixed(2);
    
    
    const classeLucro = lucro >= 0 ? 'valor-superior' : 'valor-inferior';

    
    let classeValorAquisicao;
    let classTotalIvestido;
    
    if(totalAtual !== 0 )  classTotalIvestido = totalAtual >= totalAcao ? 'valor-superior' : 'valor-inferior',
    classeValorAquisicao = acao.valor <= valorAtual ? 'valor-superior' : 'valor-inferior'
    else classTotalIvestido = 'valor-superior', classeValorAquisicao = "valor-superior"
        
    let dividendYield = cotacao ? cotacao.dividendYield : 0

    tbody += `
      <tr>
        <td>${acao.categoria}</td>
        <td>${acao.codigo}</td>
        <td  style="font-weight:bold" >${formatarMoeda(acao.valor)}</td>
        <td class="${classeValorAquisicao}">${formatarMoeda(valorAtual)}</td>
        <td>${acao.quantidade}</td>
        <td style="font-weight:bold">${formatarMoeda(totalAcao)}</td>
        <td class="${classTotalIvestido}" >${formatarMoeda(totalAtual)}</td>
        <td class="${classeLucro}">${formatarMoeda(lucro)}</td>
        <td  style="font-weight:bold" >${lucroPorcento}%</td>
        <td>${posicaoI}%</td>
        <td>${dividendYield}</td>
        <td>
          <button class="mais" data-index="${index}"><i class="fa-solid fa-plus"></i></button>
          <button class="editar" data-index="${index}"><i class="fa-solid fa-pen"></i></button>
          <button class="excluir" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  });

  $(DOM.tabelaAcoes).html(tbody);
  atualizarRodape();
};

const atualizarRodape = () => {

  const classeLucroTotal = totais.lucro >= 0 ? 'valor-superior' : 'valor-inferior';
 
  let classeTotalAtual
  if(totais.atual !== 0)  classeTotalAtual = totais.atual >= totais.investido ? 'valor-superior' : 'valor-inferior'
  else classeTotalAtual = "valor-superior"
  // console.log(totais.investido )

  $('#totalQuantidade').text(totais.quantidade);
  $('#totalInvestido').text(formatarMoeda(totais.investido));
  $('#totalAtual').addClass(classeTotalAtual).text(formatarMoeda(totais.atual));
  $('#totalLucro').addClass(classeLucroTotal).text(formatarMoeda(totais.lucro));
  $('#totalLucroPorcento').text(`${totais.lucroPorcento !== 0 ? totais.lucroPorcento : 0}%`);
  // $('#percentualMeta').text(meta > 0 ? ((totais.investido / meta) * 100).toFixed(2) + '%' : '0%');
};

const handleAdicionar = () => {
  const acao = {
    categoria: $(DOM.acaoCategorias).val(),
    codigo: $(DOM.acaoCodigo).val().toUpperCase().trim(),
    valor: parseFloat($(DOM.acaoValor).val()),
    quantidade: parseInt($(DOM.acaoQuantidade).val())
  };

  if (!validarFormulario(acao)) return;

  const codigoExistente = carteira.some(item => item.codigo === acao.codigo);
  if (codigoExistente && !confirm('Código já existe. Adicionar mesmo assim?')) return;

  adicionarAcao(acao);
};

const abrirModalEditar = (index) => {
  acaoEditandoIndex = index;
  const acao = carteira[index];
  
  // Preencher informações no modal
  $('#editCodigo').text(acao.codigo);
  $('#editCategoria').text(acao.categoria);
  $('#editQuantidadeAtual').text(acao.quantidade);
  $('#editPrecoMedio').text(formatarMoeda(acao.valor));
  
  // Preencher campos editáveis com valores atuais
  $('#editNovaQuantidade').val(acao.quantidade);
  $('#editNovoValor').val(acao.valor.toFixed(2));
  
  // Mostrar modal
  $('#modalEditarAcao').fadeIn();
};

const fecharModalEditar = () => {
  $('#modalEditarAcao').fadeOut();
};

const handleConfirmarEdicao = () => {
  const index = acaoEditandoIndex;
  const acao = carteira[index];
  
  // Obter valores dos campos
  const novaQuantidade = parseInt($('#editNovaQuantidade').val());
  const novoValor = parseFloat($('#editNovoValor').val());
  
  // Validar dados
  if (isNaN(novaQuantidade) || novaQuantidade <= 0) {
    alert('Por favor, insira uma quantidade válida (maior que zero).');
    return;
  }
  
  if (isNaN(novoValor) || novoValor <= 0) {
    alert('Por favor, insira um valor válido (maior que zero).');
    return;
  }
  
  // Atualizar a ação na carteira
  carteira[index] = {
    ...acao,
    quantidade: novaQuantidade,
    valor: parseFloat(novoValor.toFixed(2))
  };

  atualizarTabela();
  fecharModalEditar();
};

const handleEditar = (index) => {
  abrirModalEditar(index);
};

const handleAtualizarPrecos = () => {
  
  
  $('#loadingScreen').fadeIn();
  
  const acoes = carteira.map(c => c.codigo + ".SA");

  const tempoMinimoLoading = 1000;
  const inicio = Date.now();

  $.ajax({
    url: "http://localhost:3000/api/buscarAcoes",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ acoes }),
    success: function(response) {
      const tempoDecorrido = Date.now() - inicio;
      const tempoRestante = tempoMinimoLoading - tempoDecorrido;
      
      if (tempoRestante > 0) {
        setTimeout(() => {
       

          atualizarTabela();
          $('#loadingScreen').fadeOut();
         
        }, tempoRestante);
      } else {
        atualizarTabela();
        $('#loadingScreen').fadeOut();
      }
    },
    error: function(xhr, status, error) {
      const tempoDecorrido = Date.now() - inicio;
      const tempoRestante = tempoMinimoLoading - tempoDecorrido;
      
      if (tempoRestante > 0) {
        setTimeout(() => {
          $('#loadingScreen').fadeOut();
          alert("Erro na requisição ao servidor, favor validar a conexão!");
        }, tempoRestante);
      } else {
        $('#loadingScreen').fadeOut();
        alert("Erro na requisição ao servidor, favor validar a conexão!");
      }
    }
  });
};

const abrirModalAdicionarMais = (index) => {
  acaoEditandoIndex = index;
  const acao = carteira[index];
  const cotacao = cotacoes[acao.codigo + ".SA"];
  const valorAtual = cotacao ? cotacao.preco : acao.valor; 

  // Preencher informações no modal
  $('#infoCodigo').text(acao.codigo);
  $('#infoQuantidade').text(acao.quantidade);
  $('#infoPrecoMedio').text(formatarMoeda(acao.valor));
  $('#infoPrecoAtual').text(formatarMoeda(valorAtual));
  
  // Resetar campos
  $('#quantidadeAdicional').val('');
  $('#precoAdicional').val('');
  
  // Mostrar modal
  $('#modalAdicionarMais').fadeIn();
};

const fecharModalAdicionarMais = () => {
  $('#modalAdicionarMais').fadeOut();
};

const handleConfirmarAdicao = () => {

  const index = acaoEditandoIndex;
  const acao = carteira[index];
  const cotacao = cotacoes[acao.codigo + ".SA"];
  
  // Obter valores dos campos
  const quantidadeAdicional = parseInt($('#quantidadeAdicional').val());
  const precoAdicionalInput = $('#precoAdicional').val();
  
  // Validar quantidade
  if (isNaN(quantidadeAdicional)) {
    alert('Por favor, insira uma quantidade válida.');
    return;
  }
  
  // Determinar preço a ser usado
  let precoAdicional;
  if (precoAdicionalInput && parseFloat(precoAdicionalInput) > 0) {
    precoAdicional = parseFloat(precoAdicionalInput);
  } else {
    // Usar preço atual ou valor inicial se não houver cotação
    precoAdicional = cotacao ? cotacao.preco : acao.valor;
  }
  
  // Calcular novo preço médio
  const totalInicial = acao.quantidade * acao.valor;
  const totalAdicionado = quantidadeAdicional * precoAdicional;
  const novaQuantidade = acao.quantidade + quantidadeAdicional;
  const novoPrecoMedio = (totalInicial + totalAdicionado) / novaQuantidade;

  // Atualizar a ação na carteira
  carteira[index] = {
    ...acao,
    quantidade: novaQuantidade,
    valor: parseFloat(novoPrecoMedio.toFixed(2))
  };

  atualizarTabela();
  fecharModalAdicionarMais();
};

const configurarValidacaoCategoria = () => {
  $(DOM.acaoCategorias).on('change', function() {
    const categoria = $(this).val();
    const inputCodigo = $(DOM.acaoCodigo);
    
    if (categoriasSemCodigo.includes(categoria)) {
      inputCodigo.prop('disabled', true).val('N/A').css('background-color', '#f0f0f0');
    } else {
      inputCodigo.prop('disabled', false).val('').css('background-color', '');
    }
  });
};

const inicializar = () => {
  
  configurarValidacaoCategoria();

  $(DOM.tabelaAcoes).on('click', '.mais', (e) => abrirModalAdicionarMais($(e.currentTarget).data('index')));
  
  $('#modalAdicionarMais .fechar, #modalAdicionarMais').on('click', (e) => {
    if ($(e.target).is('#modalAdicionarMais') || $(e.target).is('.fechar')) {
      fecharModalAdicionarMais();
    }
  });
  $('#confirmarAdicao').on('click', handleConfirmarAdicao);

  $('#modalEditarAcao .fechar, #modalEditarAcao').on('click', (e) => {
    if ($(e.target).is('#modalEditarAcao') || $(e.target).is('.fechar')) {
      fecharModalEditar();
    }
  });
  $('#confirmarEdicao').on('click', handleConfirmarEdicao);

  $('#modalConfirmarExclusao .fechar, #modalConfirmarExclusao').on('click', (e) => {
    if ($(e.target).is('#modalConfirmarExclusao') || $(e.target).is('.fechar')) {
      fecharModalConfirmarExclusao();
    }
  });
  
  $('#cancelarExclusao').on('click', fecharModalConfirmarExclusao);
  $('#confirmarExclusao').on('click', handleConfirmarExclusao);


  $('#abrirModal').on('click', abrirModal);
  $('.fechar, #modalCarteira').on('click', (e) => {
    if ($(e.target).is(DOM.modalCarteira) || $(e.target).is('.fechar')) {
      fecharModal();
    }
  });
  
  $(DOM.tabelaAcoes).on('click', '.mais', (e) => handleAdicionarMais($(e.currentTarget).data('index')));
  $(DOM.tabelaAcoes).on('click', '.editar', (e) => handleEditar($(e.currentTarget).data('index')));
  $(DOM.tabelaAcoes).on('click', '.excluir', (e) => removerAcao($(e.currentTarget).data('index')));
  $(DOM.metaValor).val(meta).on('input', () => {
    meta = parseFloat($(DOM.metaValor).val()) || 0;
    salvarDados();
    atualizarTabela();
  });
  $(DOM.atualizarPreco).on('click', handleAtualizarPrecos);

  // Adicionar rodapé à tabela
  $('table').append(`
    <tfoot>
      <tr>
        <td colspan="4" style="font-weight:bold">Total Investido:</td>
        <td id="totalQuantidade">0</td> 
        <td  style="font-weight:bold" id="totalInvestido">R$ 0,00</td> 
        <td id="totalAtual">R$ 0,00</td> 
        <td id="totalLucro">R$ 0,00</td> 
        <td  style="font-weight:bold" id="totalLucroPorcento">0</td> 
        <td colspan="3"></td>
      </tr>
    </tfoot>
  `);

  atualizarTabela();
  
};

$(document).ready(inicializar);