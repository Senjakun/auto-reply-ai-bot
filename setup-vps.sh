#!/bin/bash

# Colors for beautiful console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Clear screen
clear

# ASCII Art Banner
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     █████╗ ██╗   ██╗████████╗ ██████╗     █████╗ ██╗          ║"
echo "║    ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗   ██╔══██╗██║          ║"
echo "║    ███████║██║   ██║   ██║   ██║   ██║   ███████║██║          ║"
echo "║    ██╔══██║██║   ██║   ██║   ██║   ██║   ██╔══██║██║          ║"
echo "║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝   ██║  ██║██║          ║"
echo "║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝    ╚═╝  ╚═╝╚═╝          ║"
echo "║                                                               ║"
echo "║              🤖 Auto Reply AI Bot Installer 🤖                ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}                    VPS SETUP DASHBOARD                         ${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get domain input
echo -e "${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│${NC}  ${WHITE}Masukkan domain yang akan dihubungkan:${NC}                     ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}  ${PURPLE}Contoh: example.com atau subdomain.example.com${NC}             ${CYAN}│${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""
read -p "$(echo -e ${GREEN}➜${NC} Domain: )" DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Domain tidak boleh kosong!${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│${NC}  ${WHITE}Masukkan Supabase URL:${NC}                                     ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}  ${PURPLE}Contoh: https://xxxxx.supabase.co${NC}                          ${CYAN}│${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""
read -p "$(echo -e ${GREEN}➜${NC} Supabase URL: )" SUPABASE_URL

echo ""
echo -e "${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│${NC}  ${WHITE}Masukkan Supabase Anon Key:${NC}                                ${CYAN}│${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""
read -p "$(echo -e ${GREEN}➜${NC} Supabase Anon Key: )" SUPABASE_KEY

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}                    KONFIGURASI ANDA                            ${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}📌 Domain:${NC}        $DOMAIN"
echo -e "  ${CYAN}🔗 Supabase URL:${NC}  $SUPABASE_URL"
echo -e "  ${CYAN}🔑 Anon Key:${NC}      ${SUPABASE_KEY:0:20}..."
echo ""

read -p "$(echo -e ${YELLOW}Lanjutkan instalasi? [Y/n]:${NC} )" CONFIRM
CONFIRM=${CONFIRM:-Y}

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Instalasi dibatalkan${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}                  MEMULAI INSTALASI...                          ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Update system
echo -e "${BLUE}[1/7]${NC} 📦 Updating system packages..."
apt-get update -qq > /dev/null 2>&1
echo -e "${GREEN}  ✓ System updated${NC}"

# Step 2: Install Node.js
echo -e "${BLUE}[2/7]${NC} 📦 Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
    echo -e "${GREEN}  ✓ Node.js $(node -v) installed${NC}"
else
    echo -e "${GREEN}  ✓ Node.js $(node -v) already installed${NC}"
fi

# Step 3: Install nginx
echo -e "${BLUE}[3/7]${NC} 📦 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx > /dev/null 2>&1
    echo -e "${GREEN}  ✓ Nginx installed${NC}"
else
    echo -e "${GREEN}  ✓ Nginx already installed${NC}"
fi

# Step 4: Install certbot for SSL
echo -e "${BLUE}[4/7]${NC} 🔒 Installing Certbot for SSL..."
apt-get install -y certbot python3-certbot-nginx > /dev/null 2>&1
echo -e "${GREEN}  ✓ Certbot installed${NC}"

# Step 5: Install dependencies and build
echo -e "${BLUE}[5/7]${NC} 📦 Installing project dependencies..."
npm install > /dev/null 2>&1
echo -e "${GREEN}  ✓ Dependencies installed${NC}"

# Create .env file
echo -e "${BLUE}[5.5/7]${NC} 📝 Creating environment file..."
cat > .env << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_KEY
EOF
echo -e "${GREEN}  ✓ Environment file created${NC}"

# Build project
echo -e "${BLUE}[6/7]${NC} 🔨 Building project..."
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}  ✗ Build failed! Check errors above.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Project built successfully${NC}"

# Step 6: Configure nginx
echo -e "${BLUE}[7/7]${NC} ⚙️  Configuring Nginx..."

# Get the current directory
APP_DIR=$(pwd)

# Create nginx config
cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    root $APP_DIR/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t > /dev/null 2>&1
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo -e "${GREEN}  ✓ Nginx configured${NC}"
else
    echo -e "${RED}  ✗ Nginx config error${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}                  🎉 INSTALASI SELESAI! 🎉                       ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│${NC}  ${WHITE}Website kamu sekarang bisa diakses di:${NC}                     ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}  ${GREEN}➜ http://$DOMAIN${NC}"
echo -e "${CYAN}│${NC}                                                             ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}  ${YELLOW}⚠️  Untuk mengaktifkan HTTPS (SSL), jalankan:${NC}              ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}  ${PURPLE}sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${YELLOW}📋 DNS yang perlu di-set di domain registrar kamu:${NC}"
echo -e "   ${WHITE}A Record:${NC}  @ → $(curl -s ifconfig.me)"
echo -e "   ${WHITE}A Record:${NC}  www → $(curl -s ifconfig.me)"
echo ""
echo -e "${PURPLE}Terima kasih telah menggunakan Auto Reply AI Bot! 🤖${NC}"
echo ""
