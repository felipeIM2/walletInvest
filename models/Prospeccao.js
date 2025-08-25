const mongoose = require('mongoose');

const ProspeccaoSchema = new mongoose.Schema({
    conta: { type: Number, required: true },
    categoria: { type: String, required: true },
    codigo: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Prospeccao', ProspeccaoSchema, 'prospeccao');