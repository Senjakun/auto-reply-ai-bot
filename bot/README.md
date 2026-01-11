# Auto Reply AI Bot (Standalone)

Bot Telegram standalone untuk Pterodactyl Panel.

## Quick Start

```bash
cd bot
npm install
npm run build
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_TOKEN` | ✅ | Telegram Bot Token |
| `OWNER_ID` | ✅ | Your Telegram User ID |
| `SUPABASE_URL` | ❌ | Supabase Project URL |
| `SUPABASE_ANON_KEY` | ❌ | Supabase Anon Key |
| `SHEERID_PROGRAM_ID` | ❌ | SheerID Program ID |
| `MS_CLIENT_ID` | ❌ | Microsoft Client ID |
| `MS_CLIENT_SECRET` | ❌ | Microsoft Client Secret |

## Commands

### User Commands
- `/start` - Welcome message
- `/status` - Check access status
- `/inbox` - View emails
- `/verify` - Military verification link
- `/help` - Help message

### Owner Commands
- `/approve [id] [days]` - Approve user
- `/revoke [id]` - Revoke access
- `/users` - List approved users
- `/broadcast [msg]` - Broadcast message

## Pterodactyl Setup

1. Upload egg `pterodactyl/egg-auto-reply-bot-v2.json`
2. Create server with the egg
3. Set startup file to `bot/dist/server.js`
4. Configure variables
5. Start server
