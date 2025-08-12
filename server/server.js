const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const yf = require('yahoo-finance2').default;
const path = require('path');
const connectDB = require('./db');

// Modelos do MongoDB
const Usuario = require('./models/Usuario');
const Acao = require('./models/Acao');
const Cotacao = require('./models/Cotacao');

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar ao MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '..')));
app.use('/pages', express.static(path.join(__dirname, '..', 'pages')));

// Rotas da API
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

// ... (outras rotas conforme mostrado anteriormente)

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});