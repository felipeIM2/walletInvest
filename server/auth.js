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
                console.log('❌ Token decodificado inválido');
                return false;
            }
            
            // Verificar se a conta no token corresponde à conta solicitada
            const contaValida = decoded.conta === conta;
            
            if (!contaValida) {
                console.log(`❌ Conta no token (${decoded.conta}) não corresponde à conta solicitada (${conta})`);
                return false;
            }
            
            // Validar no banco para todas as contas
            try {
                const tokenRecord = await TokenAcesso.findOne({ 
                    conta, 
                    token,
                    expiresAt: { $gt: new Date() }
                });
                
                if (tokenRecord) {
                    console.log(`✅ Token válido para conta ${conta}`);
                    return true;
                } else {
                    console.log(`❌ Token para conta ${conta} não encontrado ou expirado`);
                    return false;
                }
            } catch (dbError) {
                console.error(`❌ Erro de banco de dados ao validar token para conta ${conta}:`, dbError.message);
                console.log(`⚠️ Banco indisponível para conta ${conta}, negando acesso`);
                return false;
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
        
        if (!conta && conta !== 0) {
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
                // Para outras rotas (como /api/admin/usuarios), extrair conta do token
                console.log('🔍 Rota sem conta nos parâmetros, extraindo do token');
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

// Middleware para verificar se pode listar usuários (apenas conta 1 = admin)
const requireUserList = async (req, res, next) => {
    try {
        console.log('🔍 RequireUserList middleware - req.user:', req.user);
        console.log('🔍 Headers:', req.headers.authorization ? 'Token presente' : 'Sem token');
        
        if (!req.user) {
            console.log('❌ req.user é undefined - usuário não passou pelo authenticateToken');
            return res.status(403).json({ error: 'Usuário não autenticado' });
        }
        
        console.log(`🔍 Verificando conta: ${req.user.conta} (tipo: ${typeof req.user.conta})`);
        
        if (req.user.conta !== 1) {
            console.log(`❌ Usuário não tem conta 1 - conta atual: ${req.user.conta}`);
            return res.status(403).json({ 
                error: 'Acesso negado. Apenas administradores (conta 1) podem acessar esta função.',
                currentAccount: req.user.conta,
                requiredAccount: 1
            });
        }
        
        // Se chegou aqui, tem conta 1 e o token já foi validado pelo authenticateToken
        // Conta 1 = admin, apenas com token válido no banco
        console.log('✅ Usuário tem conta 1 e token válido - administrador');
        next();
        
    } catch (error) {
        console.error('💥 Erro no requireUserList middleware:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = {
    AuthService,
    authenticateToken,
    requireAdmin,
    requireUserList
};