// Aguardar CONFIG estar disponível
let CONFIG_READY = false;

// Fallback para endpoints caso o CONFIG falhe
const FALLBACK_ENDPOINTS = {
    PROVENTOS: '/api/proventos',
    USUARIOS: '/api/usuarios',
    CARTEIRA: '/api/carteira',
    BUSCAR_ACOES: '/api/buscarAcoes'
};

const waitForConfig = () => {
    // console.log('🔍 Verificando CONFIG em waitForConfig...');
    // console.log('📋 CONFIG completo:', CONFIG);
    // console.log('📋 CONFIG.ENDPOINTS completo:', CONFIG?.ENDPOINTS);
    // console.log('📋 CONFIG.ENDPOINTS.PROVENTOS:', CONFIG?.ENDPOINTS?.PROVENTOS);
    
    if (typeof CONFIG !== 'undefined' && CONFIG.ENDPOINTS && CONFIG.ENDPOINTS.PROVENTOS) {
        CONFIG_READY = true;
        // console.log('✅ CONFIG carregado e pronto para uso');
        return true;
    }
    
    // Se o CONFIG falhar, usar fallback
    if (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) {
        // console.log('⚠️ Usando endpoints de fallback');
        CONFIG.ENDPOINTS = { ...CONFIG.ENDPOINTS, ...FALLBACK_ENDPOINTS };
        CONFIG_READY = true;
        return true;
    }
    
    return false;
};

const DOM = {
    tabelaProventos: '#tabelaProventos',
    filtroStatus: '#filtroStatus',
    filtroTipo: '#filtroTipo',
    filtroMes: '#filtroMes',
    totalRecebido: '#totalRecebido',
    totalReceber: '#totalReceber',
    mediaMensal: '#mediaMensal'
};

let usuario = null;
let proventos = [];
let proventosFiltrados = [];

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

// Inicializar usuário
usuario = obterUsuario();

// Verificar se o CONFIG foi carregado corretamente
const verificarConfig = () => {
    // console.log('🔧 Verificando configuração...');
    // console.log('📋 CONFIG disponível:', typeof CONFIG);
    // console.log('📋 CONFIG.ENDPOINTS:', CONFIG?.ENDPOINTS);
    // console.log('📋 CONFIG.ENDPOINTS.PROVENTOS:', CONFIG?.ENDPOINTS?.PROVENTOS);
    // console.log('📋 CONFIG.API_BASE_URL:', CONFIG?.API_BASE_URL);
    
    // Debug adicional - verificar se há algum problema com o objeto
    if (CONFIG && CONFIG.ENDPOINTS) {
        // console.log('🔍 Lista completa de endpoints:');
        // Object.keys(CONFIG.ENDPOINTS).forEach(key => {
        //     console.log(`  ${key}: ${CONFIG.ENDPOINTS[key]}`);
        // });
        
        // Verificar se PROVENTOS existe mas está undefined
        if (CONFIG.ENDPOINTS.hasOwnProperty('PROVENTOS')) {
            // console.log('⚠️ PROVENTOS existe mas é undefined:', CONFIG.ENDPOINTS.PROVENTOS);
        } else {
            // console.log('❌ PROVENTOS não existe no objeto ENDPOINTS');
        }
    }
    
    // Tentar aguardar CONFIG se não estiver pronto
    if (!CONFIG || !CONFIG.ENDPOINTS || !CONFIG.ENDPOINTS.PROVENTOS) {
        // console.log('⏳ CONFIG não está pronto, tentando aguardar...');
        
        // Aguardar até 2 segundos
        let attempts = 0;
        const maxAttempts = 20; // 20 tentativas * 100ms = 2 segundos
        
        const checkConfig = () => {
            attempts++;
            if (waitForConfig()) {
                // console.log('✅ CONFIG carregado após aguardar');
                return true;
            }
            
            if (attempts >= maxAttempts) {
                console.error('❌ CONFIG não foi carregado após 2 segundos!');
                showMessage('Erro de configuração. Recarregue a página.', 'error');
                return false;
            }
            
            // Aguardar mais 100ms
            setTimeout(checkConfig, 100);
            return false;
        };
        
        return checkConfig();
    }
    
    // console.log('✅ CONFIG carregado corretamente');
    return true;
};

