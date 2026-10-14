FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY . .
RUN npm run build
ENV PORT=3001
EXPOSE 3001
CMD ["npm", "start"]
