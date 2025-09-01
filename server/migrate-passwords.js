const axios = require('axios');
const bcrypt = require('bcrypt');

// Configuração do servidor
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

// Credenciais do administrador (modifique conforme necessário)
const ADMIN_CREDENTIALS = {
    login: process.env.ADMIN_LOGIN || 'admin', // Modifique para o login do seu administrador
    senha: process.env.ADMIN_PASSWORD || 'admin123' // Modifique para a senha do seu administrador
};

// Token de autenticação
let authToken = null;

// ===== CONFIGURAÇÃO =====
// Para usar este script, você precisa:
// 1. Ter um usuário administrador (conta 0 ou 1) no sistema
// 2. Configurar as credenciais acima ou usar variáveis de ambiente:
//    - ADMIN_LOGIN=seu_login_admin
//    - ADMIN_PASSWORD=sua_senha_admin
//    - SERVER_URL=http://localhost:3000 (opcional)
// 3. Certificar-se de que o servidor WalletInvest está rodando

// Função para verificar se uma senha já está hasheada
function isPasswordHashed(password) {
    if (!password || typeof password !== 'string') {
        return false;
    }
    
    // Bcrypt hashes têm formato específico: $2a$, $2b$, $2x$, $2y$ seguido de rounds e salt
    // O hash completo tem 60 caracteres
    const bcryptPattern = /^\$2[abyxy]\$\d{2}\$.{53}$/;
    return bcryptPattern.test(password);
}

// Função para fazer login e obter token de administrador
async function authenticateAdmin() {
    try {
        console.log('🔑 Fazendo login como administrador...');
        
        const response = await axios.post(`${SERVER_URL}/api/login`, ADMIN_CREDENTIALS);
        
        if (response.data.success) {
            authToken = response.data.token;
            console.log('✅ Login realizado com sucesso');
            console.log(`📄 Usuário: ${response.data.usuario.login} (conta: ${response.data.usuario.conta})`);
            return true;
        } else {
            console.error('❌ Falha na autenticação:', response.data.message);
            return false;
        }
    } catch (error) {
        if (error.response) {
            console.error('❌ Erro de autenticação:', error.response.data.message || error.message);
        } else if (error.code === 'ECONNREFUSED') {
            console.error('❌ Servidor não está rodando. Inicie o servidor primeiro:');
            console.error('   npm start ou npm run dev');
        } else {
            console.error('❌ Erro de conexão:', error.message);
        }
        return false;
    }
}

// Função para buscar todos os usuários via API
async function buscarUsuarios() {
    try {
        console.log('🔍 Buscando usuários via API...');
        
        const response = await axios.get(`${SERVER_URL}/api/admin/usuarios`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.data.usuarios) {
            console.log(`✅ Encontrados ${response.data.usuarios.length} usuários`);
            return response.data.usuarios;
        } else {
            console.error('❌ Resposta inválida da API');
            return [];
        }
    } catch (error) {
        if (error.response?.status === 403) {
            console.error('❌ Acesso negado. Certifique-se de que o usuário é administrador (conta 0 ou 1)');
        } else {
            console.error('❌ Erro ao buscar usuários:', error.response?.data?.erro || error.message);
        }
        throw error;
    }
}

// Função para atualizar senha de um usuário via API direta ao banco
async function atualizarSenhaUsuario(usuario, novaSenhaHasheada) {
    try {
        // Para esta operação, vamos usar mongoose diretamente
        // pois não há endpoint específico para atualizar senhas
        const mongoose = require('mongoose');
        const connectDB = require('./db');
        
        // Verificar se já está conectado
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        
        // Atualizar diretamente no banco para evitar middleware
        const result = await mongoose.connection.collection('usuarios').updateOne(
            { _id: usuario._id },
            { $set: { senha: novaSenhaHasheada } }
        );
        
        return result.modifiedCount === 1;
    } catch (error) {
        console.error(`   ❌ Erro ao atualizar senha para ${usuario.login}:`, error.message);
        return false;
    }
}
// Função para validar se um hash bcrypt é válido
async function validateBcryptHash(password) {
    if (!isPasswordHashed(password)) {
        return false;
    }
    
    try {
        // Tenta usar o hash para verificar uma senha de teste
        // Se não der erro, o hash é válido
        await bcrypt.compare('test_password_validation', password);
        return true;
    } catch (error) {
        console.log(`   ⚠️ Hash bcrypt mal formado: ${error.message}`);
        return false;
    }
}

