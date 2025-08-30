const DOM = {
  tabelaProspeccao: '#tabelaProspeccao',
  modalProspeccao: '#modalProspeccao',
  prospeccaoCategorias: '#prospeccaoCategorias',
  prospeccaoCodigo: '#prospeccaoCodigo',
  adicionarProspeccao: '#adicionarProspeccao',
  atualizarPrecos: '#atualizarPrecos'
};

const categoriasSemCodigo = [
  "", 'CDB', 'LCI', 'LCA', 'FDI', 'Cripto', 
  'CRI/CRA', 'Debêntures', 'PP', 'COE', 'Derivativos', 
  'Moedas'
];

let usuario = null;
let cotacoes = {};

// Função para obter usuário do sessionStorage de forma segura
const obterUsuario = () => {
  try {
    const usuarioStr = sessionStorage.getItem("usuario");
    if (usuarioStr) {
      return JSON.parse(usuarioStr);
    }
  } catch (error) {
    console.error("Erro ao parsear usuário:", error);
    sessionStorage.removeItem("usuario");
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
        conta: usuarioLocal.conta,
        token: usuarioLocal.token
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
    location.href = '../../';
    return null;
  }
};

// Inicializar usuário
usuario = obterUsuario();

const formatarMoeda = valor => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(valor);

// Funções para interação com a API
const carregarProspeccao = async () => {
  try {
    if (!usuario || !usuario.conta || !usuario.token) {
      console.error('Usuário não autenticado, sem conta ou sem token');
      return [];
    }
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.PROSPECCAO, `/${usuario.conta}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      }
    });
    return response.prospeccoes || [];
  } catch (error) {
    console.error("Erro ao carregar prospecção:", error);
    if (error.status === 401) {
      console.log('🔒 Token expirado no prospectar, fazendo logout...');
      AuthManager.logout();
    }
    return [];
  }
};

const carregarCotacoes = async () => {
  try {
    if (!usuario || !usuario.conta || !usuario.token) {
      console.error('Usuário não autenticado, sem conta ou sem token');
      return {};
    }
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.COTACOES, `/${usuario.conta}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      }
    });
    return response.reduce((acc, cotacao) => {
      acc[cotacao.codigo] = cotacao;
      return acc;
    }, {});
  } catch (error) {
    console.error("Erro ao carregar cotações:", error);
    if (error.status === 401) {
      console.log('🔒 Token expirado no prospectar, fazendo logout...');
      AuthManager.logout();
    }
    return {};
  }
};

const salvarProspeccao = async (prospeccao) => {
  try {
    if (!usuario || !usuario.conta || !usuario.token) {
      throw new Error('Usuário não autenticado, sem conta ou sem token');
    }
    prospeccao.conta = usuario.conta;
    
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.PROSPECCAO),
      method: "POST",
      contentType: "application/json",
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      },
      data: JSON.stringify(prospeccao)
    });
    return response;
  } catch (error) {
    console.error("Erro ao salvar prospecção:", error);
    if (error.status === 401) {
      AuthManager.logout();
    }
    throw error;
  }
};

const removerProspeccao = async (id) => {
  try {
    if (!usuario || !usuario.token) {
      throw new Error('Usuário não autenticado ou sem token');
    }
    
    await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.PROSPECCAO, `/${id}`),
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      }
    });
    return true;
  } catch (error) {
    console.error("Erro ao remover prospecção:", error);
    if (error.status === 401) {
      AuthManager.logout();
    }
    throw error;
  }
};

const moverParaCarteira = async (id, valor, quantidade) => {
  try {
    if (!usuario || !usuario.token) {
      throw new Error('Usuário não autenticado ou sem token');
    }
    
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.PROSPECCAO, `/${id}/mover-para-carteira`),
      method: "POST",
      contentType: "application/json",
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      },
      data: JSON.stringify({ valor, quantidade })
    });
    return response;
  } catch (error) {
    console.error("Erro ao mover para carteira:", error);
    if (error.status === 401) {
      AuthManager.logout();
    }
    throw error;
  }
};

