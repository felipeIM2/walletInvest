module.exports = {
  // Configurações do servidor
  server: {
    port: process.env.PORT || 3000,
    host: 'localhost'
  },
  
  // Configurações do MongoDB
  database: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://luisDev:luis13258@cluster0.jlcaw.mongodb.net/walletDatabase',
    options: {}
  },
  
  // Configurações da API Yahoo Finance
  yahooFinance: {
    timeout: 10000, // 10 segundos
    retries: 3
  },
  
  // Configurações de sessão
  session: {
    secret: process.env.SESSION_SECRET || 'walletInvest-secret-key',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  },
  
  // Configurações de segurança
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  }
};
