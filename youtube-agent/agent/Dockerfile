FROM node:20

WORKDIR /app

# Install FFmpeg and dependencies for Playwright
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright browsers (Chromium only - we connect to AdsPower via CDP)
# Note: We don't need full browser install since we connect to AdsPower
# But keep playwright for the CDP connection library

COPY package*.json ./
RUN npm install

COPY . .

# Create output and logs directories
RUN mkdir -p /app/output /app/logs

EXPOSE 3003

CMD ["node", "src/index.js"]
