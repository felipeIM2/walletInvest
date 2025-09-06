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
      console.log('⚠️ carregarCarteira: Usuário sem dados necessários');
      return [];
    }
    
    // console.log('📦 Carregando carteira para conta:', usuario.conta);
    
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.CARTEIRA, `/${usuario.conta}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      },
      timeout: 10000
    });
    
    // console.log('✅ Resposta da carteira:', response);
    
    // Verificar se há mensagem de erro do banco
    if (response.error && response.message) {
      showMessage(response.message, 'warning');
    }
    
    const acoes = response.acoes || [];
    // console.log(acoes)
    // console.log('✅ Carteira carregada:', acoes.length, 'ações');
    return acoes;
  } catch (error) {
    console.error('😱 Erro ao carregar carteira:', error);
    if (error.status === 401) {
      console.log('🔒 Token expirado, fazendo logout...');
      AuthManager.logout();
    } else if (error.status === 400 && error.responseJSON?.error?.includes('Conta não informada')) {
      console.log('⚠️ Problema de autenticação - conta não informada');
      showMessage('Problema de autenticação. Tentando novamente...', 'warning');
    } else {
      showMessage('Erro ao carregar carteira. Verifique sua conexão.', 'error');
    }
    return [];
  }
};

const carregarCotacoes = async () => {
  try {
    if (!usuario || !usuario.conta || !usuario.token) {
      console.log('⚠️ carregarCotacoes: Usuário sem dados necessários');
      return {};
    }
    
    // console.log('📊 Carregando cotações para conta:', usuario.conta);
    
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.COTACOES, `/${usuario.conta}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      },
      timeout: 10000
    });
    
    const cotacoesMap = response.reduce((acc, cotacao) => {
      acc[cotacao.codigo] = cotacao;
      return acc;
    }, {});
    
    // console.log('✅ Cotações carregadas:', Object.keys(cotacoesMap).length, 'itens');
    return cotacoesMap;
  } catch (error) {
    console.error('😱 Erro ao carregar cotações:', error);
    if (error.status === 401) {
      console.log('🔒 Token expirado, fazendo logout...');
      AuthManager.logout();
    } else if (error.status === 400 && error.responseJSON?.error?.includes('Conta não informada')) {
      console.log('⚠️ Problema de autenticação - conta não informada');
      showMessage('Problema de autenticação ao carregar cotações', 'warning');
    } else {
      console.log('⚠️ Erro ao carregar cotações, continuando sem elas');
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

// Funções para o modal de Cotar Tesouro
const abrirModalCotarTesouro = async () => {
  try {
    if (!usuario || !usuario.conta || !usuario.token) {
      showMessage('Usuário não autenticado', 'error');
      return;
    }
    
    $('#modalCotarTesouro').show();
    $('#tesouroLoading').show();
    $('#tesouroContent').hide();
    
    // console.log('🏛️ Carregando registros de Tesouro Direto...');
    
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.CARTEIRA_TESOURO, `/${usuario.conta}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      },
      timeout: 10000
    });
    
    const registros = response.registros || [];
    // console.log('✅ Registros de Tesouro carregados:', registros.length);
    
    renderizarTabelaTesouro(registros);
    
  } catch (error) {
    console.error('❌ Erro ao carregar registros de Tesouro:', error);
    if (error.status === 401) {
      AuthManager.logout();
      return;
    }
    showMessage('Erro ao carregar registros de Tesouro Direto: ' + (error.responseJSON?.erro || error.message), 'error');
    $('#tesouroLoading').html('<p style="color: #e74c3c;">Erro ao carregar registros</p>');
  }
};

const renderizarTabelaTesouro = (registros) => {
  $('#tesouroLoading').hide();
  
  if (!registros || registros.length === 0) {
    $('#tesouroEmpty').show();
    $('#tesouroContent').show();
    return;
  }
  
  let tbody = '';
  
  registros.forEach(registro => {
    const valorAtualText = registro.valorAtual 
      ? formatarMoeda(registro.valorAtual)
      : 'Não cotado';
    
    const statusCotacao = registro.temCotacao ? 'Atualizar' : 'Cotar';
    const btnClass = registro.temCotacao ? 'btn-cotar' : 'btn-cotar';
    
    tbody += `
      <tr>
        <td>${registro.codigo}</td>
        <td>Tesouro Direto</td>
        <td>${formatarMoeda(registro.precoMedio)}</td>
        <td>${registro.quantidade}</td>
        <td>${valorAtualText}</td>
        <td>
          <button class="${btnClass}" 
                  data-acao-id="${registro._id}" 
                  data-codigo="${registro.codigo}" 
                  data-tem-cotacao="${registro.temCotacao}">
            ${statusCotacao}
          </button>
        </td>
      </tr>
    `;
  });
  
  $('#tabelaTesouro').html(tbody);
  $('#tesouroEmpty').hide();
  $('#tesouroContent').show();
  
  // Adicionar event listeners para os botões de cotar
  $('.btn-cotar').off('click').on('click', function() {
    const acaoId = $(this).data('acao-id');
    const codigo = $(this).data('codigo');
    const temCotacao = $(this).data('tem-cotacao');
    
    abrirPromptCotacao(acaoId, codigo, temCotacao);
  });
};

const abrirPromptCotacao = (acaoId, codigo, temCotacao) => {
  const titulo = temCotacao ? 'Atualizar Cotação' : 'Criar Cotação';
  const mensagem = `${titulo} para ${codigo}:\n\nDigite o preço atual:`;
  
  const precoAtual = prompt(mensagem);
  
  if (precoAtual === null) return; // Usuário cancelou
  
  const preco = parseFloat(precoAtual.replace(',', '.'));
  
  if (isNaN(preco) || preco <= 0) {
    showMessage('Por favor, digite um preço válido maior que zero.', 'warning');
    return;
  }
  
  criarCotacaoTesouro(acaoId, preco, codigo);
};

const criarCotacaoTesouro = async (acaoId, precoAtual, codigo) => {
  try {
    if (!usuario || !usuario.token) {
      showMessage('Usuário não autenticado', 'error');
      return;
    }
    
    console.log('💰 Criando cotação para Tesouro:', codigo, 'Preço:', precoAtual);
    
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.COTACAO_TESOURO),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${usuario.token}`
      },
      data: JSON.stringify({
        acaoId: acaoId,
        precoAtual: precoAtual
      }),
      timeout: 10000
    });
    
    console.log('✅ Cotação criada com sucesso:', response);
    showMessage('Cotação criada/atualizada com sucesso!', 'success');
    
    // Recarregar a tabela de tesouro para mostrar a atualização
    await abrirModalCotarTesouro();
    
    // Atualizar a tabela principal da carteira também
    await atualizarTabela();
    
  } catch (error) {
    console.error('❌ Erro ao criar cotação:', error);
    if (error.status === 401) {
      AuthManager.logout();
      return;
    }
    showMessage('Erro ao criar cotação: ' + (error.responseJSON?.erro || error.message), 'error');
  }
};

