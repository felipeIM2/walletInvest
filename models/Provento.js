const mongoose = require('mongoose');

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
}, { timestamps: true });

module.exports = mongoose.model('Provento', proventoSchema, 'proventos');
