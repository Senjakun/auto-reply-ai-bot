# 🚀 VPS Setup Guide - Military Verification Telegram Bot

## 📋 Prerequisites

- VPS dengan Ubuntu 20.04+ atau Debian 11+
- Domain (opsional, untuk webhook)
- Telegram Bot Token dari @BotFather

## 🔧 Quick Setup

### 1. Buat Telegram Bot

```bash
# Chat dengan @BotFather di Telegram
/newbot
# Ikuti instruksi, simpan BOT_TOKEN
```

### 2. Setup VPS (Ubuntu/Debian)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl unzip

# Install Deno
curl -fsSL https://deno.land/install.sh | sh

# Add to PATH
echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.bashrc
echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
deno --version
```

### 3. Clone & Setup Project

```bash
# Create directory
mkdir -p /opt/military-bot
cd /opt/military-bot

# Create bot file
cat > bot.ts << 'EOF'
// Paste konten dari supabase/functions/telegram-bot/index.ts
// Ganti "serve" import dengan Deno.serve

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
// ... rest of the code
EOF

# Create environment file
cat > .env << EOF
TELEGRAM_BOT_TOKEN=your_bot_token_here
EOF
```

### 4. Setup Webhook (Recommended)

```bash
# Jika punya domain dengan SSL
BOT_TOKEN="your_bot_token"
WEBHOOK_URL="https://yourdomain.com/webhook"

curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}"
```

### 5. Setup Polling Mode (Alternative)

Jika tidak punya domain, gunakan polling mode:

```bash
cat > polling.ts << 'EOF'
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

async function getUpdates(offset = 0) {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`
  );
  return response.json();
}

async function main() {
  console.log('🤖 Bot started in polling mode...');
  let offset = 0;
  
  while (true) {
    try {
      const { result } = await getUpdates(offset);
      
      for (const update of result || []) {
        offset = update.update_id + 1;
        
        // Process update - call your handler here
        await processUpdate(update);
      }
    } catch (error) {
      console.error('Polling error:', error);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// Import your handler
import { handleUpdate } from './bot.ts';

async function processUpdate(update: any) {
  try {
    await handleUpdate(update);
  } catch (error) {
    console.error('Error processing update:', error);
  }
}

main();
EOF
```

### 6. Create Systemd Service

```bash
sudo cat > /etc/systemd/system/military-bot.service << EOF
[Unit]
Description=Military Verification Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/military-bot
Environment=TELEGRAM_BOT_TOKEN=your_bot_token_here
ExecStart=/root/.deno/bin/deno run --allow-net --allow-env polling.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable military-bot
sudo systemctl start military-bot

# Check status
sudo systemctl status military-bot

# View logs
sudo journalctl -u military-bot -f
```

## 🐳 Docker Setup (Alternative)

### Dockerfile

```dockerfile
FROM denoland/deno:1.40.0

WORKDIR /app

COPY . .

RUN deno cache bot.ts

ENV TELEGRAM_BOT_TOKEN=""

CMD ["run", "--allow-net", "--allow-env", "polling.ts"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  bot:
    build: .
    restart: always
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Run with Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🔒 Security Best Practices

1. **Firewall Setup**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 443/tcp  # Jika pakai webhook
sudo ufw enable
```

2. **Non-root User**
```bash
sudo adduser botuser
sudo usermod -aG sudo botuser
# Run service as botuser instead of root
```

3. **Environment Variables**
```bash
# Jangan hardcode token, gunakan env vars
export TELEGRAM_BOT_TOKEN="your_token"
```

## 📊 Monitoring

### Health Check Script

```bash
cat > /opt/military-bot/health.sh << 'EOF'
#!/bin/bash

BOT_TOKEN="$TELEGRAM_BOT_TOKEN"
RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe")

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Bot is healthy"
  exit 0
else
  echo "❌ Bot is down"
  systemctl restart military-bot
  exit 1
fi
EOF

chmod +x /opt/military-bot/health.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/military-bot/health.sh") | crontab -
```

## 🆘 Troubleshooting

### Bot tidak merespons
```bash
# Check service status
sudo systemctl status military-bot

# Check logs
sudo journalctl -u military-bot -n 50

# Restart service
sudo systemctl restart military-bot
```

### Webhook tidak bekerja
```bash
# Check webhook info
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"

# Delete webhook (switch to polling)
curl "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook"
```

### Permission denied
```bash
# Fix Deno permissions
chmod +x ~/.deno/bin/deno
```

## 📝 Commands Reference

| Command | Description |
|---------|-------------|
| `/start` | Mulai bot |
| `/verify` | Mulai proses verifikasi |
| `/help` | Tampilkan bantuan |
| `/status` | Cek status verifikasi |

## 🔗 Resources

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Deno Documentation](https://deno.land/manual)
- [SheerID API](https://developer.sheerid.com/)