const fecharModalCotarTesouro = () => {
  $('#modalCotarTesouro').hide();
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
      let totalInvestidoAtual
      
      if(acao.categoria === "Tesouro Direto"){  
        totalInvestidoAtual = cotacoes[acao.codigo] ? cotacoes[acao.codigo].preco * acao.quantidade : totalInvestido;
      }else {
        totalInvestidoAtual = cotacoes[acao.codigo + ".SA"] ? cotacoes[acao.codigo + ".SA"].preco * acao.quantidade : totalInvestido;
      }
    

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
    
    // Verificar se é Tesouro Direto ou ação regular
    let cotacao;
    if (acao.categoria === "Tesouro Direto") {
      cotacao = cotacoes[acao.codigo];
    } else {
      cotacao = cotacoes[acao.codigo + ".SA"];
    }
    
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
    let cotacaoA, cotacaoB;
    
    if (a.categoria === "Tesouro Direto") {
      cotacaoA = cotacoes[a.codigo];
    } else {
      cotacaoA = cotacoes[a.codigo + ".SA"];
    }
    
    if (b.categoria === "Tesouro Direto") {
      cotacaoB = cotacoes[b.codigo];
    } else {
      cotacaoB = cotacoes[b.codigo + ".SA"];
    }

    const valorAtualA = cotacaoA ? cotacaoA.preco : a.valor;
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
    
    // Verificar se é Tesouro Direto ou ação regular
    let cotacao;
    if (acao.categoria === "Tesouro Direto") {
      cotacao = cotacoes[acao.codigo];
    } else {
      cotacao = cotacoes[acao.codigo + ".SA"];
    }
    
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
        <td>${acao.quantidade}</td>
        <td style="font-weight:bold">${formatarMoeda(acao.valor)}</td>
        <td style="font-weight:bold">${formatarMoeda(totalAcao)}</td>
        <td class="${classeValorAquisicao}">${formatarMoeda(valorAtual)}</td>
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
  
  // Reinicializar sistema de pesquisa após atualizar tabela
  reinicializarFiltrosAposAtualizacao();
};

