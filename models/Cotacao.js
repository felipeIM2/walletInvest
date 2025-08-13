const mongoose = require('mongoose');

const CotacaoSchema = new mongoose.Schema({
    codigo: { type: String, required: true, unique: true },
    conta: { type: Number, required: true },
    nome: { type: String, required: true },
    moeda: { type: String, required: true },
    preco: { type: Number, required: true },
    dividendYield: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Cotacao', CotacaoSchema, 'cotacoes');