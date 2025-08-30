const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const yf = require('yahoo-finance2').default;
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./db');
const config = require('../config');
const { AuthService, authenticateToken, requireAdmin } = require('./auth');

// Modelos do MongoDB
const Usuario = require('../models/Usuario');
const Acao = require('../models/Acao');
const Cotacao = require('../models/Cotacao');
const Provento = require('../models/Provento');
const Prospeccao = require('../models/Prospeccao');
const TokenAcesso = require('../models/TokenAcesso');

const app = express();
const PORT = config.server.port;

// Conectar ao MongoDB
connectDB();

// Rate limiting
const limiter = rateLimit({
    windowMs: config.security.rateLimit.windowMs,
    max: config.security.rateLimit.max,
    message: {
        error: 'Muitas tentativas. Tente novamente em alguns minutos.',
        retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting específico para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 tentativas de login por IP
    message: {
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    skipSuccessfulRequests: true
});

app.use('/api/login', loginLimiter);
app.use('/api', limiter);

app.use(cors(config.security.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '..')));
app.use('/pages', express.static(path.join(__dirname, '..', 'pages')));

// ===== FUNÇÃO PARA PROCESSAR PROVENTOS =====
const processarProventos = async (codigoAcao, dados, conta) => {
    try {
        // VALIDAÇÃO 1: Verificar se tem dividend yield
        if (!dados.dividendYield || dados.dividendYield <= 0) {
            return { success: false, reason: 'Sem dividend yield' };
        }
        
        // VALIDAÇÃO 2: Verificar se o preço é válido
        if (!dados.regularMarketPrice || isNaN(dados.regularMarketPrice)) {
            return { success: false, reason: 'Preço inválido' };
        }
        
        // VALIDAÇÃO 3: Buscar ação na carteira
        const acaoCarteira = await Acao.findOne({ conta, codigo: codigoAcao });
        const codigoSemSA = codigoAcao.replace('.SA', '');
        const acaoSemSA = await Acao.findOne({ conta, codigo: codigoSemSA });
        const acaoParaUsar = acaoCarteira || acaoSemSA;
        
        if (!acaoParaUsar) {
            return { success: false, reason: 'Ação não encontrada na carteira' };
        }
        
        // VALIDAÇÃO 4: Verificar quantidade na carteira
        if (!acaoParaUsar.quantidade || isNaN(acaoParaUsar.quantidade)) {
            return { success: false, reason: 'Quantidade inválida' };
        }
        
        // CALCULAR DIVIDENDOS
        const precoAtual = parseFloat(dados.regularMarketPrice);
        const dividendYield = parseFloat(dados.dividendYield) / 100;
        const valorAnual = precoAtual * dividendYield;
        const valorMensal = valorAnual / 12;
        const valorTotal = valorMensal * acaoParaUsar.quantidade;
        
        // VERIFICAR SE JÁ EXISTE PROVENTO
        const dataAtual = new Date();
        const mesAtual = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
        
        const proventoExistente = await Provento.findOne({
            conta,
            codigoAcao,
            dataPagamento: { $gte: mesAtual },
            tipo: 'Dividendo'
        });
        
        if (proventoExistente) {
            // Sincronização automática: se a quantidade mudou, atualize o provento
            if (proventoExistente.quantidadeAcoes !== acaoParaUsar.quantidade) {
                proventoExistente.quantidadeAcoes = acaoParaUsar.quantidade;
                proventoExistente.valorTotal = proventoExistente.valorPorAcao * acaoParaUsar.quantidade;
                await proventoExistente.save();
                return { success: true, updated: true, reason: 'Provento atualizado com nova quantidade', provento: proventoExistente };
            }
            return { success: true, updated: false, reason: 'Provento já existe', provento: proventoExistente };
        }
        
        // CRIAR NOVO PROVENTO
        const dadosProvento = {
            conta: parseInt(conta),
            codigoAcao: codigoAcao,
            tipo: 'Dividendo',
            dataBase: mesAtual,
            dataPagamento: mesAtual,
            valorPorAcao: parseFloat(valorMensal.toFixed(4)),
            quantidadeAcoes: parseInt(acaoParaUsar.quantidade),
            valorTotal: parseFloat(valorTotal.toFixed(2)),
            status: 'Aguardando'
        };
        
        // VALIDAÇÃO FINAL: Verificar se todos os campos são válidos
        if (isNaN(dadosProvento.valorPorAcao) || isNaN(dadosProvento.valorTotal)) {
            return { success: false, reason: 'Valores calculados inválidos' };
        }
        
        const novoProvento = new Provento(dadosProvento);
        const proventoSalvo = await novoProvento.save();
        
        return { success: true, provento: proventoSalvo };
        
    } catch (error) {
        return { success: false, reason: error.message };
    }
};

// Rota para validar usuário com token
app.post('/api/validar-usuario', async (req, res) => {
    try {
        const { login, conta, token } = req.body;
        
        if (!login || !conta || !token) {
            return res.status(400).json({ 
                valid: false, 
                message: 'Login, conta e token são obrigatórios' 
            });
        }
        
        // Validar token
        const isValidToken = await AuthService.validateToken(token, parseInt(conta));
        
        if (!isValidToken) {
            return res.status(401).json({ 
                valid: false, 
                message: 'Token inválido ou expirado' 
            });
        }
        
        // Buscar usuário no banco
        const usuario = await Usuario.findOne({ login, conta: parseInt(conta) });
        
        if (usuario) {
            res.json({ 
                valid: true, 
                usuario: {
                    login: usuario.login,
                    conta: usuario.conta,
                    acesso: usuario.acesso
                }
            });
        } else {
            res.status(401).json({ 
                valid: false, 
                message: 'Usuário não encontrado' 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            valid: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Rota de login com geração de token
app.post('/api/login', async (req, res) => {
    try {
        const { login, senha } = req.body;
        
        if (!login || !senha) {
            return res.status(400).json({ 
                success: false, 
                message: 'Login e senha são obrigatórios' 
            });
        }
        
        // Buscar usuário pelo login
        const usuario = await Usuario.findOne({ login });
        
        if (usuario && await usuario.comparePassword(senha)) {
            // Gerar token de acesso
            const token = await AuthService.createOrUpdateToken(usuario.conta);
            
            res.json({ 
                success: true, 
                usuario: {
                    login: usuario.login,
                    conta: usuario.conta,
                    acesso: usuario.acesso
                },
                token
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: 'Usuário ou senha incorretos' 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Rota para logout - revogar token
app.post('/api/logout', authenticateToken, async (req, res) => {
    try {
        await AuthService.revokeToken(req.user.conta);
        res.json({ success: true, message: 'Logout realizado com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao fazer logout' });
    }
});

// Rota para buscar ações da carteira com cache
app.get('/api/carteira/:conta', authenticateToken, async (req, res) => {
    try {
        const conta = parseInt(req.params.conta);
        console.log('💼 Buscando carteira para conta:', conta);
        
        // Verificar cache primeiro
        const cachedData = AuthService.getFromCache(conta, 'carteira');
        if (cachedData) {
            console.log('📋 Dados encontrados no cache para conta:', conta, '- itens:', cachedData.length);
            return res.json({ acoes: cachedData, fromCache: true });
        }
        
        // Buscar do banco se não estiver em cache
        console.log('📊 Buscando dados do banco para conta:', conta);
        
        try {
            const acoes = await Acao.find({ conta });
            console.log('✅ Encontradas', acoes.length, 'ações para conta:', conta);
            
            // Salvar no cache
            AuthService.setCache(conta, acoes, 'carteira');
            
            res.json({ acoes, fromCache: false });
        } catch (dbError) {
            console.error('❌ Erro de banco de dados:', dbError.message);
            
            // Se o banco não estiver disponível, retornar array vazio
            console.log('⚠️ Banco indisponível, retornando carteira vazia');
            res.json({ 
                acoes: [], 
                fromCache: false, 
                error: 'Banco de dados indisponível',
                message: 'Conecte-se ao MongoDB para ver suas ações'
            });
        }
        
    } catch (error) {
        console.error('💥 Erro ao buscar carteira:', error);
        res.status(500).json({ 
            erro: 'Erro ao buscar carteira',
            details: error.message 
        });
    }
});

// Rota para adicionar ação
app.post('/api/acao', authenticateToken, async (req, res) => {
    try {
        const { conta, categoria, codigo, valor, quantidade } = req.body;
        
        // Validar e converter dados
        const contaNum = parseInt(conta);
        const valorNum = parseFloat(valor);
        const quantidadeNum = parseInt(quantidade);
        
        // Validar dados obrigatórios
        if (!contaNum || !categoria || !codigo || isNaN(valorNum) || isNaN(quantidadeNum)) {
            return res.status(400).json({ erro: 'Dados obrigatórios ausentes ou inválidos' });
        }
        
        if (valorNum <= 0 || quantidadeNum <= 0) {
            return res.status(400).json({ erro: 'Valor e quantidade devem ser maiores que zero' });
        }
        
        // Verificar se já existe ação com mesmo código para a conta
        const acaoExistente = await Acao.findOne({ conta: contaNum, codigo });
        
        if (acaoExistente) {
            // Atualizar quantidade e calcular preço médio
            const novaQuantidade = acaoExistente.quantidade + quantidadeNum;
            const novoValor = ((acaoExistente.valor * acaoExistente.quantidade) + (valorNum * quantidadeNum)) / novaQuantidade;
            acaoExistente.quantidade = novaQuantidade;
            acaoExistente.valor = novoValor;
            
            // Executar operações em paralelo
            const [acaoSalva] = await Promise.all([
                acaoExistente.save(),
                // Sincronizar proventos de forma otimizada
                Provento.updateMany(
                    { conta: contaNum, codigoAcao: codigo },
                    { 
                        quantidadeAcoes: novaQuantidade,
                        $mul: { valorPorAcao: 1 } // Trigger recalculation
                    }
                ).then(() => {
                    // Atualizar valorTotal corretamente
                    return Provento.updateMany(
                        { conta: contaNum, codigoAcao: codigo },
                        [{ $set: { valorTotal: { $multiply: ['$valorPorAcao', novaQuantidade] } } }]
                    );
                })
            ]);
            
            // Limpar cache da carteira
            AuthService.clearUserCache(contaNum);
            
            res.json(acaoSalva);
        } else {
            // Criar nova ação
            const dadosAcao = { 
                conta: contaNum, 
                categoria, 
                codigo, 
                valor: valorNum, 
                quantidade: quantidadeNum 
            };
            
            const novaAcao = new Acao(dadosAcao);
            await novaAcao.save();
            
            // Sincronizar proventos existentes (se houver)
            await Provento.updateMany(
                { conta: contaNum, codigoAcao: codigo },
                [{ 
                    $set: { 
                        quantidadeAcoes: quantidadeNum,
                        valorTotal: { $multiply: ['$valorPorAcao', quantidadeNum] }
                    } 
                }]
            );
            
            // Limpar cache da carteira
            AuthService.clearUserCache(contaNum);
            
            res.json(novaAcao);
        }
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao adicionar ação: ' + error.message });
    }
});

// Rota para buscar ação específica por ID
app.get('/api/acao/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const acao = await Acao.findById(id);
        
        if (!acao) {
            return res.status(404).json({ erro: 'Ação não encontrada' });
        }
        
        res.json(acao);
    } catch (error) {
        console.error('Erro ao buscar ação:', error);
        res.status(500).json({ erro: 'Erro ao buscar ação' });
    }
});

// Rota para atualizar ação
app.put('/api/acao/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { quantidade, valor } = req.body;
        
        // Buscar ação existente
        const acao = await Acao.findById(id);
        if (!acao) {
            return res.status(404).json({ erro: 'Ação não encontrada' });
        }
        
        // Atualizar campos
        if (quantidade !== undefined) acao.quantidade = quantidade;
        if (valor !== undefined) acao.valor = valor;
        
        // Executar operações em paralelo
        const operacoes = [acao.save()];
        
        // Sincronizar proventos com nova quantidade se necessário
        if (quantidade !== undefined) {
            operacoes.push(
                Provento.updateMany(
                    { conta: acao.conta, codigoAcao: acao.codigo },
                    [{ 
                        $set: { 
                            quantidadeAcoes: quantidade,
                            valorTotal: { $multiply: ['$valorPorAcao', quantidade] }
                        } 
                    }]
                )
            );
        }
        
        // Limpar cache da carteira
        AuthService.clearUserCache(acao.conta);
        
        const [acaoSalva] = await Promise.all(operacoes);
        res.json(acaoSalva);
    } catch (error) {
        console.error('Erro ao atualizar ação:', error.message);
        res.status(500).json({ erro: 'Erro ao atualizar ação' });
    }
});

// Rota para excluir ação
app.delete('/api/acao/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Buscar ação antes de excluir
        const acao = await Acao.findById(id);
        if (acao) {
            // Limpar cache da carteira
            AuthService.clearUserCache(acao.conta);
            
            // Excluir proventos relacionados - verificar tanto com .SA quanto sem .SA
            const codigoComSA = acao.codigo.endsWith('.SA') ? acao.codigo : acao.codigo + '.SA';
            const codigoSemSA = acao.codigo.replace('.SA', '');
            
            await Promise.all([
                Provento.deleteMany({ conta: acao.conta, codigoAcao: acao.codigo }),
                Provento.deleteMany({ conta: acao.conta, codigoAcao: codigoComSA }),
                Provento.deleteMany({ conta: acao.conta, codigoAcao: codigoSemSA })
            ]);
        }
        await Acao.findByIdAndDelete(id);
        res.json({ success: true, message: 'Ação excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir ação:', error);
        res.status(500).json({ erro: 'Erro ao excluir ação' });
    }
});

// Rota para buscar cotações com cache e atualização
app.post('/api/buscarAcoes', authenticateToken, async (req, res) => {
    const acoes = req.body.acoes;
    const conta = req.body.conta;

    if (!Array.isArray(acoes) || acoes.length === 0) {
        return res.status(400).json({ erro: 'Envie uma lista de ações válida' });
    }

    const resultados = [];
    const resultadosProventos = [];
    
    // Limpar cache da carteira após buscar cotações (dados atualizados)
    AuthService.clearUserCache(conta);

    // console.log(`\n🚀 INICIANDO BUSCA DE PREÇOS PARA ${acoes.length} AÇÕES`);
    // console.log(`📋 Ações: ${acoes.join(', ')}`);
    // console.log(`🏦 Conta: ${conta}`);

    for (const codigoAcao of acoes) {
        try {
            // console.log(`\n📊 PROCESSANDO: ${codigoAcao}`);
            
            // VALIDAÇÃO 1: BUSCAR PREÇOS (COTAÇÕES)
            // console.log(`📈 VALIDAÇÃO 1: Buscando cotação para ${codigoAcao}`);
            const dados = await yf.quote(codigoAcao);
            
            const cotacao = await Cotacao.findOneAndUpdate(
                { codigo: codigoAcao },
                {
                    conta,
                    nome: dados.symbol,
                    moeda: dados.currency,
                    preco: dados.regularMarketPrice,
                    dividendYield: dados.dividendYield
                },
                { upsert: true, new: true }
            );

            // console.log(`✅ Cotação processada: ${dados.symbol} - R$ ${dados.regularMarketPrice}`);
            resultados.push(cotacao);
            
            // VALIDAÇÃO 2: PROCESSAR PROVENTOS
            const resultadoProventos = await processarProventos(codigoAcao, dados, conta);
            resultadosProventos.push({
                codigo: codigoAcao,
                resultado: resultadoProventos
            });
            
        } catch (error) {
            resultadosProventos.push({
                codigo: codigoAcao,
                resultado: { success: false, reason: error.message }
            });
        }
    }

    // console.log(`\n🎯 RESUMO FINAL:`);
    // console.log(`📊 Cotações processadas: ${resultados.length}`);
    // console.log(`💰 Proventos processados: ${resultadosProventos.length}`);
    
    resultadosProventos.forEach(r => {
        if (r.resultado.success) {
            // console.log(`✅ ${r.codigo}: ${r.resultado.reason || 'Sucesso'}`);
        } else {
            // console.log(`❌ ${r.codigo}: ${r.resultado.reason}`);
        }
    });

    res.json({ 
        acoes: resultados,
        proventos: resultadosProventos
    });
});

// Rota para buscar cotação específica
app.get('/api/cotacao/:codigo', authenticateToken, async (req, res) => {
    try {
        const { codigo } = req.params;
        const cotacao = await Cotacao.findOne({ codigo });
        
        if (cotacao) {
            res.json({ success: true, cotacao });
        } else {
            res.json({ success: false, message: 'Cotação não encontrada' });
        }
    } catch (error) {
        console.error('Erro ao buscar cotação:', error);
        res.status(500).json({ erro: 'Erro ao buscar cotação' });
    }
});

// Rota para buscar cotações de uma conta
app.get('/api/cotacoes/:conta', authenticateToken, async (req, res) => {
    try {
        const { conta } = req.params;
        console.log('📊 Buscando cotações para conta:', conta);
        
        try {
            const cotacoes = await Cotacao.find({ conta: parseInt(conta) });
            console.log('✅ Encontradas', cotacoes.length, 'cotações para conta:', conta);
            res.json(cotacoes);
        } catch (dbError) {
            console.error('❌ Erro de banco de dados ao buscar cotações:', dbError.message);
            console.log('⚠️ Banco indisponível, retornando cotações vazias');
            res.json([]);
        }
    } catch (error) {
        console.error('💥 Erro ao buscar cotações:', error);
        res.status(500).json({ erro: 'Erro ao buscar cotações' });
    }
});

// Rota para aplicar rateio
app.post('/api/rateio', authenticateToken, async (req, res) => {
    try {
        const { conta, alocacoes } = req.body;
        
        for (const alocacao of alocacoes) {
            const { codigo, categoria, valor, quantidade } = alocacao;
            
            // Verificar se já existe ação
            const acaoExistente = await Acao.findOne({ conta, codigo });
            
            if (acaoExistente) {
                // Atualizar quantidade e calcular preço médio
                const novaQuantidade = acaoExistente.quantidade + quantidade;
                const novoValor = ((acaoExistente.valor * acaoExistente.quantidade) + (valor * quantidade)) / novaQuantidade;
                
                acaoExistente.quantidade = novaQuantidade;
                acaoExistente.valor = novoValor;
                await acaoExistente.save();
            } else {
                // Criar nova ação
                const novaAcao = new Acao({ conta, categoria, codigo, valor, quantidade });
                await novaAcao.save();
            }
        }
        
        // Limpar cache da carteira após rateio
        AuthService.clearUserCache(conta);
        
        res.json({ success: true, message: 'Rateio aplicado com sucesso' });
    } catch (error) {
        console.error('Erro ao aplicar rateio:', error);
        res.status(500).json({ erro: 'Erro ao aplicar rateio' });
    }
});

// Rota para buscar usuários (REMOVIDA POR SEGURANÇA)
// Esta rota foi removida para evitar exposição de dados sensíveis
// Use a rota administrativa protegida se necessário

// Rota administrativa para buscar usuários (apenas admin)
app.get('/api/admin/usuarios', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const usuarios = await Usuario.find({}).select('-senha');
        res.json({ usuarios });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar usuários' });
    }
});

// Rota para criar novo usuário (apenas admin)
app.post('/api/usuarios', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { login, senha } = req.body;
        
        // Validar dados obrigatórios
        if (!login || !senha) {
            return res.status(400).json({ erro: 'Login e senha são obrigatórios' });
        }
        
        // Verificar se usuário já existe
        const usuarioExistente = await Usuario.findOne({ login });
        if (usuarioExistente) {
            return res.status(400).json({ erro: 'Usuário já existe' });
        }
        
        // Encontrar próximo número de conta
        const ultimoUsuario = await Usuario.findOne().sort({ conta: -1 });
        const proximaConta = ultimoUsuario ? ultimoUsuario.conta + 1 : 1;
        
        // Criar novo usuário
        const novoUsuario = new Usuario({
            login,
            senha,
            acesso: 1,
            conta: proximaConta
        });
        
        await novoUsuario.save();
        
        // Retornar usuário sem senha
        const { senha: _, ...usuarioResponse } = novoUsuario.toObject();
        res.json({ success: true, usuario: usuarioResponse });
        
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ erro: 'Erro ao criar usuário' });
    }
});

// Rota para excluir usuário (apenas admin com confirmação de senha)
app.delete('/api/usuarios/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { adminLogin, adminSenha } = req.body;
        
        // Validar credenciais do admin
        const admin = await Usuario.findOne({ login: adminLogin, conta: 1 });
        if (!admin || !(await admin.comparePassword(adminSenha))) {
            return res.status(401).json({ erro: 'Credenciais de administrador inválidas' });
        }
        
        // Buscar usuário a ser excluído
        const usuario = await Usuario.findById(id);
        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }
        
        // Não permitir exclusão do próprio admin
        if (usuario.conta === 1) {
            return res.status(400).json({ erro: 'Não é possível excluir o usuário administrador' });
        }
        
        const contaUsuario = usuario.conta;
        
        // Excluir todos os dados relacionados à conta do usuário
        await Promise.all([
            Acao.deleteMany({ conta: contaUsuario }),
            Cotacao.deleteMany({ conta: contaUsuario }),
            Provento.deleteMany({ conta: contaUsuario }),
            Prospeccao.deleteMany({ conta: contaUsuario }),
            Usuario.deleteOne({ _id: id })
        ]);
        
        res.json({ success: true, message: 'Usuário e todos os dados relacionados foram excluídos' });
        
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ erro: 'Erro ao excluir usuário' });
    }
});