const validarFormulario = ({ categoria, codigo }) => {
  const regexCodigoAcao = /^[A-Z]{4}(3|4|11)$/;
  const regexFII = /^[A-Z]{4}11$/;
  const regexETF = /^[A-Z]{4}[0-9]{1,2}B$/;
  const regexTesouro = /^\d{4}$/;
  
  const anoAtual = new Date().getFullYear();
  
  // Validações de campos obrigatórios
  if (!categoria) {
    showMessage('Por favor, selecione uma categoria.', 'warning');
    return false;
  }

  // Validações de categoria sem código
  if (categoriasSemCodigo.includes(categoria)) return true;

  // Verificar código
  if (!codigo) {
    alert('Por favor, informe um código válido!');
    return false;
  }
  
  // Validações específicas por categoria
  switch (categoria) {
    case 'FII':
      if (!regexFII.test(codigo)) {
        alert('Código de FII inválido!');
        return false;
      }
      break;
    
    case 'ETF':
      if (!regexETF.test(codigo)) {
        alert('Código de ETF inválido!');
        return false;
      }
      break;
    
    case 'BDR':
      if (!codigo.includes('.')) {
        alert('Código de BDR inválido!');
        return false;
      }
      break;
    
    case 'Tesouro Direto':
      if (parseInt(codigo) < anoAtual || !regexTesouro.test(codigo)) {
        alert('Código do Tesouro Direto inválido! Deve conter 4 dígitos e ser maior ou igual ao ano atual.');
        return false;
      }
      break;
    
    default:
      // Para as categorias restantes, verifica se o código é válido
      if (!regexCodigoAcao.test(codigo)) {
        alert('Código em formato inválido para esta categoria.');
        return false;
      }
      break;
  }

  return true;
};

const adicionarProspeccao = async (prospeccao) => {
  try {
    await salvarProspeccao(prospeccao);
    await atualizarTabela();
    fecharModal();
    // alert('Ação adicionada à prospecção com sucesso!');
  } catch (error) {
    alert("Erro ao adicionar à prospecção: " + error.message);
  }
};

// Funções de interface
const abrirModalConfirmarExclusao = (prospeccao) => {
  $('#excluirCodigo').text(prospeccao.codigo);
  $('#excluirCategoria').text(prospeccao.categoria);
  $('#modalConfirmarExclusao').data('prospeccao-id', prospeccao._id).show();
};

const handleConfirmarExclusao = async () => {
  const prospeccaoId = $('#modalConfirmarExclusao').data('prospeccao-id');
  if (prospeccaoId) {
    try {
      await removerProspeccao(prospeccaoId);
      await atualizarTabela();
      fecharModalConfirmarExclusao();
      // alert('Removido da prospecção com sucesso!');
    } catch (error) {
      alert("Erro ao remover da prospecção: " + error.message);
    }
  }
};

const abrirModalIncluirCarteira = async (prospeccaoId) => {
  try {
    const response = await $.get(CONFIG.getUrl(CONFIG.ENDPOINTS.PROSPECCAO_ITEM, `/${prospeccaoId}`));
    const prospeccao = response;
    
    const cotacao = cotacoes[prospeccao.codigo + ".SA"];
    const valorAtual = cotacao ? cotacao.preco : 0;
    
    $('#incluirCodigo').text(prospeccao.codigo);
    $('#incluirCategoria').text(prospeccao.categoria);
    $('#incluirPrecoAtual').text(formatarMoeda(valorAtual));
    
    $('#incluirValor').val(valorAtual > 0 ? valorAtual.toFixed(2) : '');
    $('#incluirQuantidade').val('');
    
    $('#modalIncluirCarteira').data('prospeccao-id', prospeccao._id).show();
  } catch (error) {
    alert("Erro ao carregar dados para inclusão: " + error.message);
  }
};

const handleConfirmarInclusao = async () => {
  const prospeccaoId = $('#modalIncluirCarteira').data('prospeccao-id');
  const valor = parseFloat($('#incluirValor').val());
  const quantidade = parseInt($('#incluirQuantidade').val());
  
  if (isNaN(valor) || valor <= 0) {
    alert('Por favor, insira um valor válido (maior que zero).');
    return;
  }
  
  if (isNaN(quantidade) || quantidade <= 0) {
    alert('Por favor, insira uma quantidade válida (maior que zero).');
    return;
  }
  
  try {
    await moverParaCarteira(prospeccaoId, valor, quantidade);
    await atualizarTabela();
    fecharModalIncluirCarteira();
    // alert('Ação incluída na carteira com sucesso!');
  } catch (error) {
    alert("Erro ao incluir na carteira: " + error.message);
  }
};

const limparFormulario = () => {
  $(DOM.prospeccaoCategorias).val('');
  $(DOM.prospeccaoCodigo).val('');
};

const abrirModal = () => {
  limparFormulario();
  $(DOM.modalProspeccao).show();
};

const fecharModal = () => {
  $(DOM.modalProspeccao).hide();
};