const formatarMoeda = valor => {
    if (!valor || isNaN(valor)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
};

const formatarData = data => {
    if (!data) return 'N/A';
    try {
        return new Date(data).toLocaleDateString('pt-BR');
    } catch (error) {
        return 'Data inválida';
    }
};

const formatarPercentual = valor => {
    if (!valor || isNaN(valor)) return '0,00%';
    return `${valor.toFixed(2)}%`;
};

// Funções para interação com a API
const carregarProventos = async () => {
    try {
        if (!usuario || !usuario.conta || !usuario.token) {
            console.error('Usuário não autenticado, sem conta ou sem token');
            return [];
        }
        // console.log('🔄 Carregando proventos da conta:', usuario.conta);
        
        // Buscar proventos da conta
        const url = CONFIG.getUrl(CONFIG.ENDPOINTS.PROVENTOS, `/${usuario.conta}`);
        // console.log('🌐 URL da requisição:', url);
        
        const response = await $.ajax({
            url: url,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${usuario.token}`
            }
        });
        // console.log('📡 Resposta completa da API:', response);
        // console.log('📊 Tipo da resposta:', typeof response);
        // console.log('📋 Estrutura da resposta:', Object.keys(response || {}));
        
        // Verificar se a resposta tem a estrutura esperada
        if (!response) {
            // console.warn('⚠️ Resposta vazia da API');
            return [];
        }
        
        if (!response.proventos) {
            // console.warn('⚠️ Resposta não contém campo "proventos"');
            // console.log('📋 Campos disponíveis:', Object.keys(response));
            return [];
        }
        
        const proventos = response.proventos || [];
        // console.log('📊 Proventos carregados:', proventos.length);
        // console.log('📋 Estrutura do primeiro provento:', proventos[0] ? Object.keys(proventos[0]) : 'Nenhum provento');
        
        // Log dos códigos encontrados para debug
        if (proventos.length > 0) {
            const codigosUnicos = [...new Set(proventos.map(p => p.codigoAcao))];
            // console.log('🔍 Códigos de ações encontrados:', codigosUnicos);
        }
        
        return proventos;
    } catch (error) {
        console.error("❌ Erro ao carregar proventos:", error);
        if (error.status === 401) {
            console.log('🔒 Token expirado no proventos, fazendo logout...');
            AuthManager.logout();
        }
        // console.error("📋 Detalhes do erro:", {
        //     message: error.message,
        //     status: error.status,
        //     statusText: error.statusText,
        //     responseText: error.responseText,
        //     stack: error.stack
        // });
        return [];
    }
};

// Função para renderizar tabela de proventos
const renderizarTabela = () => {
    const tbody = $(DOM.tabelaProventos);
    tbody.empty();

    if (proventosFiltrados.length === 0) {
        tbody.append(`
            <tr>
                <td colspan="8" class="text-center text-muted">
                    <i class="fas fa-info-circle"></i> Nenhum provento encontrado
                </td>
            </tr>
        `);
        return;
    }

    proventosFiltrados.forEach(provento => {
      
        const tr = $(`
            <tr data-id="${provento._id}">
                <td>
                 <strong>${provento.codigoAcao.replace(".SA", "")}</strong>
                </td>
                <td class="text-center">${provento.tipo}</td> 
                <!-- <td class="text-center">${formatarData(provento.dataBase)}</td> -->
                <!-- <td class="text-center">${formatarData(provento.dataPagamento)}</td> -->
                <td class="text-center">${formatarMoeda(provento.valorPorAcao)}</td>
                <td class="text-center">${provento.quantidadeAcoes}</td>
                <td class="text-center">
                    <strong>${formatarMoeda(provento.valorTotal)}</strong>
                </td>
              <!-- 
               <td class="text-center">
                    <span style="color:black" class="badge badge-${provento.status === 'Pago' ? 'success' : 'warning'}">
                        ${provento.status === 'Pago' ? '✓ Pago' : '⏳ Aguardando'}
                    </span>
                </td> 
                -->
            </tr>
        `);
        tbody.append(tr);
    });
};

// Função para calcular resumos
const calcularResumos = () => {
    const totalRecebido = proventosFiltrados
        .filter(p => p.status === 'Pago')
        .reduce((sum, p) => sum + (p.valorTotal || 0), 0);
    
    const totalReceber = proventosFiltrados
        .filter(p => p.status === 'Aguardando')
        .reduce((sum, p) => sum + (p.valorTotal || 0), 0);
    
    // Calcular média mensal dos últimos 12 meses
    const agora = new Date();
    const dozeMesesAtras = new Date(agora.getFullYear(), agora.getMonth() - 11, 1);
    
    const proventosUltimos12Meses = proventosFiltrados.filter(p => {
        try {
            const dataPagamento = new Date(p.dataPagamento);
            return dataPagamento >= dozeMesesAtras && p.status === 'Pago';
        } catch (error) {
            return false;
        }
    });
    
    const mediaMensal = proventosUltimos12Meses.length > 0 
        ? proventosUltimos12Meses.reduce((sum, p) => sum + (p.valorTotal || 0), 0) / 12
        : 0;
    
    // Atualizar os cards de resumo
    $(DOM.totalRecebido).text(formatarMoeda(totalRecebido));
    $(DOM.totalReceber).text(formatarMoeda(totalReceber));
    $(DOM.mediaMensal).text(formatarMoeda(mediaMensal));
    
    // Adicionar informações extras
    const totalProventos = proventosFiltrados.length;
    const proventosPagos = proventosFiltrados.filter(p => p.status === 'Pago').length;
    const proventosAguardando = proventosFiltrados.filter(p => p.status === 'Aguardando').length;
    
    // console.log('📊 Resumo calculado:', {
    //     totalProventos,
    //     proventosPagos,
    //     proventosAguardando,
    //     totalRecebido,
    //     totalReceber,
    //     mediaMensal
    // });
};

// Função para aplicar filtros
const aplicarFiltros = () => {
    const statusFiltro = $(DOM.filtroStatus).val();
    const tipoFiltro = $(DOM.filtroTipo).val();
    const mesFiltro = $(DOM.filtroMes).val();
    
    // console.log('🔍 Aplicando filtros:', { statusFiltro, tipoFiltro, mesFiltro });
    
    proventosFiltrados = proventos.filter(provento => {
        // Filtro por status
        if (statusFiltro !== 'todos' && provento.status !== statusFiltro) {
            return false;
        }
        
        // Filtro por tipo
        if (tipoFiltro !== 'todos' && provento.tipo !== tipoFiltro) {
            return false;
        }
        
        // Filtro por mês
        if (mesFiltro) {
            try {
                const dataPagamento = new Date(provento.dataPagamento);
                const mesProvento = `${dataPagamento.getFullYear()}-${String(dataPagamento.getMonth() + 1).padStart(2, '0')}`;
                if (mesProvento !== mesFiltro) {
                    return false;
                }
            } catch (error) {
                return false;
            }
        }
        
        return true;
    });
    
    // console.log(`✅ Filtros aplicados: ${proventosFiltrados.length} proventos encontrados`);
    
    renderizarTabela();
    calcularResumos();
};

// Função para testar conectividade com a API
const testarConectividade = async () => {
    try {
        // console.log('🧪 Testando conectividade com a API...');
        
        // Verificar configuração primeiro
        if (!verificarConfig()) {
            return false;
        }
        
        // console.log('🌐 URL base:', CONFIG.API_BASE_URL);
        // console.log('🔗 Endpoint proventos:', CONFIG.ENDPOINTS.PROVENTOS);
        
        // Testar com um endpoint que não requer autenticação ou usar o próprio endpoint de proventos
        if (!usuario || !usuario.token) {
            console.warn('❌ Usuário não autenticado, pulando teste de conectividade');
            return false;
        }
        
        // Testar diretamente o endpoint de carteira que sabemos que funciona
        const testUrl = CONFIG.getUrl(CONFIG.ENDPOINTS.CARTEIRA, `/${usuario.conta}`);
        // console.log('🧪 Testando endpoint de carteira:', testUrl);
        
        const testResponse = await $.ajax({
            url: testUrl,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${usuario.token}`
            },
            timeout: 5000
        });
        // console.log('✅ Servidor respondendo:', testResponse);
        
        return true;
    } catch (error) {
        console.error('❌ Erro de conectividade:', error);
        return false;
    }
};

