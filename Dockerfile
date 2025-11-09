FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Build the Expo web app
RUN npm run web:build

EXPOSE 3000
CMD ["npm", "run", "server"]