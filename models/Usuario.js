const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    login: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    acesso: { type: Number, default: 1 },
    conta: { type: Number, required: true, unique: true }
});

module.exports = mongoose.model('Usuario', UsuarioSchema, 'usuarios');