// Função para carregar dados
const carregarDados = async () => {
    // console.log('🔄 Iniciando carregamento de dados...');
    
    // Primeiro verificar configuração
    if (!verificarConfig()) {
        return;
    }
    
    // Depois testar conectividade
    const conectividadeOk = await testarConectividade();
    if (!conectividadeOk) {
        showMessage('Erro de conectividade com o servidor. Verifique se está rodando.', 'error');
        return;
    }
    
    proventos = await carregarProventos();
    proventosFiltrados = [...proventos];
    
    // console.log(`📊 Dados carregados: ${proventos.length} proventos`);
    
    renderizarTabela();
    calcularResumos();
    
    // Atualizar contadores
    atualizarContadores();
};

// Função para atualizar contadores
const atualizarContadores = () => {
    const total = proventos.length;
    const pagos = proventos.filter(p => p.status === 'Pago').length;
    const aguardando = proventos.filter(p => p.status === 'Aguardando').length;
    
    // Adicionar contadores visuais se não existirem
    if (!$('#contadorTotal').length) {
        $('.resumo').append(`
            <div class="card">
                <h3>Total de Proventos</h3>
                <p id="contadorTotal">${total}</p>
            </div>
        `);
    }
    
    // if (!$('#contadorPagos').length) {
    //     $('.resumo').append(`
    //         <div class="card">
    //             <h3>Proventos Pagos</h3>
    //             <p id="contadorPagos">${pagos}</p>
    //         </div>
    //     `);
    // }
    
    // if (!$('#contadorAguardando').length) {
    //     $('.resumo').append(`
    //         <div class="card">
    //             <h3>Proventos Aguardando</h3>
    //             <p id="contadorAguardando">${aguardando}</p>
    //         </div>
    //     `);
    // }
    
    $('#contadorTotal').text(total);
    $('#contadorPagos').text(pagos);
    $('#contadorAguardando').text(aguardando);
    
    // Verificar inconsistências entre carteira e proventos
    verificarInconsistencias();
};

