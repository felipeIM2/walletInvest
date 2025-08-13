const mongoose = require('mongoose');
const config = require('../config');

const connectDB = async () => {
  try {
    await mongoose.connect(config.database.uri, config.database.options);
    console.log('✅ Conectado ao MongoDB - Database: walletInvest');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    console.log('💡 Certifique-se de que o MongoDB está rodando localmente');
    process.exit(1);
  }
};

module.exports = connectDB;