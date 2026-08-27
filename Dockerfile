FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

# migrate + seed + start, w tej kolejności, przy każdym starcie kontenera
CMD sh -c "npx prisma migrate deploy && npm run db:seed && npm run start"
