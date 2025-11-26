FROM node:22-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Copy database as initial seed
COPY database.db /app/database.db

# Build client
WORKDIR /app/client
RUN npm install
RUN npm run build

# Go back to root and build server
WORKDIR /app
RUN npm run build

# Expose ports
EXPOSE 3000
EXPOSE 50051

# Start the app
CMD ["npm", "start"]
