FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies (which includes your x402-sandbox from git)
RUN pnpm install

# Create config file
RUN echo '{\n\
    "node": {\n\
    "type": "external",\n\
    "url": "http://anvil:8545"\n\
    },\n\
    "facilitator": {\n\
    "port": 3000,\n\
    "privateKey": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"\n\
    }\n\
    }' > /app/x402-config.json

CMD ["npx", "x402-sandbox", "start", "--config", "/app/x402-config.json"]