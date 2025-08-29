const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UsuarioSchema = new mongoose.Schema({
    login: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    acesso: { type: Number, default: 1 },
    conta: { type: Number, required: true, unique: true }
});

// Middleware para hash da senha antes de salvar
UsuarioSchema.pre('save', async function(next) {
    // Só fazer hash se a senha foi modificada
    if (!this.isModified('senha')) {
        return next();
    }
    
    try {
        // Gerar salt e hash da senha
        const saltRounds = 12;
        this.senha = await bcrypt.hash(this.senha, saltRounds);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar senhas
UsuarioSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.senha);
};

module.exports = mongoose.model('Usuario', UsuarioSchema, 'usuarios');