const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const yf = require('yahoo-finance2').default;
const path = require('path');
const connectDB = require('./db');
const config = require('../config');

// Modelos do MongoDB
const Usuario = require('../models/Usuario');
const Acao = require('../models/Acao');
const Cotacao = require('../models/Cotacao');
const Provento = require('../models/Provento');

const app = express();
const PORT = config.server.port;

// Conectar ao MongoDB
connectDB();

app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:3000', 'http://localhost:3000', 'https://walletinvest.onrender.com'],
  credentials: true
}));
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '..')));
app.use('/pages', express.static(path.join(__dirname, '..', 'pages')));

// ===== FUNÇÃO PARA PROCESSAR PROVENTOS =====
const processarProventos = async (codigoAcao, dados, conta) => {
    // console.log(`\n💰 PROCESSANDO PROVENTOS PARA ${codigoAcao}`);
    
    try {
        // VALIDAÇÃO 1: Verificar se tem dividend yield
        if (!dados.dividendYield || dados.dividendYield <= 0) {
            // console.log(`⚠️ ${codigoAcao} não possui dividend yield ou é 0`);
            return { success: false, reason: 'Sem dividend yield' };
        }
        
        // VALIDAÇÃO 2: Verificar se o preço é válido
        if (!dados.regularMarketPrice || isNaN(dados.regularMarketPrice)) {
            // console.log(`❌ Preço inválido para ${codigoAcao}: ${dados.regularMarketPrice}`);
            return { success: false, reason: 'Preço inválido' };
        }
        
        // console.log(`📊 Dados válidos: Preço R$ ${dados.regularMarketPrice}, Dividend Yield ${dados.dividendYield}%`);
        
        // VALIDAÇÃO 3: Buscar ação na carteira
        const acaoCarteira = await Acao.findOne({ conta, codigo: codigoAcao });
        const codigoSemSA = codigoAcao.replace('.SA', '');
        const acaoSemSA = await Acao.findOne({ conta, codigo: codigoSemSA });
        const acaoParaUsar = acaoCarteira || acaoSemSA;
        
        // console.log(`🔍 Busca na carteira:`);
        // console.log(`  - Com .SA (${codigoAcao}): ${acaoCarteira ? 'Encontrada' : 'Não encontrada'}`);
        // console.log(`  - Sem .SA (${codigoSemSA}): ${acaoSemSA ? 'Encontrada' : 'Não encontrada'}`);
        
        if (!acaoParaUsar) {
            // console.log(`❌ Ação ${codigoAcao} não encontrada na carteira da conta ${conta}`);
            return { success: false, reason: 'Ação não encontrada na carteira' };
        }
        
        // VALIDAÇÃO 4: Verificar quantidade na carteira
        if (!acaoParaUsar.quantidade || isNaN(acaoParaUsar.quantidade)) {
            // console.log(`❌ Quantidade inválida na carteira para ${codigoAcao}: ${acaoParaUsar.quantidade}`);
            return { success: false, reason: 'Quantidade inválida' };
        }
        
        // console.log(`✅ Ação encontrada: ${acaoParaUsar.codigo} com ${acaoParaUsar.quantidade} ações`);
        
        // CALCULAR DIVIDENDOS
        const precoAtual = parseFloat(dados.regularMarketPrice);
        const dividendYield = parseFloat(dados.dividendYield) / 100;
        const valorAnual = precoAtual * dividendYield;
        const valorMensal = valorAnual / 12;
        const valorTotal = valorMensal * acaoParaUsar.quantidade;
        
        // console.log(`🧮 Cálculos:`);
        // console.log(`  - Valor anual por ação: R$ ${valorAnual.toFixed(4)}`);
        // console.log(`  - Valor mensal por ação: R$ ${valorMensal.toFixed(4)}`);
        // console.log(`  - Valor total mensal: R$ ${valorTotal.toFixed(2)}`);
        
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
            // console.log(`ℹ️ Provento já existe para ${codigoAcao} em ${mesAtual.toLocaleDateString('pt-BR')}`);
            return { success: true, updated: false, reason: 'Provento já existe', provento: proventoExistente };
        }
        
        // CRIAR NOVO PROVENTO
        // console.log(`📝 Criando novo provento...`);
        
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
        
        // console.log(`📋 Dados do provento:`, dadosProvento);
        
        // VALIDAÇÃO FINAL: Verificar se todos os campos são válidos
        if (isNaN(dadosProvento.valorPorAcao) || isNaN(dadosProvento.valorTotal)) {
            // console.log(`❌ Valores calculados inválidos: valorPorAcao=${dadosProvento.valorPorAcao}, valorTotal=${dadosProvento.valorTotal}`);
            return { success: false, reason: 'Valores calculados inválidos' };
        }
        
        const novoProvento = new Provento(dadosProvento);
        const proventoSalvo = await novoProvento.save();
        
        // console.log(`✅ Provento criado com sucesso! ID: ${proventoSalvo._id}`);
        return { success: true, provento: proventoSalvo };
        
    } catch (error) {
        console.error(`❌ Erro ao processar proventos para ${codigoAcao}:`, error.message);
        return { success: false, reason: error.message };
    }
};

