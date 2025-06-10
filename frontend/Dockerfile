FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Servir aplicação com serve
RUN npm install -g serve

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["serve", "-s", "build", "-l", "3000"]
