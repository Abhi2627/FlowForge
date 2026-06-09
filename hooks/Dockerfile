FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY yarn.lock* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -b

EXPOSE 3002

CMD ["node", "dist/index.js"]
