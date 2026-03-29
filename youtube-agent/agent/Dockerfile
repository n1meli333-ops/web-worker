FROM node:20

WORKDIR /app

# Install FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy Prisma schema from server (shared DB)
COPY server/prisma ./prisma/

# Copy agent package files
COPY agent/package*.json ./
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy agent source code
COPY agent/src ./src/

# Copy bot source (agent imports it)
COPY bot ./bot/

# Create output and logs directories
RUN mkdir -p /app/output /app/logs

CMD ["node", "src/index.js"]
