// Configuração do Frontend
const CONFIG = {
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
      this.API_BASE_URL = 'https://walletinvest.onrender.com';
    } else {
      this.API_BASE_URL = 'http://localhost:3000';
    }
    // console.log(`Ambiente configurado como: ${env}, URL: ${this.API_BASE_URL}`);
  }
};

// Detectar ambiente automaticamente de forma mais robusta
function detectEnvironment() {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // console.log('Detectando ambiente:', { hostname, protocol, port });
  
  // Se for localhost ou 127.0.0.1 (desenvolvimento local)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  }
  
  // Se for o domínio do Render (produção)
  if (hostname === 'walletinvest.onrender.com') {
    return 'production';
  }
  
  // Se for qualquer outro domínio (assumir produção)
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return 'production';
  }
  
  // Fallback para desenvolvimento
  return 'development';
}

// Aplicar ambiente detectado
const detectedEnv = detectEnvironment();
CONFIG.setEnvironment(detectedEnv);

// Exportar para uso global
window.CONFIG = CONFIG;
