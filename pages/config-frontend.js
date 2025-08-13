// Configuração do Frontend
const CONFIG = {
  // URL base da API
  API_BASE_URL: 'http://localhost:3000',
  
  // URLs das rotas da API
  ENDPOINTS: {
    LOGIN: '/api/login',
    CARTEIRA: '/api/carteira',
    ACAO: '/api/acao',
    COTACAO: '/api/cotacao',
    COTACOES: '/api/cotacoes',
    RATEIO: '/api/rateio',
    BUSCAR_ACOES: '/api/buscarAcoes',
    USUARIOS: '/api/usuarios'
  },
  
  // Função para construir URLs completas
  getUrl: function(endpoint, params = '') {
    return `${this.API_BASE_URL}${endpoint}${params}`;
  },
  
  // Função para alternar entre desenvolvimento e produção
  setEnvironment: function(env) {
    if (env === 'production') {
      this.API_BASE_URL = 'https://walletinvest.onrender.com'; // Altere para sua URL de produção
    } else {
      this.API_BASE_URL = 'http://localhost:3000';
    }
  }
};

// Detectar ambiente automaticamente
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  CONFIG.setEnvironment('development');
} else {
  CONFIG.setEnvironment('production');
}

// Exportar para uso global
window.CONFIG = CONFIG;
