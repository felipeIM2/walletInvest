
let carteira = JSON.parse(localStorage.getItem('carteira')) || [];
let meta = parseFloat(localStorage.getItem('meta')) || 0;
let totalInvestido;

// Função para salvar dados no localStorage
function salvarDados() {
  localStorage.setItem('carteira', JSON.stringify(carteira));
  localStorage.setItem('meta', meta.toString());
}

// Função para calcular o total investido
function calcularTotalInvestido() {
  return carteira.reduce((total, acao) => {
    return total + (acao.valor * acao.quantidade);
  }, 0);
}

// Função para formatar valores monetários
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

// Atualiza a tabela e os totais
function atualizarTabela() {
  totalInvestido = calcularTotalInvestido();
  let tbody = '';

  carteira.forEach((acao, index) => {

    const totalAcao = acao.valor * acao.quantidade;

    const posicaoI = ((totalAcao * 100)/ totalInvestido).toFixed(2);
    const posicaoG = ((100 /carteira.length)).toFixed(2);

    tbody += `
      <tr>
        <td>${acao.categoria}</td>
        <td>${acao.codigo}</td>
        <td>${formatarMoeda(acao.valor)}</td>
        <td>${acao.quantidade}</td>
        <td>${formatarMoeda(totalAcao)}</td>
        <td>${posicaoI}%</td>
        <td>${posicaoG}%</td>
        <td>
          <button class="editar" data-index="${index}">Editar</button>
          <button class="excluir" data-index="${index}">Excluir</button>
        </td>
      </tr>
    `;
  });

  $('#tabelaAcoes').html(tbody);
  
  // Atualizar totais
  
  $('#totalInvestido').text(formatarMoeda(totalInvestido));
  $('#percentualMeta').text(meta > 0 ? ((totalInvestido / meta) * 100).toFixed(2) + '%' : '0%');
  
  // Salvar dados
  salvarDados();
}

// Adicionar nova ação
$('#adicionarAcao').click(() => {
  const categoria = $('#acaoCategorias').val();
  const codigo = $('#acaoCodigo').val().toUpperCase();
  const valor = parseFloat($('#acaoValor').val());
  const quantidade = parseInt($('#acaoQuantidade').val());

  if (!categoria || !codigo || isNaN(valor) || isNaN(quantidade) || valor <= 0 || quantidade <= 0) {
    alert('Preencha todos os campos corretamente com valores positivos.');
    return;
  }

  // Verificar se o código já existe na carteira
  const codigoExistente = carteira.some(acao => acao.codigo === codigo);
  if (codigoExistente) {
    if (!confirm('Este código já existe na carteira. Deseja adicionar mesmo assim?')) {
      return;
    }
  }

  carteira.push({ categoria, codigo, valor, quantidade });
  atualizarTabela();

  // Limpar campos
  $('#acaoCategorias').val('');
  $('#acaoCodigo').val('');
  $('#acaoValor').val('');
  $('#acaoQuantidade').val('');

  // Fechar modal
  $('#modalCarteira').fadeOut();
});

// Editar ação
$('#tabelaAcoes').on('click', '.editar', function() {
  const index = $(this).data('index');
  const acao = carteira[index];
  
  // Preencher modal com os dados da ação
  $('#acaoCategorias').val(acao.categoria);
  $('#acaoCodigo').val(acao.codigo);
  $('#acaoValor').val(acao.valor);
  $('#acaoQuantidade').val(acao.quantidade);
  
  // Alterar o botão para "Salvar Edição"
  $('#adicionarAcao').text('Salvar Edição').off('click').click(function() {
    const categoria = $('#acaoCategorias').val();
    const codigo = $('#acaoCodigo').val().toUpperCase();
    const valor = parseFloat($('#acaoValor').val());
    const quantidade = parseInt($('#acaoQuantidade').val());

    if (!categoria || !codigo || isNaN(valor) || isNaN(quantidade) || valor <= 0 || quantidade <= 0) {
      alert('Preencha todos os campos corretamente com valores positivos.');
      return;
    }

    // Atualizar ação
    carteira[index] = { categoria, codigo, valor, quantidade };
    atualizarTabela();
    
    // Resetar modal
    $('#modalCarteira').fadeOut();
    $('#adicionarAcao').text('Adicionar').off('click').click(adicionarAcaoHandler);
  });
  
  // Abrir modal
  $('#modalCarteira').fadeIn();
});

