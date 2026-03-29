FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

EXPOSE 3002

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
