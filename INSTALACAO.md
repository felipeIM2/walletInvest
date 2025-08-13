# 📋 Guia de Instalação - WalletInvest

Este guia irá te ajudar a configurar e executar o sistema WalletInvest em sua máquina local.

## 🎯 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

### 1. Node.js
- **Versão**: 14.x ou superior
- **Download**: [nodejs.org](https://nodejs.org/)
- **Verificação**: `node --version`

### 2. MongoDB
- **Versão**: 4.4 ou superior
- **Download**: [mongodb.com](https://www.mongodb.com/try/download/community)

#### Instalação no Windows:
1. Baixe o instalador MSI
2. Execute como administrador
3. Siga o assistente de instalação
4. O MongoDB será instalado como serviço automaticamente

#### Instalação no Linux (Ubuntu/Debian):
```bash
# Importar chave pública
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Adicionar repositório
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Atualizar e instalar
sudo apt-get update
sudo apt-get install -y mongodb-org

# Iniciar serviço
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Instalação no macOS:
```bash
# Usando Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Iniciar serviço
brew services start mongodb-community
```

### 3. Git
- **Download**: [git-scm.com](https://git-scm.com/)
- **Verificação**: `git --version`

## 🚀 Passo a Passo da Instalação

### 1. Clone o Repositório
```bash
git clone <URL_DO_REPOSITORIO>
cd walletInvest
```

### 2. Instale as Dependências
```bash
npm install
```

### 3. Verifique se o MongoDB está Rodando

#### Windows:
- Abra o Gerenciador de Serviços
- Procure por "MongoDB" e verifique se está "Em execução"
- Se não estiver, clique com botão direito → "Iniciar"

#### Linux/macOS:
```bash
# Verificar status
sudo systemctl status mongod

# Se não estiver rodando, iniciar:
sudo systemctl start mongod
```

#### Verificação Manual:
```bash
# Conectar ao MongoDB
mongosh
# ou
mongo

# Se conectar, digite 'exit' para sair
```

### 4. Inicialize o Banco de Dados
```bash
npm run init-db
```

**Saída esperada:**
```
🗄️ Inicializando banco de dados...
✅ Usuário criado: admin
✅ Usuário criado: 1
✅ Usuário criado: 2
✅ Ação criada: BBAS3
✅ Ação criada: PETR4
✅ Cotação criada: BBAS3
✅ Cotação criada: PETR4
🎉 Banco de dados inicializado com sucesso!
📊 Dados de exemplo criados:
   - 3 usuários (admin/admin, 1/1, 2/2)
   - 2 ações (BBAS3, PETR4)
   - 2 cotações
```

### 5. Inicie o Servidor
```bash
npm start
```

**Saída esperada:**
```
✅ Conectado ao MongoDB - Database: walletInvest
🚀 Servidor rodando em http://localhost:3000
```

### 6. Acesse a Aplicação
Abra seu navegador e acesse: `http://localhost:3000`

## 🔐 Credenciais de Acesso

Após a inicialização, você terá acesso aos seguintes usuários:

| Login | Senha | Conta | Descrição |
|-------|-------|-------|-----------|
| `admin` | `admin` | 1 | Usuário administrador |
| `1` | `1` | 1 | Usuário de teste 1 |
| `2` | `2` | 2 | Usuário de teste 2 |

## 🐛 Solução de Problemas Comuns

### Erro: "MongoDB não conecta"
```bash
# Verificar se o serviço está rodando
# Windows: Gerenciador de Serviços
# Linux/macOS:
sudo systemctl status mongod

# Verificar se a porta 27017 está livre
netstat -an | grep 27017

# Reiniciar o serviço
# Windows: Gerenciador de Serviços → Reiniciar
# Linux/macOS:
sudo systemctl restart mongod
```

### Erro: "Porta 3000 já está em uso"
```bash
# Encontrar processo usando a porta
netstat -ano | findstr :3000

# Encerrar processo (Windows)
taskkill /PID <PID> /F

# Linux/macOS:
lsof -ti:3000 | xargs kill -9
```

### Erro: "Módulo não encontrado"
```bash
# Limpar cache do npm
npm cache clean --force

# Remover node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Permissão negada" (Linux/macOS)
```bash
# Verificar permissões do diretório de dados do MongoDB
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/log/mongodb

# Verificar permissões do projeto
sudo chown -R $USER:$USER .
```

## 🔧 Configurações Avançadas

### Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
# Servidor
PORT=3000
HOST=localhost

# MongoDB
MONGODB_URI=mongodb://localhost:27017/walletInvest

# Segurança
SESSION_SECRET=sua-chave-secreta-aqui

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Configuração do MongoDB
Para configurar autenticação ou conexão remota, edite o arquivo `config.js`:

```javascript
database: {
  uri: 'mongodb://usuario:senha@localhost:27017/walletInvest?authSource=admin',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // Outras opções...
  }
}
```

## 📱 Desenvolvimento

### Modo Desenvolvimento
```bash
npm run dev
```
- Usa nodemon para reiniciar automaticamente
- Monitora mudanças nos arquivos

### Estrutura do Projeto
```
walletInvest/
├── config.js              # Configurações centralizadas
├── server/
│   ├── server.js          # Servidor principal
│   ├── db.js             # Conexão com MongoDB
│   └── init-db.js        # Inicialização do banco
├── models/                # Modelos Mongoose
├── pages/                 # Páginas da aplicação
└── package.json           # Dependências e scripts
```

## ✅ Verificação da Instalação

Após seguir todos os passos, você deve conseguir:

1. ✅ Acessar `http://localhost:3000`
2. ✅ Fazer login com qualquer usuário de teste
3. ✅ Ver a carteira de investimentos
4. ✅ Adicionar novas ações
5. ✅ Atualizar preços via Yahoo Finance
6. ✅ Usar o sistema de rateio

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor no terminal
2. Confirme se o MongoDB está rodando
3. Verifique se todas as dependências foram instaladas
4. Consulte a seção de solução de problemas acima
5. Abra uma issue no repositório

---

**🎉 Parabéns! Seu sistema WalletInvest está funcionando!**
