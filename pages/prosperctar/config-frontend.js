// Configuração do Frontend - Prospecção
const CONFIG = {
  // URLs das rotas da API
  ENDPOINTS: {
    LOGIN: '/api/login',
    VALIDAR_USUARIO: '/api/validar-usuario',
    CARTEIRA: '/api/carteira',
    ACAO: '/api/acao',
    COTACAO: '/api/cotacao',
    COTACOES: '/api/cotacoes',
    PROSPECCAO: '/api/prospeccao',
    PROSPECCAO_ITEM: '/api/prospeccao/item',
    MOVER_PARA_CARTEIRA: '/api/prospeccao',
    BUSCAR_ACOES: '/api/buscarAcoes'
  },
  
  // Função para construir URLs completas
  getUrl: function(endpoint, params = '') {
    return `${this.API_BASE_URL}${endpoint}${params}`;
  },
  
  // Função para alternar entre desenvolvimento e produção
  setEnvironment: function(env) {
    if (env === 'production') {
      this.API_BASE_URL = 'https://walletinvest.onrender.com';
    } else {
      this.API_BASE_URL = 'http://localhost:3000';
    }
  }
};

// Detectar ambiente automaticamente
function detectEnvironment() {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  }
  
  if (hostname === 'walletinvest.onrender.com') {
    return 'production';
  }
  
  return 'production';
}

// Aplicar ambiente detectado
const detectedEnv = detectEnvironment();
CONFIG.setEnvironment(detectedEnv);

// Exportar para uso global
window.CONFIG = CONFIG;