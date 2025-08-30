// Script de teste para verificar funcionamento da carteira
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testarSistema() {
    console.log('🧪 Iniciando testes do sistema...\n');
    
    try {
        // 1. Testar se o servidor está respondendo
        console.log('1️⃣ Testando conectividade do servidor...');
        const healthResponse = await axios.get(`${BASE_URL}/`);
        console.log('✅ Servidor está respondendo!');
        
        // 2. Fazer login com diferentes usuários
        console.log('\n2️⃣ Testando login...');
        const loginOptions = [
            { login: 'admin', senha: 'admin' },
            { login: 'usuario1', senha: '123' },
            { login: 'test', senha: 'test' }
        ];
        
        let successfulLogin = null;
        
        for (const credentials of loginOptions) {
            try {
                console.log(`  🔐 Tentando login: ${credentials.login}`);
                const loginResponse = await axios.post(`${BASE_URL}/api/login`, credentials);
                
                if (loginResponse.data.success) {
                    console.log(`  ✅ Login bem-sucedido com: ${credentials.login}`);
                    console.log('  📝 Usuário:', loginResponse.data.usuario);
                    successfulLogin = loginResponse.data;
                    break;
                }
            } catch (loginError) {
                console.log(`  ❌ Falha no login ${credentials.login}:`, loginError.response?.data?.message || loginError.message);
            }
        }
        
        if (!successfulLogin) {
            console.log('\n⚠️ Nenhum login foi bem-sucedido. Isso pode indicar:');
            console.log('   - MongoDB não está rodando');
            console.log('   - Banco não foi inicializado (rode: npm run init-db)');
            console.log('   - Credenciais incorretas');
            return;
        }
        
        const { token } = successfulLogin;
        const { conta } = successfulLogin.usuario;
        
        // 3. Testar busca da carteira
        console.log('\n3️⃣ Testando busca da carteira...');
        try {
            const carteiraResponse = await axios.get(`${BASE_URL}/api/carteira/${conta}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('✅ Carteira carregada com sucesso!');
            console.log('📊 Ações encontradas:', carteiraResponse.data.acoes.length);
            
            if (carteiraResponse.data.error) {
                console.log('⚠️ Aviso:', carteiraResponse.data.message);
            }
            
            if (carteiraResponse.data.acoes.length > 0) {
                console.log('📋 Primeira ação:', carteiraResponse.data.acoes[0]);
            } else {
                console.log('📭 Carteira vazia - adicione algumas ações!');
            }
        } catch (carteiraError) {
            console.log('❌ Erro ao buscar carteira:', carteiraError.response?.data || carteiraError.message);
        }
        
        // 4. Testar busca de cotações
        console.log('\n4️⃣ Testando busca de cotações...');
        try {
            const cotacoesResponse = await axios.get(`${BASE_URL}/api/cotacoes/${conta}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('✅ Cotações carregadas com sucesso!');
            console.log('💰 Cotações encontradas:', cotacoesResponse.data.length);
            
            if (cotacoesResponse.data.length > 0) {
                console.log('💲 Primeira cotação:', cotacoesResponse.data[0]);
            }
        } catch (cotacoesError) {
            console.log('❌ Erro ao buscar cotações:', cotacoesError.response?.data || cotacoesError.message);
        }
        
        console.log('\n🎉 Teste concluído!');
        
    } catch (error) {
        console.error('💥 Erro geral no teste:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n⚠️ Servidor não está rodando. Execute: npm start');
        }
    }
}

testarSistema();