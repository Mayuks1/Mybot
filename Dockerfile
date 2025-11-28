# Use a lightweight Node.js image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the port for Zeabur to see the "Health Check"
EXPOSE 3000

# Start the bot
CMD [ "node", "index.js" ]
