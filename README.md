# BioClub+ - Sistema Completo de Clube de Assinatura

Sistema completo para clube de assinatura mensal de produtos naturais (encapsulados) com sistema robusto de indicações comissionadas, loja virtual integrada e painel administrativo.

## 🚀 Características Principais

### 📱 Frontend (React + TypeScript)
- **Interface Responsiva**: Design moderno e responsivo com Tailwind CSS
- **Autenticação Completa**: Login, registro, recuperação de senha, verificação de email
- **Dashboard do Usuário**: Painel completo com estatísticas e gestão
- **Sistema de Indicações**: Links únicos, rastreamento e comissões
- **Loja Virtual**: Catálogo de produtos, carrinho, checkout
- **Gestão de Perfil**: Dados pessoais, endereço, dados bancários
- **Sistema de Cupons**: Aplicação e validação de descontos

### 🔧 Backend (Node.js + Express + TypeScript)
- **API RESTful**: Endpoints completos para todas as funcionalidades
- **Autenticação JWT**: Sistema seguro com refresh tokens
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Validação Robusta**: Joi para validação de dados
- **Sistema de Emails**: Nodemailer para notificações
- **Upload de Arquivos**: Multer para imagens de produtos
- **Rate Limiting**: Proteção contra ataques
- **Logs Detalhados**: Winston para monitoramento

### 💰 Sistema de Indicações
- **Links Únicos**: Geração automática de códigos de indicação
- **Rastreamento**: Acompanhamento completo da rede de indicações
- **Comissões**: Cálculo automático e liberação programada
- **Saques**: Sistema de solicitação e processamento
- **Relatórios**: Dashboards com métricas detalhadas

### 🛍️ Loja Virtual
- **Catálogo Completo**: Produtos com categorias, imagens e descrições
- **Busca e Filtros**: Sistema avançado de busca
- **Carrinho**: Gestão de itens e aplicação de cupons
- **Checkout**: Processo simplificado com múltiplas formas de pagamento
- **Avaliações**: Sistema de reviews dos produtos

### 👨‍💼 Painel Administrativo
- **Dashboard**: Métricas e KPIs em tempo real
- **Gestão de Usuários**: CRUD completo de usuários
- **Gestão de Produtos**: Catálogo e estoque
- **Gestão de Pedidos**: Acompanhamento e processamento
- **Gestão de Comissões**: Aprovação de saques
- **Relatórios**: Exportação de dados

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **React Router** para navegação
- **React Query** para gerenciamento de estado
- **React Hook Form** para formulários
- **Tailwind CSS** para estilização
- **Lucide React** para ícones
- **React Hot Toast** para notificações
- **Framer Motion** para animações

### Backend
- **Node.js** com Express
- **TypeScript** para tipagem
- **Prisma ORM** com PostgreSQL
- **JWT** para autenticação
- **Joi** para validação
- **Nodemailer** para emails
- **Multer** para uploads
- **Winston** para logs
- **Rate Limiting** para segurança

### Infraestrutura
- **Docker** para containerização
- **PostgreSQL** como banco principal
- **Redis** para cache e sessões
- **Nginx** para proxy reverso (produção)

## 📋 Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- Git

## 🚀 Instalação e Configuração

### 1. Clone o repositório
```bash
git clone https://github.com/blackshazm/PremiumWebSuite.git
cd PremiumWebSuite
```

### 2. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com suas configurações
nano .env
```

### 3. Instale as dependências
```bash
# Instalar dependências do projeto principal
npm install

# Instalar dependências do backend e frontend
npm run install:all
```

### 4. Configure o banco de dados
```bash
# Subir o banco PostgreSQL com Docker
docker-compose up -d postgres redis

# Executar migrations
npm run db:migrate

# Popular banco com dados iniciais
npm run db:seed
```

### 5. Inicie o desenvolvimento
```bash
# Iniciar backend e frontend simultaneamente
npm run dev

# Ou iniciar separadamente:
npm run dev:backend  # Backend na porta 3001
npm run dev:frontend # Frontend na porta 3000
```

## 🐳 Docker

### Desenvolvimento com Docker
```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

### Produção
```bash
# Build das imagens
docker-compose -f docker-compose.prod.yml build

# Subir em produção
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Banco de Dados

### Estrutura Principal
- **users**: Usuários do sistema
- **subscriptions**: Assinaturas ativas
- **products**: Catálogo de produtos
- **orders**: Pedidos da loja
- **commissions**: Sistema de comissões
- **coupons**: Cupons de desconto

### Comandos Úteis
```bash
# Visualizar banco
npm run db:studio

# Reset do banco
npm run db:reset