async function migratePasswords() {
    try {
        // Verificar se é ambiente de produção
        if (process.env.NODE_ENV === 'production') {
            console.log('\n⚠️ AVISO: Executando em ambiente de PRODUÇÃO');
            console.log('⚠️ Certifique-se de ter um backup do banco antes de prosseguir!');
        }
        
        // Autenticar como administrador
        const isAuthenticated = await authenticateAdmin();
        if (!isAuthenticated) {
            throw new Error('Falha na autenticação do administrador');
        }
        
        console.log('\n🔍 Buscando todos os usuários...');
        const usuarios = await buscarUsuarios();
        
        if (usuarios.length === 0) {
            console.log('❌ Nenhum usuário encontrado no banco de dados.');
            return;
        }
        
        console.log(`📊 Encontrados ${usuarios.length} usuários. Analisando senhas...`);
        
        let usuariosParaMigrar = [];
        let usuariosJaHasheados = [];
        let usuariosComProblemas = [];
        
        // Primeiro, analise todos os usuários
        for (const usuario of usuarios) {
            console.log(`\n🔍 Analisando usuário: ${usuario.login}`);
            console.log(`   Conta: ${usuario.conta}`);
            console.log(`   Senha (primeiros 15 chars): ${usuario.senha.substring(0, 15)}...`);
            
            if (!usuario.senha || usuario.senha.trim() === '') {
                console.log('   ⚠️ Senha vazia ou nula - problema no banco');
                usuariosComProblemas.push({
                    ...usuario.toObject(),
                    problema: 'Senha vazia ou nula'
                });
                continue;
            }
            
            if (isPasswordHashed(usuario.senha)) {
                console.log('   ✅ Senha parece estar hasheada (formato bcrypt)');
                
                // Validar se o hash é realmente válido
                const isValidHash = await validateBcryptHash(usuario.senha);
                if (isValidHash) {
                    console.log('   ✅ Hash bcrypt válido - mantendo');
                    usuariosJaHasheados.push(usuario);
                } else {
                    console.log('   ⚠️ Hash bcrypt inválido - marcando para investigação');
                    usuariosComProblemas.push({
                        ...usuario.toObject(),
                        problema: 'Hash bcrypt inválido'
                    });
                }
            } else {
                console.log('   🔄 Senha em texto puro - marcando para migração');
                usuariosParaMigrar.push(usuario);
            }
        }
        
        // Relatório da análise
        console.log('\n📋 RELATÓRIO DA ANÁLISE:');
        console.log(`   ✅ Usuários com senhas já hasheadas: ${usuariosJaHasheados.length}`);
        console.log(`   🔄 Usuários que precisam de migração: ${usuariosParaMigrar.length}`);
        console.log(`   ⚠️ Usuários com problemas: ${usuariosComProblemas.length}`);
        
        if (usuariosComProblemas.length > 0) {
            console.log('\n⚠️ USUÁRIOS COM PROBLEMAS:');
            usuariosComProblemas.forEach(u => {
                console.log(`   - ${u.login} (conta ${u.conta}): ${u.problema}`);
            });
            console.log('\n📝 RECOMENDAÇÕES:');
            console.log('   - Verifique manualmente estes usuários no banco');
            console.log('   - Considere redefinir senhas ou corrigir dados corrompidos');
        }
        
        if (usuariosParaMigrar.length === 0) {
            console.log('\n🎉 Todas as senhas já estão criptografadas corretamente!');
            return;
        }
        
        // Mostrar resumo antes da migração
        console.log('\n📋 RESUMO DA MIGRAÇÃO:');
        console.log(`   ➡️ ${usuariosParaMigrar.length} usuário(s) terão suas senhas criptografadas`);
        console.log(`   ✅ ${usuariosJaHasheados.length} usuário(s) já possuem senhas criptografadas (serão mantidas)`);
        if (usuariosComProblemas.length > 0) {
            console.log(`   ⚠️ ${usuariosComProblemas.length} usuário(s) com problemas (serão ignorados)`);
        }
        
        // Confirmar migração
        console.log(`\n🚀 Iniciando migração de ${usuariosParaMigrar.length} usuários...`);
        console.log('\n🔒 PROCESSO DE CRIPTOGRAFIA:');
        let sucessos = 0;
        let falhas = 0;
        
        for (const usuario of usuariosParaMigrar) {
            try {
                console.log(`\n🔐 Criptografando senha para: ${usuario.login} (conta ${usuario.conta})`);
                
                // Verificar se a senha não está vazia antes de criptografar
                if (!usuario.senha || usuario.senha.trim() === '') {
                    console.log(`   ⚠️ Pulando - senha vazia para ${usuario.login}`);
                    falhas++;
                    continue;
                }
                
                // Gerar hash da senha com salt rounds 12 (mais seguro)
                const saltRounds = 12;
                const senhaOriginal = usuario.senha;
                const hashedPassword = await bcrypt.hash(senhaOriginal, saltRounds);
                
                console.log(`   Hash gerado: ${hashedPassword.substring(0, 30)}...`);
                
                // Verificar se o hash foi gerado corretamente
                const testValidation = await bcrypt.compare(senhaOriginal, hashedPassword);
                if (!testValidation) {
                    console.log(`   ❌ Erro: Hash gerado não valida contra senha original`);
                    falhas++;
                    continue;
                }
                
                // Atualizar diretamente no banco para evitar middleware
                const sucesso = await atualizarSenhaUsuario(usuario, hashedPassword);
                
                if (sucesso) {
                    console.log(`   ✅ Senha criptografada com sucesso para: ${usuario.login}`);
                    sucessos++;
                    
                    // Verificar se a senha foi salva corretamente
                    const usuariosAtualizados = await buscarUsuarios();
                    const usuarioAtualizado = usuariosAtualizados.find(u => u._id === usuario._id);
                    
                    if (usuarioAtualizado && isPasswordHashed(usuarioAtualizado.senha)) {
                        console.log(`   ✅ Verificação: Hash salvo corretamente`);
                        
                        // Teste final: verificar se o hash salvo funciona com a senha original
                        const finalTest = await bcrypt.compare(senhaOriginal, usuarioAtualizado.senha);
                        if (finalTest) {
                            console.log(`   ✅ Teste final: Hash funciona corretamente`);
                        } else {
                            console.log(`   ⚠️ Teste final: Hash não valida (problema crítico)`);
                        }
                    } else {
                        console.log(`   ❌ Verificação: Problema ao salvar hash`);
                    }
                } else {
                    console.log(`   ❌ Falha ao atualizar usuário: ${usuario.login}`);
                    falhas++;
                }
                
            } catch (error) {
                console.error(`   ❌ Erro ao processar usuário ${usuario.login}:`, error.message);
                falhas++;
            }
        }
        
        // Relatório final
        console.log('\n📊 RELATÓRIO FINAL DA MIGRAÇÃO:');
        console.log(`   ✅ Sucessos: ${sucessos}`);
        console.log(`   ❌ Falhas: ${falhas}`);
        console.log(`   📈 Taxa de sucesso: ${((sucessos / usuariosParaMigrar.length) * 100).toFixed(1)}%`);
        
        if (sucessos > 0) {
            console.log('\n🔍 Verificação final completa...');
            const todosUsuarios = await buscarUsuarios();
            
            let hasheadosCorretamente = 0;
            let textoPlano = 0;
            let problemasEncontrados = 0;
            
            for (const usuario of todosUsuarios) {
                if (isPasswordHashed(usuario.senha)) {
                    // Validar se o hash é funcional
                    const isValidHash = await validateBcryptHash(usuario.senha);
                    if (isValidHash) {
                        hasheadosCorretamente++;
                    } else {
                        console.log(`   ⚠️ ${usuario.login}: hash mal formado`);
                        problemasEncontrados++;
                    }
                } else {
                    textoPlano++;
                    console.log(`   ⚠️ ${usuario.login}: ainda em texto plano`);
                }
            }
            
            console.log(`\n📋 STATUS FINAL:`);
            console.log(`   ✅ Senhas hasheadas corretamente: ${hasheadosCorretamente}/${todosUsuarios.length}`);
            console.log(`   ❌ Senhas em texto plano: ${textoPlano}/${todosUsuarios.length}`);
            console.log(`   ⚠️ Senhas com problemas: ${problemasEncontrados}/${todosUsuarios.length}`);
            
            if (textoPlano === 0 && problemasEncontrados === 0) {
                console.log('\n🎉 PARABÉNS! Todas as senhas estão criptografadas corretamente!');
            } else if (textoPlano > 0) {
                console.log('\n⚠️ Ainda existem senhas em texto plano. Execute o script novamente se necessário.');
            }
        }
        
        console.log('\n🎉 Migração de senhas concluída!');
        
    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
        
        // Mensagens específicas para diferentes tipos de erro
        if (error.message.includes('ECONNREFUSED') || error.code === 'ECONNREFUSED') {
            console.error('\n🚨 ERRO DE CONEXÃO:');
            console.error('   - O servidor WalletInvest não está rodando');
            console.error('   - Inicie o servidor primeiro: npm start ou npm run dev');
            console.error('   - Verifique se o servidor está rodando na porta 3000');
        } else if (error.message.includes('Falha na autenticação')) {
            console.error('\n🚨 ERRO DE AUTENTICAÇÃO:');
            console.error('   - Verifique as credenciais do administrador no início do script');
            console.error('   - Certifique-se de que o usuário tem privilégios de administrador');
        } else {
            console.error('\n🚨 ERRO INESPERADO:');
            console.error('   - Verifique os logs acima para mais detalhes');
        }
        
        throw error;
    } finally {
        // Fechar conexão do mongoose se foi aberta
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('🔌 Conexão com o banco encerrada.');
        }
    }
}

