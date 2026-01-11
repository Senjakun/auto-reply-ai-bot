# 🎖️ Auto Reply AI Bot

Telegram bot for Outlook email auto-reply with military verification via SheerID integration. Supports Pterodactyl Panel deployment.

## Features

- 🔐 **Access Control** - Owner and approved users system with expiration
- 🎖️ **Military Verification** - SheerID integration for verification
- 📧 **Outlook Integration** - Microsoft Graph API for email notifications
- 👥 **User Management** - Add/remove approved users with expiry dates
- 📢 **Broadcast** - Send messages to all approved users
- 🔄 **Webhook Mode** - Fast message delivery via webhooks

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v20+ installed on your system
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- Your Telegram User ID (get from [@userinfobot](https://t.me/userinfobot))

### Installation

```bash
# Clone the repository
git clone https://github.com/Senjakun/auto-reply-ai-bot.git
cd auto-reply-ai-bot

# Install dependencies
npm install

# Build the project
npm run build

# Start the bot
npm start
```

### Environment Variables

Create a `.env` file or set these environment variables:

```env
BOT_TOKEN=your_telegram_bot_token
OWNER_ID=your_telegram_user_id
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
MS_CLIENT_ID=your_microsoft_client_id
MS_CLIENT_SECRET=your_microsoft_client_secret
SHEERID_PROGRAM_ID=your_sheerid_program_id
```

## Commands

### User Commands
| Command | Description |
|---------|-------------|
| `/start` | Welcome message and menu |
| `/verify` | Get military verification link |
| `/status` | Check your access status |
| `/inbox` | View recent emails (approved users) |
| `/help` | Show help message |

### Owner Commands
| Command | Description |
|---------|-------------|
| `/approve [id] [days]` | Approve user with expiry |
| `/revoke [id]` | Revoke user access |
| `/users` | List all approved users |
| `/broadcast [msg]` | Send message to all users |
| `/setclient` | Configure Microsoft credentials |
| `/check` | Manual check for new emails |

## Pterodactyl Panel Deployment

### Installing the Egg

1. Login to Pterodactyl Admin Panel
2. Go to **Nests** → Select or create a nest
3. Click **Import Egg**
4. Upload `pterodactyl/egg-auto-reply-bot-v2.json`

### Creating Server

1. Go to **Servers** → **Create New**
2. Select the nest with the egg
3. Select **Egg**: `Auto Reply AI Bot v2`
4. Set resources:
   - **RAM**: Minimum 256MB (recommended 512MB)
   - **Disk**: Minimum 500MB
   - **CPU**: 50-100%
5. Fill in **Startup Variables**:
   - `Bot Token`: Token from @BotFather
   - `Owner ID`: Your Telegram User ID
   - Other variables as needed

### Starting Server

1. Click **Install** and wait for completion
2. Click **Start** to run the bot

## VPS Deployment

### Using systemd

1. Create service file:

```bash
sudo nano /etc/systemd/system/auto-reply-bot.service
```

```ini
[Unit]
Description=Auto Reply AI Bot
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/auto-reply-ai-bot
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
Environment=BOT_TOKEN=your_token
Environment=OWNER_ID=your_id

[Install]
WantedBy=multi-user.target
```

2. Enable and start:

```bash
sudo systemctl enable auto-reply-bot
sudo systemctl start auto-reply-bot
sudo systemctl status auto-reply-bot
```

### Using Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["node", "dist/server.js"]
```

```bash
docker build -t auto-reply-bot .
docker run -d --name auto-reply-bot \
  -e BOT_TOKEN=your_token \
  -e OWNER_ID=your_id \
  auto-reply-bot
```

### Using Install Script

For quick VPS setup:

```bash
curl -fsSL https://raw.githubusercontent.com/Senjakun/auto-reply-ai-bot/main/install.sh | sudo bash
```

## Configuration

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `BOT_TOKEN` | string | ✅ | Telegram Bot API token |
| `OWNER_ID` | number | ✅ | Your Telegram user ID |
| `SUPABASE_URL` | string | ❌ | Supabase project URL |
| `SUPABASE_ANON_KEY` | string | ❌ | Supabase anon key |
| `MS_CLIENT_ID` | string | ❌ | Microsoft Azure App Client ID |
| `MS_CLIENT_SECRET` | string | ❌ | Microsoft Azure App Client Secret |
| `SHEERID_PROGRAM_ID` | string | ❌ | SheerID program ID |

## Security

- Never commit `.env` or secrets to git
- Keep your bot token secure
- Only the owner can manage users
- Use approved users with expiration dates

## License

MIT License
