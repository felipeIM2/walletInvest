# 🚀 WalletInvest - Sistema de Gestão de Carteira de Investimentos

Sistema completo para gerenciar carteiras de investimentos com MongoDB, Node.js e interface web responsiva.

## ✨ Funcionalidades

- **🔐 Autenticação de usuários** com múltiplas contas
- **📊 Gestão de carteira** - adicionar, editar e remover ativos
- **💰 Busca de cotações** em tempo real via Yahoo Finance
- **📈 Sistema de rateio** para distribuir investimentos estrategicamente
- **🏷️ Categorização** de ativos (ações, FIIs, ETFs, renda fixa, etc.)
- **📱 Interface responsiva** com design moderno

## 🛠️ Tecnologias

- **Backend**: Node.js + Express + MongoDB + Mongoose
- **Frontend**: HTML5 + CSS3 + JavaScript + jQuery
- **APIs**: Yahoo Finance para cotações em tempo real
- **Banco**: MongoDB local

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- MongoDB instalado e rodando localmente
- Git

## 🚀 Instalação e Configuração

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd walletInvest
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Certifique-se de que o MongoDB está rodando
```bash
# No Windows (se instalado como serviço)
# O MongoDB deve estar rodando automaticamente

# No Linux/Mac
mongod
```

### 4. Inicialize o banco de dados com dados de exemplo
```bash
npm run init-db
```

### 5. Inicie o servidor
```bash
npm start
```

### 6. Acesse a aplicação
Abra seu navegador e acesse: `http://localhost:3000`

## 👥 Usuários de Exemplo

Após executar `npm run init-db`, você terá acesso aos seguintes usuários:

| Login | Senha | Conta |
|-------|-------|-------|
| admin | admin | 1 |
| 1 | 1 | 1 |
| 2 | 2 | 2 |

## 📱 Como Usar

### Login
1. Acesse a página inicial
2. Use um dos usuários de exemplo para fazer login
3. Será redirecionado para sua carteira

### Adicionar Ação
1. Clique no menu hamburger (☰)
2. Selecione "Adicionar"
3. Preencha categoria, código, valor e quantidade
4. Clique em "Adicionar"

### Atualizar Preços
1. Clique no menu hamburger (☰)
2. Selecione "Buscar Preços"
3. Aguarde a atualização das cotações

### Rateio de Investimentos
1. Clique no menu hamburger (☰)
2. Selecione "Adicionar Rateio"
3. Defina o valor total e estratégia
4. Configure as alocações
5. Clique em "Aplicar à Carteira"

## 🗄️ Estrutura do Banco

### Coleções MongoDB

#### Usuarios
- `login`: String (único)
- `senha`: String
- `acesso`: Number
- `conta`: Number (único)

#### Acoes
- `conta`: Number
- `categoria`: String
- `codigo`: String
- `valor`: Number
- `quantidade`: Number
- `timestamps`: automático

#### Cotacoes
- `codigo`: String (único)
- `conta`: Number
- `nome`: String
- `moeda`: String
- `preco`: Number
- `dividendYield`: Number
- `timestamps`: automático

## 🔧 Scripts Disponíveis

- `npm start`: Inicia o servidor em produção
- `npm run dev`: Inicia o servidor em modo desenvolvimento com nodemon
- `npm run init-db`: Inicializa o banco com dados de exemplo

## 🌐 Rotas da API

- `POST /api/login` - Autenticação de usuário
- `GET /api/carteira/:conta` - Buscar ações da carteira
- `POST /api/acao` - Adicionar nova ação
- `PUT /api/acao/:id` - Editar ação existente
- `DELETE /api/acao/:id` - Excluir ação
- `POST /api/buscarAcoes` - Buscar cotações via Yahoo Finance
- `GET /api/cotacao/:codigo` - Buscar cotação específica
- `POST /api/rateio` - Aplicar rateio de investimentos

## 🐛 Solução de Problemas

### MongoDB não conecta
- Verifique se o MongoDB está rodando: `mongod`
- Confirme se a porta 27017 está livre
- Verifique se não há firewall bloqueando

### Erro ao buscar cotações
- Verifique sua conexão com a internet
- O Yahoo Finance pode ter limitações de rate limit
- Alguns códigos de ações podem não estar disponíveis

### Usuário não consegue fazer login
- Execute `npm run init-db` para recriar os usuários
- Verifique se o banco está conectado
- Confirme se as credenciais estão corretas

## 📝 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para facilitar a gestão de investimentos pessoais**
