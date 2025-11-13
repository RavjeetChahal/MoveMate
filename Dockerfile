FROM node:20-alpine
WORKDIR /app

# Copy package files first
COPY package.json package-lock.json* ./

# Install dependencies (including expo-linear-gradient)
RUN npm ci --only=production=false

# Copy all files
COPY . .

# Clear Expo cache and build the web app fresh
RUN npx expo export --clear --platform web

EXPOSE 3000
CMD ["npm", "run", "server"]