// ===== ROTAS DE PROVENTOS =====

// Rota para buscar proventos de uma conta
app.get('/api/proventos/:conta', authenticateToken, async (req, res) => {
    try {
        const { conta } = req.params;
        const proventos = await Provento.find({ conta: parseInt(conta) })
            .sort({ dataPagamento: 1 });
        res.json({ proventos });
    } catch (error) {
        console.error('Erro ao buscar proventos:', error);
        res.status(500).json({ error: 'Erro ao buscar proventos' });
    }
});

// Rota para adicionar provento
app.post('/api/proventos', authenticateToken, async (req, res) => {
    try {
        const provento = new Provento(req.body);
        provento.valorTotal = provento.valorPorAcao * provento.quantidadeAcoes;
        await provento.save();
        res.json({ success: true, provento });
    } catch (error) {
        console.error('Erro ao salvar provento:', error);
        res.status(500).json({ error: 'Erro ao salvar provento' });
    }
});

// Rota para atualizar status do provento
app.patch('/api/proventos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const provento = await Provento.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );
        res.json({ success: true, provento });
    } catch (error) {
        console.error('Erro ao atualizar provento:', error);
        res.status(500).json({ error: 'Erro ao atualizar provento' });
    }
});

// Rota para buscar proventos de uma ação específica
app.get('/api/proventos/:conta/:codigo', authenticateToken, async (req, res) => {
    try {
        const { conta, codigo } = req.params;
        const proventos = await Provento.find({ 
            conta: parseInt(conta), 
            codigoAcao: codigo 
        }).sort({ dataPagamento: 1 });
        res.json({ proventos });
    } catch (error) {
        console.error('Erro ao buscar proventos da ação:', error);
        res.status(500).json({ error: 'Erro ao buscar proventos da ação' });
    }
});