// Função para verificar inconsistências
const verificarInconsistencias = async () => {
    try {
        // Buscar ações da carteira
        const responseCarteira = await $.get(CONFIG.getUrl(CONFIG.ENDPOINTS.CARTEIRA, `/${usuario.conta}`));
        const acoesCarteira = responseCarteira.acoes || [];
        
        // Códigos da carteira (sem .SA)
        const codigosCarteira = acoesCarteira.map(a => a.codigo);
        
        // Códigos dos proventos (com .SA)
        const codigosProventos = [...new Set(proventos.map(p => p.codigoAcao))];
        
        // Verificar inconsistências
        const inconsistencias = [];
        
        acoesCarteira.forEach(acao => {
          if(acao.codigo !== "N/A"){
            const codigoComSA = acao.codigo + '.SA';
            const temProventos = codigosProventos.includes(codigoComSA);
            
            if (!temProventos) {
                inconsistencias.push({
                    acao: acao.codigo,
                    tipo: 'Sem proventos',
                    codigoCarteira: acao.codigo,
                    codigoProventos: codigoComSA
                });
            }
          }
        });
        

        if (inconsistencias.length > 0) {
            // Mostrar aviso como notificação flutuante em vez de alerta Bootstrap
            showMessage(`${inconsistencias.length} ação(ões) da carteira não possuem proventos cadastrados.`, 'warning');
        }
        
    } catch (error) {
        console.error('Erro ao verificar inconsistências:', error);
    }
};

