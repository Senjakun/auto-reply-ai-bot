# 🎖️ Military Verification Telegram Bot

A standalone Deno-based Telegram bot for military verification with SheerID integration.

## Features

- 🔐 **Access Control** - Owner and allowed users system
- 🎖️ **Military Verification** - SheerID integration for verification
- 👥 **User Management** - Add/remove allowed users dynamically
- 📢 **Broadcast** - Send messages to all users
- 🔄 **Polling Mode** - Works without webhook/domain

## Quick Start

### Prerequisites

- [Deno](https://deno.land/) installed on your system
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- Your Telegram User ID (get from [@userinfobot](https://t.me/userinfobot))

### Installation

```bash
# Clone the repository
git clone https://github.com/Senjakun/auto-reply-ai-bot.git
cd auto-reply-ai-bot

# Run interactive setup
deno run --allow-all setup.ts

# Start the bot
deno run --allow-all bot.ts
```

### Manual Configuration

If you prefer manual setup, copy the example config:

```bash
cp config.json.example config.json
```

Edit `config.json`:

```json
{
  "bot_token": "YOUR_BOT_TOKEN_FROM_BOTFATHER",
  "owner_id": 123456789,
  "allowed_users": [],
  "sheerid_program_id": "YOUR_SHEERID_PROGRAM_ID"
}
```

## Commands

### User Commands
| Command | Description |
|---------|-------------|
| `/start` | Welcome message and menu |
| `/verify` | Get military verification link |
| `/status` | Check your access status |
| `/help` | Show help message |

### Owner Commands
| Command | Description |
|---------|-------------|
| `/adduser [id]` | Add user to allowed list |
| `/removeuser [id]` | Remove user from allowed list |
| `/users` | List all allowed users |
| `/broadcast [msg]` | Send message to all users |

## VPS Deployment

### Using systemd

1. Create service file:

```bash
sudo nano /etc/systemd/system/military-bot.service
```

```ini
[Unit]
Description=Military Verification Telegram Bot
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/auto-reply-ai-bot
ExecStart=/home/your-username/.deno/bin/deno run --allow-all bot.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. Enable and start:

```bash
sudo systemctl enable military-bot
sudo systemctl start military-bot
sudo systemctl status military-bot
```

### Using Docker

```dockerfile
FROM denoland/deno:latest
WORKDIR /app
COPY . .
CMD ["run", "--allow-all", "bot.ts"]
```

```bash
docker build -t military-bot .
docker run -d --name military-bot -v $(pwd)/config.json:/app/config.json military-bot
```

## Configuration

| Field | Type | Description |
|-------|------|-------------|
| `bot_token` | string | Telegram Bot API token |
| `owner_id` | number | Your Telegram user ID |
| `allowed_users` | number[] | List of allowed user IDs |
| `sheerid_program_id` | string | SheerID program ID for verification |

## Security

- Never commit `config.json` to git (it's in `.gitignore`)
- Keep your bot token secure
- Only the owner can manage users
- Use allowed_users to restrict access

## License

MIT License
