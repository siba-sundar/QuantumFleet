# Use Node.js 22 Alpine as the base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose port (default 4000)
EXPOSE 4001

# Start the application
CMD ["npm", "start"]