// Rota para excluir provento
app.delete('/api/proventos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await Provento.findByIdAndDelete(id);
        res.json({ success: true, message: 'Provento excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir provento:', error);
        res.status(500).json({ error: 'Erro ao excluir provento' });
    }
});

// Rota para buscar dividendos históricos de uma ação
app.get('/api/dividendos/:codigo', authenticateToken, async (req, res) => {
    try {
        const { codigo } = req.params;
        
        // Tentar buscar dados históricos de dividendos
        let dividendData = [];
        
        try {
            // Método 1: Tentar buscar dados históricos com eventos de dividendos
            dividendData = await yf.historical(codigo, {
                period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Último ano
                period2: new Date(),
                events: 'dividends'
            });
        } catch (error) {
            // console.log(`Método 1 falhou para ${codigo}, tentando método alternativo...`);
            
            try {
                // Método 2: Buscar dados básicos e calcular dividendos estimados
                const quoteData = await yf.quote(codigo);
                if (quoteData.dividendYield && quoteData.dividendYield > 0) {
                    const precoAtual = quoteData.regularMarketPrice;
                    const dividendYield = quoteData.dividendYield / 100;
                    const valorAnual = precoAtual * dividendYield;
                    
                    // Criar dados simulados de dividendos mensais
                    const hoje = new Date();
                    for (let i = 0; i < 12; i++) {
                        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                        dividendData.push({
                            date: data,
                            amount: valorAnual / 12,
                            type: 'estimated'
                        });
                    }
                }
            } catch (error2) {
                // console.log(`Método 2 também falhou para ${codigo}`);
            }
        }
        
        res.json({ 
            success: true, 
            dividendos: dividendData,
            codigo: codigo
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar dividendos' });
    }
});

// Rotas de debug removidas por segurança

// ===== ROTAS DA API DE PROSPECÇÃO =====

// Rota para buscar ações da prospecção
app.get('/api/prospeccao/:conta', authenticateToken, async (req, res) => {
    try {
        const { conta } = req.params;
        const prospeccoes = await Prospeccao.find({ conta: parseInt(conta) });
        res.json({ prospecções });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar prospecção' });
    }
});

// Rota para adicionar ação na prospecção
app.post('/api/prospeccao', authenticateToken, async (req, res) => {
    try {
        const prospeccao = new Prospeccao(req.body);
        await prospeccao.save();
        res.json({ success: true, prospeccao });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar prospecção' });
    }
});

// Rota para buscar uma prospecção específica
app.get('/api/prospeccao/item/:id', authenticateToken, async (req, res) => {
    try {
        const prospeccao = await Prospeccao.findById(req.params.id);
        if (!prospeccao) {
            return res.status(404).json({ error: 'Prospecção não encontrada' });
        }
        res.json(prospeccao);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar prospecção' });
    }
});

// Rota para excluir prospecção
app.delete('/api/prospeccao/:id', authenticateToken, async (req, res) => {
    try {
        await Prospeccao.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Prospecção excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir prospecção' });
    }
});

// Rota para mover prospecção para carteira
app.post('/api/prospeccao/:id/mover-para-carteira', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { valor, quantidade } = req.body;
        
        // Buscar a prospecção
        const prospeccao = await Prospeccao.findById(id);
        if (!prospeccao) {
            return res.status(404).json({ error: 'Prospecção não encontrada' });
        }
        
        // Criar nova ação na carteira
        const novaAcao = new Acao({
            conta: prospeccao.conta,
            categoria: prospeccao.categoria,
            codigo: prospeccao.codigo,
            valor: parseFloat(valor),
            quantidade: parseInt(quantidade)
        });
        
        await novaAcao.save();
        
        // Remover da prospecção
        await Prospeccao.findByIdAndDelete(id);
        
        // Limpar cache da carteira
        AuthService.clearUserCache(prospeccao.conta);
        
        res.json({ 
            success: true, 
            message: 'Ação movida para carteira com sucesso',
            acao: novaAcao 
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Erro ao mover prospecção para carteira' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Sistema de proventos automáticos ativado`);
});