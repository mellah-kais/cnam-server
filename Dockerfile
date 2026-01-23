FROM node:18-slim

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the TypeScript app
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
