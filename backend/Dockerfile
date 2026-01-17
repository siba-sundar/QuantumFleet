# Use Node.js 20 Alpine as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm i --legacy-peer-deps

# Copy source code
COPY . .

# Expose port (default 4000)
EXPOSE 4001

# Start the application
CMD ["npm", "start"]
