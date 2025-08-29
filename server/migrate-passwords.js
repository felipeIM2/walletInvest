const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config');

// Schema temporário para trabalhar com senhas em texto puro
const UsuarioSchemaTemp = new mongoose.Schema({
    login: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    acesso: { type: Number, default: 1 },
    conta: { type: Number, required: true, unique: true }
});

const UsuarioTemp = mongoose.model('UsuarioTemp', UsuarioSchemaTemp, 'usuarios');

async function migratePasswords() {
    try {
        console.log('Conectando ao banco de dados...');
        await mongoose.connect(config.database.uri);
        
        console.log('Buscando usuários com senhas em texto puro...');
        const usuarios = await UsuarioTemp.find({});
        
        if (usuarios.length === 0) {
            console.log('Nenhum usuário encontrado no banco de dados.');
            return;
        }
        
        console.log(`Encontrados ${usuarios.length} usuários. Iniciando migração...`);
        
        for (const usuario of usuarios) {
            // Verificar se a senha já está hasheada (bcrypt hashes começam com $2b$)
            if (usuario.senha.startsWith('$2b$')) {
                console.log(`Usuário ${usuario.login} já possui senha hasheada. Pulando...`);
                continue;
            }
            
            console.log(`Hasheando senha para usuário: ${usuario.login}`);
            
            // Gerar hash da senha
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(usuario.senha, saltRounds);
            
            // Atualizar diretamente no banco para evitar middleware
            await mongoose.connection.collection('usuarios').updateOne(
                { _id: usuario._id },
                { $set: { senha: hashedPassword } }
            );
            
            console.log(`Senha hasheada com sucesso para usuário: ${usuario.login}`);
        }
        
        console.log('Migração de senhas concluída com sucesso!');
        
        // Verificar se as senhas foram hasheadas corretamente
        console.log('Verificando senhas hasheadas...');
        const usuariosAtualizados = await UsuarioTemp.find({});
        
        for (const usuario of usuariosAtualizados) {
            if (usuario.senha.startsWith('$2b$')) {
                console.log(`✓ Usuário ${usuario.login}: senha hasheada corretamente`);
            } else {
                console.log(`✗ Usuário ${usuario.login}: senha ainda em texto puro!`);
            }
        }
        
    } catch (error) {
        console.error('Erro durante a migração:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Conexão com o banco encerrada.');
    }
}

// Executar migração se chamado diretamente
if (require.main === module) {
    migratePasswords().then(() => {
        console.log('Script de migração finalizado.');
        process.exit(0);
    }).catch((error) => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });
}

module.exports = migratePasswords;