# Nova migration
npx prisma migrate dev --name nome_da_migration
```

## 🔐 Autenticação

### Fluxo de Autenticação
1. **Registro**: Validação de dados + envio de email de verificação
2. **Login**: JWT + Refresh Token
3. **Verificação**: Link por email para ativar conta
4. **Recuperação**: Reset de senha via email

### Proteção de Rotas
- **Públicas**: Home, produtos, login, registro
- **Autenticadas**: Dashboard, perfil, pedidos
- **Admin**: Painel administrativo

## 💳 Sistema de Pagamentos

### Métodos Suportados
- **Cartão de Crédito**: Via Stripe
- **PIX**: QR Code e Copia e Cola
- **Boleto**: Geração automática
- **Saldo de Comissão**: Uso do saldo acumulado

### Fluxo de Pagamento
1. **Carrinho**: Adição de produtos
2. **Cupons**: Aplicação de descontos
3. **Checkout**: Seleção de método de pagamento
4. **Confirmação**: Processamento e confirmação

## 📈 Sistema de Indicações

### Como Funciona
1. **Código Único**: Cada usuário recebe um código de indicação
2. **Compartilhamento**: Links personalizados para redes sociais
3. **Rastreamento**: Cookies para atribuição correta
4. **Comissões**: Cálculo automático baseado em regras configuráveis
5. **Liberação**: Período de carência configurável
6. **Saque**: Solicitação via dados bancários ou PIX

### Configurações
- **Taxa de Comissão**: Configurável por admin
- **Período de Carência**: Dias para liberação
- **Valor Mínimo**: Para solicitação de saque
- **Recorrência**: Comissão em mensalidades subsequentes

## 📧 Sistema de Emails

### Templates Disponíveis
- **Boas-vindas**: Novo usuário cadastrado
- **Verificação**: Ativação de conta
- **Recuperação**: Reset de senha
- **Nova Indicação**: Notificação de indicação
- **Comissão Liberada**: Saldo disponível
- **Confirmação de Pedido**: Detalhes da compra
- **Lembrete de Pagamento**: Assinatura vencendo

### Configuração SMTP
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
```

## 🔧 Configurações Avançadas

### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests por IP
```

### Uploads
```env
UPLOAD_MAX_SIZE=10MB
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf
```

### Comissões
```env
DEFAULT_COMMISSION_RATE=0.30    # 30%
COMMISSION_RELEASE_DAYS=15      # 15 dias
MIN_WITHDRAWAL_AMOUNT=50.00     # R$ 50,00
```

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes do backend
npm run test:backend

# Testes do frontend
npm run test:frontend

# Coverage
npm run test:coverage
```

## 📝 Scripts Disponíveis

### Desenvolvimento
- `npm run dev`: Inicia backend e frontend
- `npm run dev:backend`: Apenas backend
- `npm run dev:frontend`: Apenas frontend

### Build
- `npm run build`: Build completo
- `npm run build:backend`: Build do backend
- `npm run build:frontend`: Build do frontend

### Banco de Dados
- `npm run db:migrate`: Executar migrations
- `npm run db:seed`: Popular com dados iniciais
- `npm run db:studio`: Interface visual do banco

### Qualidade de Código
- `npm run lint`: Verificar código
- `npm run lint:fix`: Corrigir automaticamente
- `npm run format`: Formatar código

## 🚀 Deploy

### Variáveis de Produção
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=seu-jwt-secret-super-seguro
FRONTEND_URL=https://seudominio.com
```

### Checklist de Deploy
- [ ] Configurar variáveis de ambiente
- [ ] Executar migrations
- [ ] Configurar SMTP
- [ ] Configurar gateway de pagamento
- [ ] Configurar domínio e SSL
- [ ] Configurar backup do banco
- [ ] Configurar monitoramento

## 📚 Documentação da API

### Endpoints Principais

#### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Dados do usuário logado

#### Usuário
- `GET /api/user/profile` - Perfil do usuário
- `PUT /api/user/profile` - Atualizar perfil
- `GET /api/user/dashboard` - Dashboard do usuário

#### Produtos
- `GET /api/products` - Listar produtos
- `GET /api/products/:slug` - Detalhes do produto
- `GET /api/products/categories/list` - Categorias

#### Pedidos
- `GET /api/orders` - Pedidos do usuário
- `POST /api/orders` - Criar pedido
- `GET /api/orders/:id` - Detalhes do pedido

#### Comissões
- `GET /api/commissions/summary` - Resumo de comissões
- `GET /api/commissions` - Histórico de comissões
- `POST /api/commissions/withdraw` - Solicitar saque

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

### Problemas Comuns

#### Erro de conexão com banco
```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Recriar banco
docker-compose down
docker-compose up -d postgres
npm run db:migrate
```

#### Erro de CORS
```bash
# Verificar FRONTEND_URL no .env
FRONTEND_URL=http://localhost:3000
```

#### Erro de email
```bash
# Verificar configurações SMTP no .env
# Para Gmail, usar senha de app, não senha normal
```

### Contato
- **Email**: suporte@bioclubplus.com
- **GitHub Issues**: Para bugs e sugestões
- **Documentação**: Wiki do projeto

## 🎯 Roadmap

### Versão 1.1
- [ ] App mobile (React Native)
- [ ] Integração com WhatsApp Business
- [ ] Sistema de afiliados multinível
- [ ] Programa de fidelidade

### Versão 1.2
- [ ] Marketplace de afiliados
- [ ] Sistema de gamificação
- [ ] Integração com redes sociais
- [ ] Analytics avançado

### Versão 2.0
- [ ] Inteligência artificial para recomendações
- [ ] Sistema de assinatura de produtos
- [ ] Plataforma de cursos online
- [ ] Comunidade integrada

---

**Desenvolvido com ❤️ para transformar vidas através de produtos naturais e oportunidades de renda.**