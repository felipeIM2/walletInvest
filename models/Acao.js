const mongoose = require('mongoose');

const AcaoSchema = new mongoose.Schema({
    conta: { type: Number, required: true },
    categoria: { type: String, required: true },
    codigo: { type: String, required: true },
    valor: { type: Number, required: true },
    quantidade: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Acao', AcaoSchema);