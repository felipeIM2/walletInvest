#!/usr/bin/env node

/**
 * Script para testar a conexão com o MongoDB
 * Execute: node test-connection.js
 */

const mongoose = require('mongoose');
const config = require('./config');

console.log('🧪 Testando conexão com o MongoDB...');
console.log(`📡 URI: ${config.database.uri}`);

const testConnection = async () => {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(config.database.uri, config.database.options);
    console.log('✅ Conexão com MongoDB estabelecida com sucesso!');
    
    // Testar operações básicas
    console.log('🔍 Testando operações básicas...');
    
    // Listar bancos de dados
    const adminDb = mongoose.connection.db.admin();
    const dbList = await adminDb.listDatabases();
    console.log('📊 Bancos disponíveis:', dbList.databases.map(db => db.name));
    
    // Verificar se o banco walletInvest existe
    const walletInvestExists = dbList.databases.some(db => db.name === 'walletInvest');
    if (walletInvestExists) {
      console.log('✅ Banco "walletInvest" encontrado!');
      
      // Testar conexão com o banco específico
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      console.log('📁 Coleções disponíveis:', collections.map(col => col.name));
    } else {
      console.log('⚠️ Banco "walletInvest" não encontrado. Execute "npm run init-db" primeiro.');
    }
    
    console.log('🎉 Teste de conexão concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao conectar com MongoDB:', error.message);
    console.log('\n💡 Possíveis soluções:');
    console.log('1. Verifique se o MongoDB está rodando');
    console.log('2. Verifique se a porta 27017 está livre');
    console.log('3. Verifique se não há firewall bloqueando');
    console.log('4. Execute: mongod (para iniciar o MongoDB)');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔴 MongoDB não está rodando. Inicie o serviço:');
      console.log('Windows: Gerenciador de Serviços → MongoDB → Iniciar');
      console.log('Linux/macOS: sudo systemctl start mongod');
    }
    
    process.exit(1);
  } finally {
    // Fechar conexão
    await mongoose.disconnect();
    console.log('🔌 Conexão fechada.');
  }
};

// Executar teste
testConnection();
