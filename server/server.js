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
            
            res.json({ success: true, acao: acaoExistente });
        } else {
            // Criar nova ação
            const novaAcao = new Acao({ conta, categoria, codigo, valor, quantidade });
            await novaAcao.save();
            res.json({ success: true, acao: novaAcao });
        }
    } catch (error) {
        console.error('Erro ao adicionar ação:', error);
        res.status(500).json({ erro: 'Erro ao adicionar ação' });
    }
});

// Rota para buscar ação específica
app.get('/api/acao/:id', async (req, res) => {
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

// Rota para editar ação
app.put('/api/acao/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantidade, valor } = req.body;
        
        const acao = await Acao.findById(id);
        if (!acao) {
            return res.status(404).json({ erro: 'Ação não encontrada' });
        }
        
        acao.quantidade = quantidade;
        acao.valor = valor;
        await acao.save();
        
        res.json({ success: true, acao });
    } catch (error) {
        console.error('Erro ao editar ação:', error);
        res.status(500).json({ erro: 'Erro ao editar ação' });
    }
});

// Rota para excluir ação
app.delete('/api/acao/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Acao.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir ação:', error);
        res.status(500).json({ erro: 'Erro ao excluir ação' });
    }
});

// Rota para buscar cotações
app.post('/api/buscarAcoes', async (req, res) => {
    const acoes = req.body.acoes;
    const conta = req.body.conta;

    if (!Array.isArray(acoes) || acoes.length === 0) {
        return res.status(400).json({ erro: 'Envie uma lista de ações válida' });
    }

    const resultados = [];

    for (const codigoAcao of acoes) {
        try {
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

            resultados.push(cotacao);
        } catch (error) {
            console.error(`Erro ao buscar ${codigoAcao}:`, error.message);
        }
    }

    res.json({ acoes: resultados });
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

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});