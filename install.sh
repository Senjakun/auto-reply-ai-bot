#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

clear

# Banner
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     █████╗ ██╗   ██╗████████╗ ██████╗     ██████╗  ██████╗ ████████╗ ║"
echo "║    ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗    ██╔══██╗██╔═══██╗╚══██╔══╝ ║"
echo "║    ███████║██║   ██║   ██║   ██║   ██║    ██████╔╝██║   ██║   ██║    ║"
echo "║    ██╔══██║██║   ██║   ██║   ██║   ██║    ██╔══██╗██║   ██║   ██║    ║"
echo "║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝    ██████╔╝╚██████╔╝   ██║    ║"
echo "║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝     ╚═════╝  ╚═════╝    ╚═╝    ║"
echo "║                                                              ║"
echo "║              🤖 Auto Reply AI Bot Installer 🤖               ║"
echo "║                    One Command Setup                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if domain passed as argument
if [ -n "$1" ]; then
    DOMAIN="$1"
else
    echo ""
    echo -e "${WHITE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${WHITE}║                    📋 KONFIGURASI DOMAIN                     ║${NC}"
    echo -e "${WHITE}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${WHITE}║                                                              ║${NC}"
    echo -e "${WHITE}║${NC}  ${YELLOW}Masukkan domain yang akan digunakan:${NC}"
    echo -e "${WHITE}║${NC}  ${CYAN}Contoh: bot.example.com atau example.com${NC}"
    echo -e "${WHITE}║${NC}"
    
    # Read from terminal directly (works even when piped)
    read -p "  ➤ Domain: " DOMAIN < /dev/tty
    
    echo -e "${WHITE}║                                                              ║${NC}"
    echo -e "${WHITE}╚══════════════════════════════════════════════════════════════╝${NC}"
fi

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}  ✗ Domain tidak boleh kosong!${NC}"
    echo -e "${YELLOW}  Cara pakai: sudo ./install.sh domainmu.com${NC}"
    exit 1
fi

# Confirmation
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ KONFIRMASI INSTALASI                   ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  Domain      : ${CYAN}$DOMAIN${NC}"
echo -e "${GREEN}║${NC}  Backend     : ${CYAN}Lovable Cloud (Auto-configured)${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

read -p "Lanjutkan instalasi? (y/n): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Instalasi dibatalkan.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}[1/7]${NC} ${WHITE}Updating system packages...${NC}"
apt update -qq && apt upgrade -y -qq

echo -e "${BLUE}[2/7]${NC} ${WHITE}Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt install -y nodejs -qq

echo -e "${BLUE}[3/7]${NC} ${WHITE}Installing Nginx...${NC}"
apt install -y nginx -qq

echo -e "${BLUE}[4/7]${NC} ${WHITE}Installing Certbot for SSL...${NC}"
apt install -y certbot python3-certbot-nginx -qq

echo -e "${BLUE}[5/7]${NC} ${WHITE}Cloning repository...${NC}"
cd /var/www
rm -rf auto-reply-ai-bot
git clone https://github.com/Senjakun/auto-reply-ai-bot.git
cd auto-reply-ai-bot

echo -e "${BLUE}[6/7]${NC} ${WHITE}Installing dependencies & building...${NC}"

# Create .env with hardcoded Lovable Cloud credentials
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://raddazeyokjhyandpqcz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZGRhemV5b2tqaHlhbmRwcWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NjI4OTMsImV4cCI6MjA4MjEzODg5M30.iEts6HenknKJV8yY3-FrvXgGioud5tfMwQigmwZRYss
EOF

npm install --silent
npm run build

echo -e "${BLUE}[7/7]${NC} ${WHITE}Configuring Nginx...${NC}"

# Create Nginx config
cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    root /var/www/auto-reply-ai-bot/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║           ✅ INSTALASI BERHASIL!                             ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${WHITE}Website:${NC} ${CYAN}http://$DOMAIN${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  ${YELLOW}📌 LANGKAH SELANJUTNYA:${NC}                                    ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${WHITE}1. Setting DNS di domain registrar kamu:${NC}                   ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     ${CYAN}A Record:  @    →  $SERVER_IP${NC}"
echo -e "${GREEN}║${NC}     ${CYAN}A Record:  www  →  $SERVER_IP${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${WHITE}2. Setelah DNS aktif, jalankan untuk HTTPS:${NC}                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     ${CYAN}sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
