module.exports = {
  // Configurações do servidor
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  
  // Configurações do MongoDB
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/walletDatabase',
    options: {
      // Removed deprecated options useNewUrlParser and useUnifiedTopology
    }
  },
  
  // Configurações da API Yahoo Finance
  yahooFinance: {
    timeout: parseInt(process.env.YF_TIMEOUT) || 10000,
    retries: parseInt(process.env.YF_RETRIES) || 3
  },
  
  // Configurações de segurança JWT
  jwt: {
    secret: process.env.JWT_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET deve ser definido em produção');
      }
      return 'dev-fallback-secret-very-insecure';
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Configurações de sessão
  session: {
    secret: process.env.SESSION_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET deve ser definido em produção');
      }
      return 'dev-session-secret-very-insecure';
    })(),
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000
  },
  
  // Configurações de segurança
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutos
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // máximo 100 requests por janela
    }
  },
  
  // Configurações de cache
  cache: {
    timeout: parseInt(process.env.CACHE_TIMEOUT) || 10 * 60 * 1000 // 10 minutos
  }
};

// Validação de variáveis obrigatórias em produção
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'SESSION_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias não definidas: ${missingVars.join(', ')}`);
  }
}