// Função para mostrar mensagens (usar apenas as notificações globais)
const showMessage = (message, type) => {
    // Verificar se o sistema global de notificações está disponível
    if (typeof window.showMessage === 'function' && window.showMessage !== showMessage) {
        return window.showMessage(message, type);
    }
    
    // Verificar se floatingNotifications está disponível diretamente
    if (typeof window.floatingNotifications === 'object' && window.floatingNotifications.show) {
        return window.floatingNotifications.show(message, type);
    }
    
    // Aguardar carregamento do sistema de notificações
    let attempts = 0;
    const maxAttempts = 10;
    
    const waitForNotifications = () => {
        attempts++;
        
        if (typeof window.showMessage === 'function' && window.showMessage !== showMessage) {
            return window.showMessage(message, type);
        }
        
        if (typeof window.floatingNotifications === 'object' && window.floatingNotifications.show) {
            return window.floatingNotifications.show(message, type);
        }
        
        if (attempts < maxAttempts) {
            setTimeout(waitForNotifications, 100);
        } else {
            // Fallback: mostrar no console se não conseguir carregar as notificações
            console.warn('Sistema de notificações não encontrado. Mensagem:', message);
            // Como último recurso, usar alert nativo
            alert(message);
        }
    };
    
    waitForNotifications();
};


const atualizarProventosAutomaticamente = async () => {
    try {
        const btn = $('#atualizarProventos');
        const originalText = btn.html();
        
        btn.prop('disabled', true);
        btn.html('<i class="fas fa-spinner fa-spin"></i> Atualizando...');
        
        showMessage('Atualizando proventos...', 'success');
        
        // Buscar ações da carteira
        const response = await $.get(CONFIG.getUrl(CONFIG.ENDPOINTS.CARTEIRA, `/${usuario.conta}`));
        const acoes = response.acoes || [];
        
        if (acoes.length === 0) {
            showMessage('Nenhuma ação encontrada na carteira para atualizar proventos.', 'warning');
            return;
        }
        
        // Converter códigos para o formato do Yahoo Finance (adicionar .SA)
        const codigos = acoes.map(acao => {
            // Se o código não termina com .SA, adicionar
            if (!acao.codigo.endsWith('.SA')) {
                return acao.codigo + '.SA';
            }
            return acao.codigo;
        });
        
        // console.log(`📋 Ações encontradas na carteira: ${acoes.map(a => a.codigo).join(', ')}`);
        // console.log(`🔗 Códigos para Yahoo Finance: ${codigos.join(', ')}`);
        
        // Chamar API para buscar preços e atualizar proventos automaticamente
        const responsePrecos = await $.ajax({
            url: CONFIG.getUrl(CONFIG.ENDPOINTS.BUSCAR_ACOES),
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                conta: usuario.conta,
                acoes: codigos
            })
        });
        
        if (responsePrecos.acoes && responsePrecos.acoes.length > 0) {
            const proventosCriados = responsePrecos.proventos?.filter(p => p.resultado.success) || [];
            const proventosFalharam = responsePrecos.proventos?.filter(p => !p.resultado.success) || [];

            
            
            // console.log('📊 Resultado da atualização:', {
            //     acoes: responsePrecos.acoes.length,
            //     proventosCriados: proventosCriados.length,
            //     proventosFalharam: proventosFalharam.length
            // });
            
            if (proventosCriados.length > 0) {
                showMessage(`Proventos atualizados com sucesso! ${proventosCriados.length} ações processadas.`, 'success');
            }
            
            if (proventosFalharam.length > 0) {
                // console.log('⚠️ Proventos que falharam:', proventosFalharam);
                showMessage(`${proventosFalharam.length} ações não puderam ser processadas. Verifique os logs.`, 'warning');
            }
            
            // Recarregar proventos
            await carregarDados();
            
        } else {
            showMessage('Nenhuma ação foi processada.', 'warning');
        }
        
    } catch (error) {
        console.error('Erro ao atualizar proventos:', error);
        showMessage('Erro ao atualizar proventos. Tente novamente.', 'error');
    } finally {
        const btn = $('#atualizarProventos');
        btn.prop('disabled', false);
        btn.html('<i class="fas fa-sync-alt"></i> Atualizar');
    }
};