// Excluir ação
$('#tabelaAcoes').on('click', '.excluir', function() {
  const index = $(this).data('index');
  if (confirm('Tem certeza que deseja excluir esta ação?')) {
    carteira.splice(index, 1);
    atualizarTabela();
  }
});

// Configuração inicial
$(document).ready(async function() {
  
  
async function pegarPrecoStatusInvest(ticker) {
  const urlOriginal = `https://statusinvest.com.br/fundos-imobiliarios/${ticker.toLowerCase()}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlOriginal)}`;

  try {
    const res = await fetch(proxyUrl);
    const html = await res.text();

    // Extrair preço manualmente do html usando regex ou DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const precoElement = doc.querySelector('strong.value');

    if (precoElement) {
      console.log(`${ticker.toUpperCase()}: R$ ${precoElement.textContent.trim()}`);
    } else {
      console.log('Preço não encontrado');
    }
  } catch (e) {
    console.error('Erro:', e);
  }
}

pegarPrecoStatusInvest("MXRF11");





  atualizarTabela();
  
  // Adicionar linha de totais à tabela
  // $('table thead tr').append('<th>Total</th>');
  $('table').append(`
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:left;"><strong>Total Investido:</strong></td>
        <td id="totalInvestido">R$ 0,00</td>
        <td></td>
        <td></td>
      </tr>
    </tfoot>
  `);

  // Configurar meta
  $('#metaValor').val(meta).on('input', function() {
    meta = parseFloat($(this).val()) || 0;
    localStorage.setItem('meta', meta.toString());
    atualizarTabela();
  });

  
  $('#totalInvestido').text(formatarMoeda(totalInvestido));
  $('#percentualMeta').text(meta > 0 ? ((totalInvestido / meta) * 100).toFixed(2) + '%' : '0%');

  // Configurar modal
  $('#abrirModal').on('click', function() {
    // Resetar modal
    $('#acaoCategorias').val('');
    $('#acaoCodigo').val('');
    $('#acaoValor').val('');
    $('#acaoQuantidade').val('');
    $('#adicionarAcao').text('Adicionar').off('click').click(adicionarAcaoHandler);
    
    $('#modalCarteira').fadeIn();
  });

  $('.fechar, #modalCarteira').on('click', function(e) {
    if ($(e.target).is('#modalCarteira') || $(e.target).is('.fechar')) {
      $('#modalCarteira').fadeOut();
    }
  });

  // Evitar fechar modal ao clicar no conteúdo
  $('.modal-conteudo').on('click', function(e) {
    e.stopPropagation();
  });
});

// Handler para adicionar ação
function adicionarAcaoHandler() {
  const categoria = $('#acaoCategorias').val();
  const codigo = $('#acaoCodigo').val().toUpperCase();
  const valor = parseFloat($('#acaoValor').val());
  const quantidade = parseInt($('#acaoQuantidade').val());

  if (!categoria || !codigo || isNaN(valor) || isNaN(quantidade) || valor <= 0 || quantidade <= 0) {
    alert('Preencha todos os campos corretamente com valores positivos.');
    return;
  }

  // Verificar se o código já existe na carteira
  const codigoExistente = carteira.some(acao => acao.codigo === codigo);
  if (codigoExistente) {
    if (!confirm('Este código já existe na carteira. Deseja adicionar mesmo assim?')) {
      return;
    }
  }

  carteira.push({ categoria, codigo, valor, quantidade });
  atualizarTabela();

  // Limpar campos
  $('#acaoCategorias').val('');
  $('#acaoCodigo').val('');
  $('#acaoValor').val('');
  $('#acaoQuantidade').val('');

  // Fechar modal
  $('#modalCarteira').fadeOut();
}


  // Configuração do menu hamburger
  $('#hamburgerMenu').click(function(e) {
    e.stopPropagation();
    $('#menuOptions').toggleClass('active');
  });

  // Fechar menu quando clicar fora
  $(document).click(function() {
    $('#menuOptions').removeClass('active');
  });

  // Configurar ações do menu
  $('#menuAdicionar').click(function() {
    $('#abrirModal').click();
    $('#menuOptions').removeClass('active');
  });

  $('#menuRatear').click(function() {
    alert('Funcionalidade de Ratear será implementada aqui');
    $('#menuOptions').removeClass('active');
  });

  $('#menuConfigurar').click(function() {
    alert('Funcionalidade de Configurar será implementada aqui');
    $('#menuOptions').removeClass('active');
  });