const fecharModalIncluirCarteira = () => {
  $('#modalIncluirCarteira').hide();
};

const fecharModalConfirmarExclusao = () => {
  $('#modalConfirmarExclusao').hide();
};

// Funções para análise de diversificação
const analisarDiversificacao = async () => {
  try {
    // Buscar dados da carteira atual
    const response = await $.get(CONFIG.getUrl('/api/carteira', `/${usuario.conta}`));
    const carteira = response.acoes || [];
    
    if (carteira.length === 0) {
      showMessage('Você ainda não possui ações na carteira para análise.', 'info');
      return;
    }
    
    // Agrupar por categoria
    const categorias = {};
    let totalInvestido = 0;
    
    carteira.forEach(acao => {
      const valor = acao.valor * acao.quantidade;
      totalInvestido += valor;
      
      if (!categorias[acao.categoria]) {
        categorias[acao.categoria] = 0;
      }
      categorias[acao.categoria] += valor;
    });
    
    // Calcular percentuais
    const analise = Object.entries(categorias).map(([categoria, valor]) => ({
      categoria,
      valor,
      percentual: ((valor / totalInvestido) * 100).toFixed(1)
    })).sort((a, b) => b.valor - a.valor);
    
    // Gerar recomendações
    const recomendacoes = gerarRecomendacoesDiversificacao(analise);
    
    // Mostrar modal com análise
    mostrarAnalise(analise, recomendações, totalInvestido);
    
  } catch (error) {
    console.error('Erro na análise:', error);
    showMessage('Erro ao analisar diversificação', 'error');
  }
};

const gerarRecomendacoesDiversificacao = (analise) => {
  const recomendacoes = [];
  
  analise.forEach(item => {
    const perc = parseFloat(item.percentual);
    
    if (perc > 50) {
      recomendacoes.push({
        tipo: 'alta',
        icone: 'fa-exclamation-triangle',
        titulo: `Alta concentração em ${item.categoria}`,
        descricao: `${perc}% da carteira está em ${item.categoria}. Considere diversificar.`
      });
    } else if (perc > 30) {
      recomendacoes.push({
        tipo: 'media',
        icone: 'fa-exclamation-circle',
        titulo: `Concentração moderada em ${item.categoria}`,
        descricao: `${perc}% da carteira está em ${item.categoria}. Acompanhe a exposição.`
      });
    }
  });
  
  if (recomendacoes.length === 0) {
    recomendacoes.push({
      tipo: 'baixa',
      icone: 'fa-check-circle',
      titulo: 'Diversificação adequada',
      descricao: 'Sua carteira apresenta boa diversificação entre as categorias.'
    });
  }
  
  return recomendacoes;
};

const mostrarAnalise = (analise, recomendacoes, total) => {
  let html = `
    <div class="analise-section">
      <h3><i class="fas fa-chart-pie"></i> Distribuição por Categoria</h3>
      <p><strong>Total Investido:</strong> ${formatarMoeda(total)}</p>
      ${analise.map(item => `
        <div class="diversificacao-item">
          <span>${item.categoria}</span>
          <span>
            <strong>${formatarMoeda(item.valor)}</strong>
            <em>(${item.percentual}%)</em>
          </span>
        </div>
      `).join('')}
    </div>
    
    <div class="analise-section">
      <h3><i class="fas fa-lightbulb"></i> Recomendações</h3>
      ${recomendacoes.map(rec => `
        <div class="recomendacao ${rec.tipo}">
          <i class="fas ${rec.icone}"></i>
          <div>
            <strong>${rec.titulo}</strong><br>
            <span>${rec.descricao}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  $('#conteudoAnalise').html(html);
  $('#modalAnalise').show();
};

// Funções para sugestões inteligentes
const gerarSugestoesInteligentes = async () => {
  try {
    // Buscar dados da carteira atual
    const response = await $.get(CONFIG.getUrl('/api/carteira', `/${usuario.conta}`));
    const carteira = response.acoes || [];
    
    // Gerar sugestões baseadas na carteira atual
    const sugestoes = analisarEGerarSugestoes(carteira);
    
    // Mostrar modal com sugestões
    mostrarSugestoes(sugestoes);
    
  } catch (error) {
    console.error('Erro ao gerar sugestões:', error);
    alert('Erro ao gerar sugestões inteligentes');
  }
};

