# Pterodactyl Panel Installation Guide

## 🥚 Installing the Egg

### Step 1: Import Egg
1. Login ke Pterodactyl Admin Panel
2. Pergi ke **Nests** → Pilih nest atau buat baru
3. Klik **Import Egg**
4. Upload file `egg-auto-reply-bot.json`

### Step 2: Create Server
1. Pergi ke **Servers** → **Create New**
2. Pilih **Nest** yang sudah ada egg-nya
3. Pilih **Egg**: `Auto Reply AI Bot`
4. Set resources:
   - **RAM**: Minimal 256MB (rekomendasi 512MB)
   - **Disk**: Minimal 500MB
   - **CPU**: 50-100%
5. Isi **Startup Variables**:
   - `Bot Token`: Token dari @BotFather
   - `Owner ID`: Telegram User ID kamu
   - `SheerID Program ID`: (opsional) untuk verifikasi militer
   - `Microsoft Client ID`: (opsional) untuk Outlook
   - `Microsoft Client Secret`: (opsional) untuk Outlook
   - `Supabase URL`: URL project Supabase
   - `Supabase Anon Key`: Anon key Supabase

### Step 3: Start Server
1. Klik **Install** lalu tunggu sampai selesai
2. Klik **Start** untuk menjalankan bot

---

## 📁 File Structure

```
/home/container/
├── config.json          # Auto-generated dari env variables
├── dist/               # Compiled JavaScript
│   └── server.js       # Main entry point
├── node_modules/       # Dependencies
└── package.json        # NPM config
```

---

## ⚙️ Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BOT_TOKEN` | Telegram Bot Token | ✅ |
| `OWNER_ID` | Your Telegram User ID | ✅ |
| `SHEERID_PROGRAM_ID` | SheerID Program ID | ❌ |
| `MS_CLIENT_ID` | Microsoft Client ID | ❌ |
| `MS_CLIENT_SECRET` | Microsoft Client Secret | ❌ |
| `SUPABASE_URL` | Supabase Project URL | ❌ |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | ❌ |

---

## 🔧 Troubleshooting

### Bot tidak start
1. Cek Console untuk error message
2. Pastikan `Bot Token` valid
3. Pastikan `Owner ID` adalah angka

### Permission denied
- Restart server dari panel
- Reinstall jika masih error

### Memory issues
- Naikkan RAM allocation ke 512MB atau lebih

---

## 🔄 Update Bot

1. Buka **File Manager** di panel
2. Hapus folder `node_modules` dan `dist`
3. Klik **Reinstall Server**
4. Bot akan download versi terbaru

---

## 📞 Support

- GitHub: https://github.com/Senjakun/auto-reply-ai-bot
- Issues: https://github.com/Senjakun/auto-reply-ai-bot/issues