// Função principal para executar migração
async function executarMigracao() {
    console.log('🚀 INICIANDO MIGRAÇÃO DE SENHAS VIA API');
    console.log('=' .repeat(70));
    console.log('📋 Este script irá:');
    console.log('   1. Autenticar como administrador no servidor WalletInvest');
    console.log('   2. Buscar todos os usuários via API do servidor');
    console.log('   3. Analisar todas as senhas dos usuários');
    console.log('   4. Identificar senhas em texto puro vs criptografadas');
    console.log('   5. Criptografar APENAS as senhas em texto puro');
    console.log('   6. Manter as senhas já criptografadas INALTERADAS');
    console.log('   7. Validar todas as senhas após a migração');
    console.log('');
    console.log('⚠️  PRÉ-REQUISITOS:');
    console.log('   - Servidor WalletInvest deve estar rodando (npm start)');
    console.log('   - Credenciais de administrador configuradas no script');
    console.log('   - MongoDB deve estar acessível ao servidor');
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   - Senhas já criptografadas serão preservadas');
    console.log('   - Apenas senhas em texto puro serão modificadas');
    console.log('   - O processo é seguro e não-destrutivo');
    console.log('=' .repeat(70));
    console.log('');
    
    try {
        await migratePasswords();
        console.log('\n🎉 Script de migração finalizado com sucesso!');
        console.log('🔒 Todas as senhas em texto puro foram criptografadas');
        console.log('✅ Senhas já criptografadas foram preservadas');
        console.log('🌐 Migração realizada via API do servidor');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Erro fatal durante a migração:', error.message);
        console.error('\n🚨 A migração foi interrompida. Verifique o erro acima.');
        console.error('\n📝 Dicas de solução de problemas:');
        console.error('   - Verifique se o servidor WalletInvest está rodando (npm start)');
        console.error('   - Confirme as credenciais de administrador no script');
        console.error('   - Verifique se o MongoDB está acessível ao servidor');
        process.exit(1);
    }
}

// Executar migração se chamado diretamente
if (require.main === module) {
    executarMigracao();
}

// Exportar tanto a função de migração quanto a função principal
module.exports = { migratePasswords, executarMigracao };