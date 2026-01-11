# Auto Reply AI Bot

Bot Telegram untuk notifikasi email Outlook dengan verifikasi militer.

---

## 🚀 Deploy ke Pterodactyl (Generic Node.js Egg)

### Step 1: Buat Server Baru
- Buat server dengan **egg Node.js Generic**
- Pilih versi Node.js **18+**

### Step 2: Set GIT REPO ADDRESS
```
https://github.com/AhmadMHawwash/auto-reply-ai
```

### Step 3: Set COMMAND RUN (STARTUP COMMAND)
**Copy persis seperti ini:**
```bash
cd bot && npm install && npm run build && BOT_TOKEN={{BOT_TOKEN}} OWNER_ID={{OWNER_ID}} SUPABASE_URL={{SUPABASE_URL}} SUPABASE_ANON_KEY={{SUPABASE_ANON_KEY}} node dist/server.js
```

### Step 4: Tambah Variables di Startup
Klik tab **Startup** → scroll ke bawah → tambah di bagian variables:

| Variable Name | Default Value | Description |
|---------------|---------------|-------------|
| BOT_TOKEN | (kosong) | Token dari @BotFather |
| OWNER_ID | (kosong) | User ID Telegram kamu |
| SUPABASE_URL | (kosong) | URL Supabase |
| SUPABASE_ANON_KEY | (kosong) | Anon Key Supabase |

### Step 5: Reinstall & Start
1. Klik **Reinstall Server**
2. Tunggu proses clone, install, build
3. Start server

---

## 📋 Bot Commands

### Owner
- `/start` - Menu utama
- `/inbox` - Lihat 5 email terakhir
- `/approve [id] [hari]` - Approve user (default 30 hari)
- `/revoke [id]` - Cabut akses user
- `/users` - List semua approved users
- `/broadcast [pesan]` - Kirim ke semua user
- `/status` - Status bot

### User
- `/start` - Mulai bot
- `/status` - Cek status akses
- `/inbox` - Lihat email (jika approved)
- `/verify` - Link verifikasi militer
- `/help` - Bantuan

---

## 🔧 Setup Microsoft Outlook

Setelah bot running, jalankan command ini via Telegram:
```
/setclient YOUR_MICROSOFT_CLIENT_ID
/setsecret YOUR_MICROSOFT_CLIENT_SECRET  
/setrefresh YOUR_REFRESH_TOKEN
```

---

## 🗄️ Supabase

Bot butuh tables (sudah tersedia di Lovable Cloud):
- `telegram_users` - Data user yang approved
- `site_settings` - Konfigurasi bot (MS credentials, dll)