// Event Listeners
$(document).ready(async () => {
    // console.log('🚀 Página de proventos carregada');
    
    // Aguardar um pouco para garantir que o CONFIG foi carregado
    setTimeout(async () => {
        // console.log('⏳ Aguardando carregamento do CONFIG...');
        // Verificar configuração primeiro
        if (!verificarConfig()) {
            console.error('❌ CONFIG não disponível após delay');
            return;
        }
        // Sincronizar proventos automaticamente ao entrar na página
        // if (typeof atualizarProventosAutomaticamente === 'function') {
        //     await atualizarProventosAutomaticamente();
        // }
        // Carregar dados iniciais
        await carregarDados();
        // Event listener para botão voltar
        $('#btnVoltar').click(() => {
            location.href = '../carteira/';
        });
    
    // Event listener para botão atualizar proventos
    $('#atualizarProventos').click(atualizarProventosAutomaticamente);
    
    // Event listener para botão testar API
    $('#testarAPI').click(async () => {
        try {
            const btn = $('#testarAPI');
            const originalText = btn.html();
            
            btn.prop('disabled', true);
            btn.html('<i class="fas fa-spinner fa-spin"></i> Testando...');
            
            // console.log('🧪 Teste manual da API iniciado...');
            
            // Testar conectividade
            const conectividadeOk = await testarConectividade();
            
            if (conectividadeOk) {
                // Testar endpoint específico de proventos
                const url = CONFIG.getUrl(CONFIG.ENDPOINTS.PROVENTOS, `/${usuario.conta}`);
                // console.log('🧪 Testando endpoint de proventos:', url);
                
                const response = await $.ajax({
                    url: url,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${usuario.token}`
                    }
                });
                // console.log('📡 Resposta do endpoint de proventos:', response);
                
                showMessage('API funcionando! Verifique o console para detalhes.', 'success');
            } else {
                showMessage('Problema de conectividade detectado.', 'error');
            }
            
        } catch (error) {
            console.error('Erro no teste da API:', error);
            showMessage('Erro no teste da API. Verifique o console.', 'error');
        } finally {
            const btn = $('#testarAPI');
            btn.prop('disabled', false);
            btn.html('<i class="fas fa-bug"></i> Testar API');
        }
    });
    
    // Event listeners para filtros
    $(DOM.filtroStatus).change(aplicarFiltros);
    $(DOM.filtroTipo).change(aplicarFiltros);
    $(DOM.filtroMes).change(aplicarFiltros);
    
    // Definir mês atual no filtro
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    $(DOM.filtroMes).val(mesAtual);
    
    // Auto-refresh a cada 5 minutos
    setInterval(async () => {
        // console.log('🔄 Auto-refresh dos proventos...');
        await carregarDados();
    }, 5 * 60 * 1000);
    
    // console.log('✅ Event listeners configurados');
    }, 100); // Fechar setTimeout

});




