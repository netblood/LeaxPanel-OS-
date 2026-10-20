FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ curl

COPY package.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]