const atualizarRodape = () => {
  // Usar os totais originais quando não há filtros ativos
  atualizarRodapeComTotais(totais);
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
    console.log('🔧 Abrindo modal de edição para ação:', acaoId);
    
    if (!usuario || !usuario.token) {
      showMessage('Usuário não autenticado', 'error');
      return;
    }
    
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${acaoId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      },
      timeout: 10000
    });
    
    const acao = response;
    console.log('✅ Ação carregada para edição:', acao);
    
    if (!acao || !acao._id) {
      showMessage('Ação não encontrada', 'error');
      return;
    }
    
    $('#editCodigo').text(acao.codigo);
    $('#editCategoria').text(acao.categoria);
    $('#editQuantidadeAtual').text(acao.quantidade);
    $('#editPrecoMedio').text(formatarMoeda(acao.valor));
    
    $('#editNovaQuantidade').val(acao.quantidade);
    $('#editNovoValor').val(acao.valor.toFixed(2));
    
    $('#modalEditarAcao').data('acao-id', acao._id).show();
  } catch (error) {
    console.error('❌ Erro ao carregar ação para edição:', error);
    if (error.status === 401) {
      AuthManager.logout();
      return;
    }
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
    console.log('🔧 Abrindo modal adicionar mais para ação:', acaoId);
    
    if (!usuario || !usuario.token) {
      showMessage('Usuário não autenticado', 'error');
      return;
    }
    
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${acaoId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      },
      timeout: 10000
    });
    
    const acao = response;
    console.log('✅ Ação carregada para adicionar mais:', acao);
    
    if (!acao || !acao._id) {
      showMessage('Ação não encontrada', 'error');
      return;
    }
    
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
    console.error('❌ Erro ao carregar ação:', error);
    if (error.status === 401) {
      AuthManager.logout();
      return;
    }
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
    
    const response = await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${acaoId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      },
      timeout: 10000
    });
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
  $botao.prop('disabled', true);
  
  // Manter o ícone durante o carregamento
  $botao.html('<i class="fa-solid fa-dollar-sign"></i> Atualizando...');
  
  $('#loadingScreen').show();
  
  try {
    if (!usuario || !usuario.conta || !usuario.token) {
      throw new Error('Usuário não autenticado');
    }
    
    const carteira = await carregarCarteira();
    const acoes = carteira.map(c => c.codigo + ".SA");

    await $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.BUSCAR_ACOES),
      method: "POST",
      contentType: "application/json",
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      },
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
    console.error('😱 Erro ao atualizar preços:', error);
    if (error.status === 401) {
      AuthManager.logout();
      return;
    }
    showMessage('Erro na requisição ao servidor, favor validar a conexão!', 'error');
  } finally {
    $('#loadingScreen').hide();
    
    // Restaurar botão com ícone
    $botao.prop('disabled', false).html('<i class="fa-solid fa-dollar-sign"></i> Buscar Preços');
    
    // Restaurar ícone após atualização
    restaurarIconesBotoes();
  }
};

// Função para restaurar ícones dos botões após atualizações
const restaurarIconesBotoes = () => {
  // Verificar e restaurar ícone do botão "Buscar Preços"
  const $botaoPrecos = $('#atualizarPreco');
  if ($botaoPrecos.length && !$botaoPrecos.find('i').length) {
    $botaoPrecos.html('<i class="fa-solid fa-dollar-sign"></i> Buscar Preços');
  } else if ($botaoPrecos.length && $botaoPrecos.text().trim() === 'Buscar Preços') {
    // Garantir que o ícone esteja presente
    if (!$botaoPrecos.find('i.fa-dollar-sign').length) {
      $botaoPrecos.html('<i class="fa-solid fa-dollar-sign"></i> Buscar Preços');
    }
  }
  
  console.log('✅ Ícones dos botões restaurados');
};

