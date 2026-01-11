#!/bin/bash

# Pterodactyl Entrypoint Script for Auto Reply AI Bot

cd /home/container

# Generate config.json from environment variables
echo "Generating config.json..."
cat > config.json << EOF
{
  "bot_token": "${BOT_TOKEN:-}",
  "owner_id": ${OWNER_ID:-0},
  "allowed_users": [${OWNER_ID:-0}],
  "sheerid_program_id": "${SHEERID_PROGRAM_ID:-}",
  "microsoft": {
    "client_id": "${MS_CLIENT_ID:-}",
    "client_secret": "${MS_CLIENT_SECRET:-}"
  },
  "supabase": {
    "url": "${SUPABASE_URL:-}",
    "anon_key": "${SUPABASE_ANON_KEY:-}"
  }
}
EOF

echo "Config generated successfully!"

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "Building project..."
    npm run build
fi

# Start the bot
echo "Starting Auto Reply AI Bot..."
exec node ${STARTUP_FILE:-dist/server.js}
