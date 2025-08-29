const mongoose = require('mongoose');

const TokenAcessoSchema = new mongoose.Schema({
    conta: { type: Number, required: true, unique: true },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
});

// Índice para auto-remoção de tokens expirados
TokenAcessoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TokenAcesso', TokenAcessoSchema, 'token_acesso');