const analisarEGerarSugestoes = (carteira) => {
  const sugestoes = [];
  
  // Análise 1: Verificar se faltam FIIs
  const temFII = carteira.some(acao => acao.categoria === 'FII');
  if (!temFII) {
    sugestoes.push({
      categoria: 'FII',
      titulo: 'Adicionar Fundos Imobiliários (FIIs)',
      razao: 'Diversificação em renda passiva e proteção contra inflação',
      sugestoes: ['HGLG11', 'BCFF11', 'KNRI11', 'XPLG11']
    });
  }
  
  // Análise 2: Verificar se faltam bancos
  const temBanco = carteira.some(acao => acao.categoria === 'Bancos');
  if (!temBanco) {
    sugestoes.push({
      categoria: 'Bancos',
      titulo: 'Adicionar ações de Bancos',
      razao: 'Setor defensivo com bons dividendos',
      sugestoes: ['BBAS3', 'ITUB4', 'BBDC4', 'SANB11']
    });
  }
  
  // Análise 3: Verificar diversificação em setores
  const categorias = [...new Set(carteira.map(acao => acao.categoria))];
  if (categorias.length < 3) {
    sugestoes.push({
      categoria: 'Diversificação',
      titulo: 'Aumentar diversificação setorial',
      razao: 'Reduzir risco através de diferentes setores',
      sugestoes: ['PETR4', 'VALE3', 'WEGE3', 'RENT3']
    });
  }
  
  // Análise 4: ETFs para diversificação
  const temETF = carteira.some(acao => acao.categoria === 'ETF');
  if (!temETF && carteira.length < 10) {
    sugestoes.push({
      categoria: 'ETF',
      titulo: 'Considerar ETFs para diversificação',
      razao: 'Diversificação instantânea com baixo custo',
      sugestoes: ['BOVA11', 'IVVB11', 'SMAL11']
    });
  }
  
  return sugestoes;
};

const mostrarSugestoes = (sugestoes) => {
  if (sugestoes.length === 0) {
    $('#conteudoSugestoes').html(`
      <div class="analise-section">
        <p><i class="fas fa-check-circle" style="color: var(--success-color);"></i> 
        Sua carteira está bem diversificada! Continue monitorando e rebalanceando conforme necessário.</p>
      </div>
    `);
  } else {
    let html = sugestoes.map(sugestao => `
      <div class="sugestao-item">
        <div class="sugestao-header">
          <div class="sugestao-titulo">${sugestao.titulo}</div>
          <div class="sugestao-categoria">${sugestao.categoria}</div>
        </div>
        <div class="sugestao-razao">${sugestao.razao}</div>
        <div><strong>Sugestões:</strong> ${sugestao.sugestoes.join(', ')}</div>
        <div class="sugestao-acoes">
          ${sugestao.sugestoes.map(codigo => `
            <button class="btn-sugestao btn-adicionar" onclick="adicionarSugestao('${sugestao.categoria}', '${codigo}')">
              Adicionar ${codigo}
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');
    
    $('#conteudoSugestoes').html(html);
  }
  
  $('#modalSugestoes').show();
};

// Função para adicionar sugestão diretamente à prospecção
window.adicionarSugestao = async (categoria, codigo) => {
  try {
    await salvarProspeccao({ categoria, codigo });
    await atualizarTabela();
    // alert(`${codigo} adicionado à prospecção!`);
  } catch (error) {
    alert('Erro ao adicionar sugestão: ' + error.message);
  }
};

const renderizarTabela = (prospeccao) => {
  let tbody = '';

  prospeccao.forEach((item) => {
    const cotacao = cotacoes[item.codigo + ".SA"];
    const valorAtual = cotacao ? cotacao.preco : 0;

    tbody += `
      <tr data-prospeccao-id="${item._id}">
        <td>${item.categoria}</td>
        <td>${item.codigo}</td>
        <td style="font-weight:bold">${formatarMoeda(valorAtual)}</td>
        <td>
          <button class="incluir" data-prospeccao-id="${item._id}">
            <i class="fa-solid fa-plus"></i> Incluir
          </button>
          <button class="excluir" data-prospeccao-id="${item._id}">
            <i class="fa-solid fa-trash"></i> Excluir
          </button>
        </td>
      </tr>
    `;
  });

  $(DOM.tabelaProspeccao).html(tbody);
};

const handleAdicionar = async () => {
  const prospeccao = {
    categoria: $(DOM.prospeccaoCategorias).val(),
    codigo: $(DOM.prospeccaoCodigo).val().toUpperCase().trim()
  };

  if (!validarFormulario(prospeccao)) return;

  try {
    await adicionarProspeccao(prospeccao);
  } catch (error) {
    alert("Erro ao adicionar à prospecção: " + error.message);
  }
};

const handleAtualizarPrecos = async () => {
  $('#loadingScreen').show();
  
  try {
    const prospeccao = await carregarProspeccao();
    const acoes = prospeccao.map(p => p.codigo + ".SA");

    if (acoes.length > 0) {
      await $.ajax({
        url: CONFIG.getUrl(CONFIG.ENDPOINTS.BUSCAR_ACOES),
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ 
          acoes, 
          conta: usuario.conta 
        })
      });
    }

    cotacoes = await carregarCotacoes();
    await atualizarTabela();
    $('#loadingScreen').hide();
    // alert('Preços atualizados com sucesso!');
  } catch (error) {
    console.error("Erro ao atualizar preços:", error);
    $('#loadingScreen').hide();
    alert("Erro na requisição ao servidor, favor validar a conexão!");
  }
};