const atualizarTabela = async () => {
  try {
    // console.log('🔄 Atualizando tabela...');
    
    const [carteira, novasCotacoes] = await Promise.all([
      carregarCarteira(),
      carregarCotacoes()
    ]);
    
    // console.log('📊 Dados carregados - Carteira:', carteira.length, 'itens, Cotações:', Object.keys(novasCotacoes).length);
    
    cotacoes = novasCotacoes;
    calcularTotais(carteira);
    renderizarTabela(carteira);
    
    // console.log('✅ Tabela atualizada com sucesso!');
  } catch (error) {
    console.error('😱 Erro ao carregar dados da carteira:', error);
    showMessage('Erro ao carregar dados da carteira: ' + error.message, 'error');
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
    // console.log('🚀 Iniciando aplicação carteira...');
    
    // Verificar se usuário está logado localmente primeiro
    usuario = obterUsuario();
    
    if (!usuario || !usuario.conta || !usuario.token) {
      console.log('❌ Usuário não encontrado ou sem dados necessários');
      showMessage('Sessão inválida. Redirecionando para login...', 'warning');
      setTimeout(() => {
        location.href = '/';
      }, 2000);
      return;
    }
    
    // console.log('✅ Usuário encontrado:', usuario.login, 'Conta:', usuario.conta);
    
    // Validar usuário com o backend de forma não bloqueante
    validarUsuario().catch(error => {
      console.log('⚠️ Validação backend falhou:', error.message);
      // Não bloquear o carregamento inicial, apenas avisar
      showMessage('Problemas de conectividade. Alguns recursos podem estar limitados.', 'warning');
    });

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
    // console.log('🗑️ Tentando excluir ação:', acaoId);
    
    if (!acaoId) {
      console.error('❌ ID da ação não encontrado');
      showMessage('Erro: Ação não identificada', 'error');
      return;
    }
    
    // Buscar ação para confirmação
    $.ajax({
      url: CONFIG.getUrl(CONFIG.ENDPOINTS.ACAO, `/${acaoId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${usuario.token}`
      },
      success: (acao) => {
        // console.log('✅ Ação encontrada para exclusão:', acao);
        abrirModalConfirmarExclusao(acao);
      },
      error: (error) => {
        console.error('❌ Erro ao buscar ação para exclusão:', error);
        if (error.status === 401) {
          AuthManager.logout();
          return;
        }
        showMessage('Erro ao carregar ação para exclusão', 'error');
      }
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

  // Event listeners para o modal de Cotar Tesouro
  $('#modalCotarTesouro .fechar, #modalCotarTesouro').on('click', (e) => {
    if ($(e.target).is('#modalCotarTesouro') || $(e.target).is('.fechar')) {
      fecharModalCotarTesouro();
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

  $('#cotarTesouro').click(function() {
    abrirModalCotarTesouro();
    $('#menuOptions').removeClass('active');
  });

  $('#abrirModal').on('click', abrirModal);
  $('.fechar, #modalCarteira').on('click', (e) => {
    if ($(e.target).is(DOM.modalCarteira) || $(e.target).is('.fechar')) {
      fecharModal();
    }
  });


    if(usuario.conta === 1){
     $('#menuConfigurar').css("display", "block");
    }
  $('#menuConfigurar').click(function() {
   if(usuario.conta === 1){
      location = "../configuracoes/";
   }
   
    $('#menuOptions').removeClass('active');
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
  // console.log('📊 Carregando dados da carteira...');
  await atualizarTabela();
  // console.log('✅ Dados da carteira carregados com sucesso!');
  
  // Inicializar sistema de pesquisa
  inicializarSistemaPesquisa();
  
  // Verificar ícones FontAwesome
  verificarIconesFontAwesome();
  } catch (error) {
    console.error('😱 Erro ao inicializar a aplicação:', error);
    showMessage('Erro ao inicializar a aplicação: ' + error.message, 'error');
  }
};

// ===== SISTEMA DE PESQUISA =====
const inicializarSistemaPesquisa = () => {
  // Event listeners para cada campo de pesquisa usando event delegation
  $(document).on('input', '#searchCategoria', () => filtrarTabela());
  $(document).on('input', '#searchCodigo', () => filtrarTabela());
  // $(document).on('input', '#searchPrecoMedio', () => filtrarTabela());
  // $(document).on('input', '#searchPrecoAtual', () => filtrarTabela());
  $(document).on('input', '#searchQuantidade', () => filtrarTabela());
  // $(document).on('input', '#searchTotalInvestido', () => filtrarTabela());
  // $(document).on('input', '#searchTotalAtual', () => filtrarTabela());
  // $(document).on('input', '#searchLucroPerda', () => filtrarTabela());
  // $(document).on('input', '#searchLucroPerdaPercent', () => filtrarTabela());
  // $(document).on('input', '#searchPosicaoCarteira', () => filtrarTabela());
  // $(document).on('input', '#searchDividendYield', () => filtrarTabela());
  
  // Botão para limpar todos os filtros usando event delegation
  $(document).on('click', '#clearAllFilters', limparTodosFiltros);
  
  // Toggle de exibição dos filtros usando event delegation
  $(document).on('click', '#toggleFilters', toggleFiltros);
  
  console.log('🔍 Sistema de pesquisa inicializado com event delegation');
};

const toggleFiltros = () => {
  const $searchRow = $('#searchRow');
  const $toggleIcon = $('#toggleFilters');
  
  if ($searchRow.is(':visible')) {
    // Esconder filtros
    $searchRow.hide();
    $toggleIcon.removeClass('active');
    
    // Limpar todos os filtros quando esconder
    limparTodosFiltrosSilencioso();
  } else {
    // Mostrar filtros
    $searchRow.show();
    $toggleIcon.addClass('active');
  }
};

const limparTodosFiltrosSilencioso = () => {
  // Limpar todos os campos de pesquisa sem mostrar mensagem
  $('#searchCategoria').val('');
  $('#searchCodigo').val('');
  $('#searchPrecoMedio').val('');
  $('#searchPrecoAtual').val('');
  $('#searchQuantidade').val('');
  $('#searchTotalInvestido').val('');
  $('#searchTotalAtual').val('');
  $('#searchLucroPerda').val('');
  $('#searchLucroPerdaPercent').val('');
  $('#searchPosicaoCarteira').val('');
  $('#searchDividendYield').val('');
  
  // Mostrar todas as linhas
  $('#tabelaAcoes tr').removeClass('hidden').show();
  
  // Atualizar totais
  atualizarTotaisFiltrados();
};

const filtrarTabela = () => {
  const filtros = {
    categoria: $('#searchCategoria').val().toLowerCase().trim(),
    codigo: $('#searchCodigo').val().toLowerCase().trim(),
    // precoMedio: $('#searchPrecoMedio').val().toLowerCase().trim(),
    // precoAtual: $('#searchPrecoAtual').val().toLowerCase().trim(),
    quantidade: $('#searchQuantidade').val().toLowerCase().trim(),
    // totalInvestido: $('#searchTotalInvestido').val().toLowerCase().trim(),
    // totalAtual: $('#searchTotalAtual').val().toLowerCase().trim(),
    // lucroPerda: $('#searchLucroPerda').val().toLowerCase().trim(),
    // lucroPerdaPercent: $('#searchLucroPerdaPercent').val().toLowerCase().trim(),
    // posicaoCarteira: $('#searchPosicaoCarteira').val().toLowerCase().trim(),
    // dividendYield: $('#searchDividendYield').val().toLowerCase().trim()
  };
  
  // Verificar se há algum filtro ativo
  const temFiltroAtivo = Object.values(filtros).some(filtro => filtro !== '');
  
  if (!temFiltroAtivo) {
    // Se não há filtros, mostrar todas as linhas
    $('#tabelaAcoes tr').removeClass('hidden').show();
    return;
  }
  
  // Aplicar filtros linha por linha
  $('#tabelaAcoes tr').each(function() {
    const $linha = $(this);
    const celulas = $linha.find('td');
    
    if (celulas.length === 0) return; // Pular se não for uma linha de dados
    
    let mostrarLinha = true;
    
    // Função helper para verificar se um valor contém o filtro
    const contemFiltro = (valor, filtro) => {
      if (!filtro) return true;
      
      // Remover formatação de moeda e porcentagem para comparação numérica
      const valorLimpo = valor.replace(/[R$\s%\.]/g, '').replace(',', '.');
      const filtroLimpo = filtro.replace(/[R$\s%\.]/g, '').replace(',', '.');
      
      // Tentar comparação numérica primeiro
      const valorNum = parseFloat(valorLimpo);
      const filtroNum = parseFloat(filtroLimpo);
      
      if (!isNaN(valorNum) && !isNaN(filtroNum)) {
        // Comparação numérica: verificar se o valor contém o número
        return valorLimpo.includes(filtroLimpo) || 
               valorNum.toString().includes(filtroNum.toString());
      }
      
      // Comparação textual
      return valor.toLowerCase().includes(filtro.toLowerCase());
    };
    
    // Verificar cada filtro
    if (filtros.categoria && !contemFiltro($(celulas[0]).text(), filtros.categoria)) {
      mostrarLinha = false;
    }
    if (filtros.codigo && !contemFiltro($(celulas[1]).text(), filtros.codigo)) {
      mostrarLinha = false;
    }
    if (filtros.precoMedio && !contemFiltro($(celulas[2]).text(), filtros.precoMedio)) {
      mostrarLinha = false;
    }
    if (filtros.precoAtual && !contemFiltro($(celulas[3]).text(), filtros.precoAtual)) {
      mostrarLinha = false;
    }
    if (filtros.quantidade && !contemFiltro($(celulas[4]).text(), filtros.quantidade)) {
      mostrarLinha = false;
    }
    if (filtros.totalInvestido && !contemFiltro($(celulas[5]).text(), filtros.totalInvestido)) {
      mostrarLinha = false;
    }
    if (filtros.totalAtual && !contemFiltro($(celulas[6]).text(), filtros.totalAtual)) {
      mostrarLinha = false;
    }
    if (filtros.lucroPerda && !contemFiltro($(celulas[7]).text(), filtros.lucroPerda)) {
      mostrarLinha = false;
    }
    if (filtros.lucroPerdaPercent && !contemFiltro($(celulas[8]).text(), filtros.lucroPerdaPercent)) {
      mostrarLinha = false;
    }
    if (filtros.posicaoCarteira && !contemFiltro($(celulas[9]).text(), filtros.posicaoCarteira)) {
      mostrarLinha = false;
    }
    if (filtros.dividendYield && !contemFiltro($(celulas[10]).text(), filtros.dividendYield)) {
      mostrarLinha = false;
    }
    
    // Mostrar ou ocultar a linha
    if (mostrarLinha) {
      $linha.removeClass('hidden').show();
    } else {
      $linha.addClass('hidden').hide();
    }
  });
  
  // Atualizar totais baseados nas linhas visíveis
  atualizarTotaisFiltrados();
};

const limparTodosFiltros = () => {
  // Limpar todos os campos de pesquisa
  $('#searchCategoria').val('');
  $('#searchCodigo').val('');
  $('#searchPrecoMedio').val('');
  $('#searchPrecoAtual').val('');
  $('#searchQuantidade').val('');
  $('#searchTotalInvestido').val('');
  $('#searchTotalAtual').val('');
  $('#searchLucroPerda').val('');
  $('#searchLucroPerdaPercent').val('');
  $('#searchPosicaoCarteira').val('');
  $('#searchDividendYield').val('');
  
  // Mostrar todas as linhas
  $('#tabelaAcoes tr').removeClass('hidden').show();
  
  // Atualizar totais
  atualizarTotaisFiltrados();
  
  showMessage('Todos os filtros foram limpos', 'success');
};

// Função para reinicializar filtros após atualização da tabela
const reinicializarFiltrosAposAtualizacao = () => {
  // Verificar se a linha de filtros existe e está visível
  const $searchRow = $('#searchRow');
  const $toggleIcon = $('#toggleFilters');
  
  if ($searchRow.length === 0) {
    console.warn('⚠️ Linha de filtros não encontrada no DOM');
    return;
  }
  
  // Se os filtros estavam visíveis, manter visíveis
  const filtrosEstavaVisiveis = $searchRow.is(':visible');
  const iconeTinhaClasseActive = $toggleIcon.hasClass('active');
  
  // Reinicializar event listeners se necessário
  if (filtrosEstavaVisiveis || iconeTinhaClasseActive) {
    // Manter estado dos filtros
    $searchRow.show();
    $toggleIcon.addClass('active');
    
    // Reaplicar filtros se existem valores nos campos
    const temFiltrosAtivos = [
      $('#searchCategoria').val(),
      $('#searchCodigo').val(),
      $('#searchPrecoMedio').val(),
      $('#searchPrecoAtual').val(),
      $('#searchQuantidade').val(),
      $('#searchTotalInvestido').val(),
      $('#searchTotalAtual').val(),
      $('#searchLucroPerda').val(),
      $('#searchLucroPerdaPercent').val(),
      $('#searchPosicaoCarteira').val(),
      $('#searchDividendYield').val()
    ].some(val => val && val.trim() !== '');
    
    if (temFiltrosAtivos) {
      // Reaplicar filtros existentes
      setTimeout(() => {
        filtrarTabela();
      }, 50);
    }
  }
  
  // Verificar e restaurar todos os ícones FontAwesome
  verificarIconesFontAwesome();
  
  console.log('🔍 Filtros reinicializados após atualização da tabela');
};

// Função para verificar e corrigir ícones FontAwesome
const verificarIconesFontAwesome = () => {
  // Forçar recarga dos ícones FontAwesome se necessário
  const $icones = $('i[class*="fa-"]');
  
  $icones.each(function() {
    const $icon = $(this);
    const classes = $icon.attr('class');
    
    // Verificar se o ícone está sendo renderizado corretamente
    if (classes && classes.includes('fa-dollar') && !classes.includes('fa-dollar-sign')) {
      // Corrigir ícone de dólar incorreto
      $icon.removeClass('fa-dollar').addClass('fa-dollar-sign');
      console.log('✅ Ícone fa-dollar corrigido para fa-dollar-sign');
    }
  });
  
  // Verificar se FontAwesome está carregado
  if (typeof FontAwesome !== 'undefined' && FontAwesome.dom) {
    FontAwesome.dom.i2svg();
  }
};

// Função para atualizar totais baseados nas linhas visíveis
const atualizarTotaisFiltrados = () => {
  let totaisFiltrados = {
    investido: 0,
    quantidade: 0,
    atual: 0,
    lucro: 0,
    lucroPorcento: 0
  };
  
  // Calcular totais apenas das linhas visíveis
  $('#tabelaAcoes tr:visible').each(function() {
    const $linha = $(this);
    const celulas = $linha.find('td');
    
    if (celulas.length === 0) return; // Pular se não for uma linha de dados
    
    // Extrair valores das células
    const quantidade = parseInt($(celulas[4]).text()) || 0;
    const totalInvestido = parseFloat($(celulas[5]).text().replace(/[R$\s\.]/g, '').replace(',', '.')) || 0;
    const totalAtual = parseFloat($(celulas[6]).text().replace(/[R$\s\.]/g, '').replace(',', '.')) || 0;
    const lucro = parseFloat($(celulas[7]).text().replace(/[R$\s\.]/g, '').replace(',', '.')) || 0;
    
    // Somar aos totais filtrados
    totaisFiltrados.investido += totalInvestido;
    totaisFiltrados.quantidade += quantidade;
    totaisFiltrados.atual += totalAtual;
    totaisFiltrados.lucro += lucro;
  });
  
  // Calcular porcentagem de lucro/prejuizo
  totaisFiltrados.lucroPorcento = totaisFiltrados.lucro !== 0 ? 
    ((totaisFiltrados.lucro * 100) / totaisFiltrados.atual).toFixed(2) : 0;
  
  // Atualizar o rodapé com os novos totais
  atualizarRodapeComTotais(totaisFiltrados);
};

// Função para atualizar o rodapé com totais personalizados
const atualizarRodapeComTotais = (totaisCustom) => {
  const classeLucroTotal = totaisCustom.lucro >= 0 ? 'valor-superior' : 'valor-inferior';
  let classeTotalAtual = totaisCustom.atual !== 0 ? 
    (totaisCustom.atual >= totaisCustom.investido ? 'valor-superior' : 'valor-inferior') : 
    'valor-superior';

  // Remover classes anteriores e adicionar novas
  $('#totalQuantidade').text(totaisCustom.quantidade);
  $('#totalInvestido').text(formatarMoeda(totaisCustom.investido));
  $('#totalAtual').removeClass('valor-superior valor-inferior').addClass(classeTotalAtual).text(formatarMoeda(totaisCustom.atual));
  $('#totalLucro').removeClass('valor-superior valor-inferior').addClass(classeLucroTotal).text(formatarMoeda(totaisCustom.lucro));
  $('#totalLucroPorcento').text(`${totaisCustom.lucroPorcento !== 0 ? totaisCustom.lucroPorcento : 0}%`);
};

$(document).ready(inicializar);