// Rota para validar usuário
app.post('/api/validar-usuario', async (req, res) => {
    try {
        const { login, conta } = req.body;
        
        // Buscar usuário no banco
        const usuario = await Usuario.findOne({ login, conta });
        
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
            res.json({ valid: false, message: 'Sessão inválida' });
        }
    } catch (error) {
        console.error('Erro na validação:', error);
        res.status(500).json({ valid: false, message: 'Erro interno do servidor' });
    }
});

// Rota de login
app.post('/api/login', async (req, res) => {
    try {
        const { login, senha } = req.body;
        
        // Buscar usuário no banco
        const usuario = await Usuario.findOne({ login, senha });
        
        if (usuario) {
            res.json({ 
                success: true, 
                usuario: {
                    login: usuario.login,
                    conta: usuario.conta,
                    acesso: usuario.acesso
                }
            });
        } else {
            res.json({ success: false, message: 'Usuário ou senha incorretos' });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para buscar ações da carteira
app.get('/api/carteira/:conta', async (req, res) => {
    try {
        const { conta } = req.params;
        const acoes = await Acao.find({ conta: parseInt(conta) });
        res.json({ acoes });
    } catch (error) {
        console.error('Erro ao buscar carteira:', error);
        res.status(500).json({ erro: 'Erro ao buscar carteira' });
    }
});

// Rota para adicionar ação
app.post('/api/acao', async (req, res) => {
    try {
        const { conta, categoria, codigo, valor, quantidade } = req.body;
        
        // Verificar se já existe ação com mesmo código para a conta
        const acaoExistente = await Acao.findOne({ conta, codigo });
        
        if (acaoExistente) {
            // Atualizar quantidade e calcular preço médio
            const novaQuantidade = acaoExistente.quantidade + quantidade;
            const novoValor = ((acaoExistente.valor * acaoExistente.quantidade) + (valor * quantidade)) / novaQuantidade;
            acaoExistente.quantidade = novaQuantidade;
            acaoExistente.valor = novoValor;
            await acaoExistente.save();
            // Sincronizar proventos
            await Provento.updateMany({ conta, codigoAcao: codigo }, {
                quantidadeAcoes: novaQuantidade,
                valorTotal: { $multiply: ["$valorPorAcao", novaQuantidade] }
            });
            res.json({ success: true, message: 'Ação atualizada com sucesso', acao: acaoExistente });
        } else {
            // Criar nova ação
            const novaAcao = new Acao({ conta, categoria, codigo, valor, quantidade });
            await novaAcao.save();
            // Sincronizar proventos
            await Provento.updateMany({ conta, codigoAcao: codigo }, {
                quantidadeAcoes: quantidade,
                valorTotal: { $multiply: ["$valorPorAcao", quantidade] }
            });
            res.json({ success: true, message: 'Ação adicionada com sucesso', acao: novaAcao });
        }
    } catch (error) {
        console.error('Erro ao adicionar ação:', error);
        res.status(500).json({ erro: 'Erro ao adicionar ação' });
    }
});

// Rota para excluir ação
app.delete('/api/acao/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Buscar ação antes de excluir
        const acao = await Acao.findById(id);
        if (acao) {
            await Provento.deleteMany({ conta: acao.conta, codigoAcao: acao.codigo });
        }
        await Acao.findByIdAndDelete(id);
        res.json({ success: true, message: 'Ação excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir ação:', error);
        res.status(500).json({ erro: 'Erro ao excluir ação' });
    }
});

// Rota para buscar cotações (REFATORADA)
app.post('/api/buscarAcoes', async (req, res) => {
    const acoes = req.body.acoes;
    const conta = req.body.conta;

    if (!Array.isArray(acoes) || acoes.length === 0) {
        return res.status(400).json({ erro: 'Envie uma lista de ações válida' });
    }

    const resultados = [];
    const resultadosProventos = [];

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
            console.error(`❌ Erro ao processar ${codigoAcao}:`, error.message);
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
app.get('/api/cotacao/:codigo', async (req, res) => {
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
app.get('/api/cotacoes/:conta', async (req, res) => {
    try {
        const { conta } = req.params;
        const cotacoes = await Cotacao.find({ conta: parseInt(conta) });
        res.json(cotacoes);
    } catch (error) {
        console.error('Erro ao buscar cotações:', error);
        res.status(500).json({ erro: 'Erro ao buscar cotações' });
    }
});

// Rota para aplicar rateio
app.post('/api/rateio', async (req, res) => {
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
        
        res.json({ success: true, message: 'Rateio aplicado com sucesso' });
    } catch (error) {
        console.error('Erro ao aplicar rateio:', error);
        res.status(500).json({ erro: 'Erro ao aplicar rateio' });
    }
});

// Rota para buscar usuários (para debug)
app.get('/api/usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find({});
        res.json({ usuarios });
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ erro: 'Erro ao buscar usuários' });
    }
});

// ===== ROTAS DE PROVENTOS =====

// Rota para buscar proventos de uma conta
app.get('/api/proventos/:conta', async (req, res) => {
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
app.post('/api/proventos', async (req, res) => {
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
app.patch('/api/proventos/:id', async (req, res) => {
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
app.get('/api/proventos/:conta/:codigo', async (req, res) => {
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
app.delete('/api/proventos/:id', async (req, res) => {
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
app.get('/api/dividendos/:codigo', async (req, res) => {
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
        console.error('Erro ao buscar dividendos:', error);
        res.status(500).json({ error: 'Erro ao buscar dividendos' });
    }
});

// Rota de teste para verificar se o modelo Provento está funcionando
app.post('/api/teste-provento', async (req, res) => {
    try {
        // console.log('🧪 Testando criação de provento...');
        
        // Criar um provento de teste
        const proventoTeste = new Provento({
            conta: 1,
            codigoAcao: 'TESTE',
            tipo: 'Dividendo',
            dataBase: new Date(),
            dataPagamento: new Date(),
            valorPorAcao: 0.50,
            quantidadeAcoes: 100,
            valorTotal: 50.00,
            status: 'Pago'
        });
        
        // console.log('📝 Provento de teste criado:', proventoTeste);
        
        const proventoSalvo = await proventoTeste.save();
        // console.log('✅ Provento salvo com sucesso:', proventoSalvo._id);
        
        // Buscar o provento para confirmar
        const proventoEncontrado = await Provento.findById(proventoSalvo._id);
        // console.log('🔍 Provento encontrado no banco:', proventoEncontrado);
        
        res.json({ 
            success: true, 
            message: 'Teste de provento realizado com sucesso',
            provento: proventoSalvo,
            encontrado: proventoEncontrado
        });
        
    } catch (error) {
        console.error('❌ Erro no teste de provento:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        });
    }
});

// Rota para verificar ações na carteira
app.get('/api/debug-carteira/:conta', async (req, res) => {
    try {
        const { conta } = req.params;
        // console.log(`🔍 Debugando carteira da conta ${conta}...`);
        
        // Buscar todas as ações da conta
        const acoes = await Acao.find({ conta: parseInt(conta) });
        // console.log(`📋 Ações encontradas:`, acoes);
        
        // Buscar todas as cotações da conta
        const cotacoes = await Cotacao.find({ conta: parseInt(conta) });
        // console.log(`📊 Cotações encontradas:`, cotacoes);
        
        // Buscar todos os proventos da conta
        const proventos = await Provento.find({ conta: parseInt(conta) });
        // console.log(`💰 Proventos encontrados:`, proventos);
        
        res.json({
            success: true,
            conta: parseInt(conta),
            acoes: acoes,
            cotacoes: cotacoes,
            proventos: proventos
        });
        
    } catch (error) {
        console.error('❌ Erro ao debugar carteira:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Sistema de proventos automáticos ativado`);
});