const atualizarTabela = async () => {
  try {
    const [prospeccao, novasCotacoes] = await Promise.all([
      carregarProspeccao(),
      carregarCotacoes()
    ]);
    
    cotacoes = novasCotacoes;
    renderizarTabela(prospeccao);
  } catch (error) {
    console.error("Erro ao atualizar tabela:", error);
    alert("Erro ao carregar dados da prospecção");
  }
};

const configurarValidacaoCategoria = () => {
  $(DOM.prospeccaoCategorias).on('change', function() {
    const categoria = $(this).val();
    const inputCodigo = $(DOM.prospeccaoCodigo);
    
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
      return;
    }

    configurarValidacaoCategoria();

    // Event listeners
    $(DOM.tabelaProspeccao).on('click', '.incluir', (e) => {
      abrirModalIncluirCarteira($(e.currentTarget).closest('tr').data('prospeccao-id'));
    });
    
    $(DOM.tabelaProspeccao).on('click', '.excluir', (e) => {
      const prospeccaoId = $(e.currentTarget).closest('tr').data('prospeccao-id');
      $.get(CONFIG.getUrl(CONFIG.ENDPOINTS.PROSPECCAO_ITEM, `/${prospeccaoId}`), (prospeccao) => {
        abrirModalConfirmarExclusao(prospeccao);
      }).fail(() => {
        alert("Erro ao carregar dados para exclusão");
      });
    });

    // Modais
    $('#modalIncluirCarteira .fechar, #modalIncluirCarteira').on('click', (e) => {
      if ($(e.target).is('#modalIncluirCarteira') || $(e.target).is('.fechar')) {
        fecharModalIncluirCarteira();
      }
    });
    
    $('#modalConfirmarExclusao .fechar, #modalConfirmarExclusao').on('click', (e) => {
      if ($(e.target).is('#modalConfirmarExclusao') || $(e.target).is('.fechar')) {
        fecharModalConfirmarExclusao();
      }
    });

    $('#confirmarInclusao').on('click', handleConfirmarInclusao);
    $('#confirmarExclusao').on('click', handleConfirmarExclusao);
    $('#cancelarExclusao').on('click', fecharModalConfirmarExclusao);

    $('#abrirModalProspeccao').on('click', abrirModal);
    $('.fechar, #modalProspeccao').on('click', (e) => {
      if ($(e.target).is(DOM.modalProspeccao) || $(e.target).is('.fechar')) {
        fecharModal();
      }
    });

    $(DOM.adicionarProspeccao).on('click', handleAdicionar);
    $(DOM.atualizarPrecos).on('click', handleAtualizarPrecos);

    // Navegação
    $('#voltarCarteira').on('click', () => {
      location.href = '../carteira/';
    });

    // Novas funcionalidades
    $('#analiseDiversificacao').on('click', analisarDiversificacao);
    $('#sugestaoInvestimentos').on('click', gerarSugestoesInteligentes);
    
    // Modais das novas funcionalidades
    $('#modalAnalise .fechar, #modalAnalise').on('click', (e) => {
      if ($(e.target).is('#modalAnalise') || $(e.target).is('.fechar')) {
        $('#modalAnalise').hide();
      }
    });
    
    $('#modalSugestoes .fechar, #modalSugestoes').on('click', (e) => {
      if ($(e.target).is('#modalSugestoes') || $(e.target).is('.fechar')) {
        $('#modalSugestoes').hide();
      }
    });

    // Carregar dados iniciais
    await atualizarTabela();
  } catch (error) {
    console.error('Erro na inicialização:', error);
  }
};

$(document).ready(inicializar);