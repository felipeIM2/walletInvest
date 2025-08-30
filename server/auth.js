const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const TokenAcesso = require('../models/TokenAcesso');
const Usuario = require('../models/Usuario');

// Cache em memória para dados da carteira
const cacheCarteira = new Map();
const CACHE_TIMEOUT = 10 * 60 * 1000; // 10 minutos

class AuthService {
    static generateToken(conta) {
        const payload = {
            conta,
            timestamp: Date.now(),
            random: crypto.randomBytes(16).toString('hex')
        };
        
        return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-key', {
            expiresIn: '24h'
        });
    }

    static async createOrUpdateToken(conta) {
        const token = this.generateToken(conta);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
        
        await TokenAcesso.findOneAndUpdate(
            { conta },
            { token, expiresAt, createdAt: new Date() },
            { upsert: true, new: true }
        );
        
        return token;
    }

    static async validateToken(token, conta) {
        try {
            // Verificar se o token é válido no JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
            
            // Verificar se o decoded tem a estrutura esperada
            if (!decoded || typeof decoded !== 'object') {
                return false;
            }
            
            // Verificar se a conta no token corresponde à conta solicitada primeiro (mais rápido)
            const contaValida = decoded.conta === conta;
            
            if (!contaValida) {
                return false;
            }
            
            // Verificar se o token existe no banco e não expirou
            try {
                const tokenRecord = await TokenAcesso.findOne({ 
                    conta, 
                    token,
                    expiresAt: { $gt: new Date() }
                });
                
                if (tokenRecord) {
                    return true;
                } else {
                    return false;
                }
            } catch (dbError) {
                console.error('❌ Erro de banco de dados ao validar token:', dbError.message);
                // Se o banco não estiver disponível, pelo menos validar o JWT
                console.log('⚠️ Banco indisponível, validando apenas JWT');
                return true; // Permitir acesso baseado apenas no JWT quando DB não está disponível
            }
            
        } catch (jwtError) {
            console.error('❌ Erro na validação do JWT:', jwtError.message);
            return false;
        }
    }

    static async revokeToken(conta) {
        await TokenAcesso.deleteOne({ conta });
        // Limpar cache da carteira do usuário
        this.clearUserCache(conta);
    }

    // Sistema de cache para carteira
    static getCacheKey(conta, type = 'carteira') {
        return `${type}_${conta}`;
    }

    static getFromCache(conta, type = 'carteira') {
        const key = this.getCacheKey(conta, type);
        const cached = cacheCarteira.get(key);
        
        if (cached && (Date.now() - cached.timestamp) < CACHE_TIMEOUT) {
            return cached.data;
        }
        
        return null;
    }

    static setCache(conta, data, type = 'carteira') {
        const key = this.getCacheKey(conta, type);
        cacheCarteira.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    static clearUserCache(conta) {
        const keys = Array.from(cacheCarteira.keys()).filter(key => key.includes(`_${conta}`));
        keys.forEach(key => cacheCarteira.delete(key));
    }

    static clearAllCache() {
        cacheCarteira.clear();
    }
}

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        console.log('🔍 Auth middleware iniciado para:', req.method, req.path);
        
        if (!token) {
            console.log('🚫 Token não fornecido');
            return res.status(401).json({ error: 'Token de acesso requerido' });
        }

        // Extrair conta do body ou params
        let conta;
        try {
            conta = req.body?.conta || req.params?.conta;
        } catch (extractError) {
            console.error('💥 Erro ao extrair conta:', extractError);
            return res.status(500).json({ error: 'Erro interno ao processar solicitação' });
        }
        console.log('🔍 Middleware auth - conta:', conta, 'método:', req.method, 'rota:', req.path);
        
        if (!conta) {
            // Para rotas que não têm conta diretamente (como /api/acao/:id), 
            // validamos apenas o token e deixamos a validação de permissão para o endpoint
            console.log('🔍 Testando rota de ação:', req.path);
            const isActionRoute = req.path.match(/^\/api\/acao\/[a-fA-F0-9]{24}$/);
            console.log('🔍 Rota de ação detectada:', !!isActionRoute);
            
            if (isActionRoute) {
                console.log('🔍 Rota de ação sem conta direta, validando apenas token');
                
                // Decodificar o token para obter a conta
                try {
                    const jwt = require('jsonwebtoken');
                    const config = require('../config');
                    const decoded = jwt.verify(token, config.jwt.secret);
                    conta = decoded.conta;
                    console.log('🔍 Conta extraída do token:', conta);
                } catch (jwtError) {
                    console.error('❌ Erro ao decodificar token:', jwtError.message);
                    return res.status(401).json({ error: 'Token inválido' });
                }
            } else {
                console.log('🚫 Conta não informada - body:', req.body, 'params:', req.params);
                return res.status(400).json({ error: 'Conta não informada' });
            }
        }

        let isValid;
        try {
            isValid = await AuthService.validateToken(token, parseInt(conta));
        } catch (validateError) {
            console.error('💥 Erro durante validação do token:', validateError);
            isValid = false;
        }
        
        if (!isValid) {
            console.log('🚫 Token inválido para conta:', conta);
            return res.status(401).json({ error: 'Token inválido ou expirado' });
        }

        console.log('✅ Autenticação bem-sucedida para conta:', conta);
        req.user = { conta: parseInt(conta) };
        next();
    } catch (error) {
        console.error('💥 Erro no middleware de autenticação:', error);
        console.error('💥 Stack trace:', error.stack);
        return res.status(401).json({ error: 'Falha na autenticação: ' + error.message });
    }
};

// Middleware para verificar se é admin (conta 1)
const requireAdmin = async (req, res, next) => {
    try {
        console.log('🔍 RequireAdmin middleware - req.user:', req.user);
        
        if (!req.user) {
            console.log('❌ req.user é undefined');
            return res.status(403).json({ error: 'Usuário não autenticado' });
        }
        
        if (!req.user.conta) {
            console.log('❌ req.user.conta é undefined');
            return res.status(403).json({ error: 'Conta do usuário não definida' });
        }
        
        if (req.user.conta === 1) {
            console.log('✅ Usuário é admin');
            next();
        } else {
            console.log('❌ Usuário não é admin - conta:', req.user.conta);
            res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta função.' });
        }
    } catch (error) {
        console.error('💥 Erro no requireAdmin middleware:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = {
    AuthService,
    authenticateToken,
    requireAdmin
};