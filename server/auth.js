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
            
            // Verificar se o token existe no banco e não expirou
            const tokenRecord = await TokenAcesso.findOne({ 
                conta, 
                token,
                expiresAt: { $gt: new Date() }
            });
            
            return !!tokenRecord && decoded.conta === conta;
        } catch (error) {
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
        
        if (!token) {
            return res.status(401).json({ error: 'Token de acesso requerido' });
        }

        // Extrair conta do body ou params
        const conta = req.body.conta || req.params.conta;
        
        if (!conta) {
            return res.status(400).json({ error: 'Conta não informada' });
        }

        const isValid = await AuthService.validateToken(token, parseInt(conta));
        
        if (!isValid) {
            return res.status(401).json({ error: 'Token inválido ou expirado' });
        }

        req.user = { conta: parseInt(conta) };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Falha na autenticação' });
    }
};

// Middleware para verificar se é admin (conta 1)
const requireAdmin = async (req, res, next) => {
    if (req.user && req.user.conta === 1) {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta função.' });
    }
};

module.exports = {
    AuthService,
    authenticateToken,
    requireAdmin
};