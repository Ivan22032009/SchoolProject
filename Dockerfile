# Використовуємо Node.js 18
FROM node:22.14.0

WORKDIR /app

# Копіюємо файли package.json і package-lock.json
COPY package.json package-lock.json ./

# Встановлюємо залежності
RUN npm install --legacy-peer-deps

# Копіюємо всі файли
COPY . .

# Відкриваємо порт
EXPOSE 3000

# Запускаємо сервер
CMD ["node", "server.js"]
