const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());

const proventoSchema = new mongoose.Schema({
    conta: {
        type: Number,
        required: true
    },
    codigoAcao: {
        type: String,
        required: true
    },
    tipo: {
        type: String,
        enum: ['Dividendo', 'JCP', 'Rendimento', 'Bonificação'],
        required: true
    },
    dataBase: {
        type: Date,
        required: true
    },
    dataPagamento: {
        type: Date,
        required: true
    },
    valorPorAcao: {
        type: Number,
        required: true
    },
    quantidadeAcoes: {
        type: Number,
        required: true
    },
    valorTotal: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Aguardando', 'Pago'],
        default: 'Aguardando'
    }
});

const Provento = mongoose.model('Provento', proventoSchema);

// Rota para buscar proventos
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

module.exports = { Provento, app };

const ENDPOINTS = {
    PROVENTOS: '/api/proventos'
};
