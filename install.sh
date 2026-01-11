#!/bin/bash

# ============================================
# Auto Reply AI Bot - VPS Installer
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       🤖 Auto Reply AI Bot - VPS Installer                   ║"
echo "║          Telegram Outlook Integration                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Collect configuration
echo -e "${YELLOW}📝 Configuration Setup${NC}"
echo "----------------------------------------"

read -p "Enter your domain (e.g., bot.example.com): " DOMAIN
read -p "Enter Telegram Bot Token: " BOT_TOKEN
read -p "Enter your Telegram User ID (owner): " OWNER_ID
read -p "Enter SheerID Program ID: " SHEERID_PROGRAM_ID
read -p "Enter Microsoft Client ID: " MS_CLIENT_ID
read -p "Enter Microsoft Client Secret: " MS_CLIENT_SECRET

echo ""
echo -e "${BLUE}🔧 Installing dependencies...${NC}"

# Update system
apt-get update -y

# Install Node.js 20
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install other dependencies
apt-get install -y git nginx certbot python3-certbot-nginx

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Clone or update project
APP_DIR="/opt/auto-reply-bot"
if [ -d "$APP_DIR" ]; then
    echo -e "${BLUE}📥 Updating existing installation...${NC}"
    cd "$APP_DIR"
    git pull
else
    echo -e "${BLUE}📥 Cloning project...${NC}"
    git clone https://github.com/Senjakun/auto-reply-ai-bot.git "$APP_DIR"
    cd "$APP_DIR"
fi

# Install npm dependencies
npm install

# Build project
npm run build

# Create config file
echo -e "${BLUE}📝 Creating configuration...${NC}"
cat > "$APP_DIR/config.json" << EOF
{
  "bot_token": "$BOT_TOKEN",
  "owner_id": $OWNER_ID,
  "allowed_users": [$OWNER_ID],
  "sheerid_program_id": "$SHEERID_PROGRAM_ID",
  "microsoft": {
    "client_id": "$MS_CLIENT_ID",
    "client_secret": "$MS_CLIENT_SECRET"
  }
}
EOF

# Setup Nginx
echo -e "${BLUE}🌐 Setting up Nginx...${NC}"
cat > /etc/nginx/sites-available/auto-reply-bot << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/auto-reply-bot /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Setup SSL
echo -e "${BLUE}🔒 Setting up SSL...${NC}"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || true

# Create systemd service
echo -e "${BLUE}⚙️ Creating systemd service...${NC}"
cat > /etc/systemd/system/auto-reply-bot.service << EOF
[Unit]
Description=Auto Reply AI Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable auto-reply-bot
systemctl start auto-reply-bot

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       ✅ Installation Complete!                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}🌐 Your bot is running at: https://$DOMAIN${NC}"
echo -e "${CYAN}📊 Service status: systemctl status auto-reply-bot${NC}"
echo -e "${CYAN}📝 Logs: journalctl -u auto-reply-bot -f${NC}"
echo ""
