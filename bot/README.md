# Auto Reply AI Bot

Bot Telegram untuk notifikasi email Outlook dengan sistem approval user.

---

## 🚀 Setup di Pterodactyl

### Step 1: Buat Server
Pakai egg **RONZZ YT - NODE** yang kamu punya.

**Settings:**
- **Git Repo Address**: `https://github.com/YOUR_USERNAME/YOUR_REPO`
- **Command Run**: `cd bot && npm install && npm run build && npm start`

### Step 2: Buat config.json

⚠️ **PENTING**: Setelah server ter-clone, masuk ke **File Manager** dan:

1. Copy file `config.example.json` 
2. Rename jadi `config.json`
3. Edit isinya:

```json
{
  "bot_token": "123456:ABC-TOKEN-DARI-BOTFATHER",
  "owner_id": 123456789,
  "supabase_url": "https://raddazeyokjhyandpqcz.supabase.co",
  "supabase_anon_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZGRhemV5b2tqaHlhbmRwcWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NjI4OTMsImV4cCI6MjA4MjEzODg5M30.iEts6HenknKJV8yY3-FrvXgGioud5tfMwQigmwZRYss",
  "sheerid_program_id": "",
  "ms_client_id": "",
  "ms_client_secret": ""
}
```

### Step 3: Cara Dapat Values

| Field | Cara Dapat |
|-------|-----------|
| `bot_token` | Chat **@BotFather** → `/newbot` |
| `owner_id` | Chat **@userinfobot** atau **@getidsbot** |
| `supabase_url` | **SUDAH TERISI** - jangan diubah |
| `supabase_anon_key` | **SUDAH TERISI** - jangan diubah |
| `ms_client_id` | Azure Portal (opsional, bisa diset via bot) |
| `ms_client_secret` | Azure Portal (opsional, bisa diset via bot) |

### Step 4: Start Server

Setelah `config.json` dibuat, **Restart** server dan bot akan running!

---

## 📋 Bot Commands

### 👑 Owner Commands
| Command | Fungsi |
|---------|--------|
| `/start` | Menu utama |
| `/inbox` | Lihat 5 email terakhir |
| `/approve [id] [hari]` | Approve user (default 30 hari) |
| `/revoke [id]` | Cabut akses user |
| `/users` | List semua approved users |
| `/broadcast [pesan]` | Kirim ke semua user |
| `/setclient [id]` | Set Microsoft Client ID |
| `/setsecret [secret]` | Set Microsoft Client Secret |
| `/setrefresh [token]` | Set Microsoft Refresh Token |

### 👤 User Commands
| Command | Fungsi |
|---------|--------|
| `/start` | Mulai bot |
| `/status` | Cek status akses |
| `/inbox` | Lihat email (perlu approval) |
| `/verify` | Link verifikasi militer |
| `/help` | Bantuan |

---

## 🔧 Setup Microsoft Outlook (Opsional)

Setelah bot running, Owner bisa set credentials via Telegram:

```
/setclient YOUR_MICROSOFT_CLIENT_ID
/setsecret YOUR_MICROSOFT_CLIENT_SECRET  
/setrefresh YOUR_REFRESH_TOKEN
```

---

## ❓ Troubleshooting

### Bot tidak jalan?
1. Cek apakah `config.json` ada (bukan `config.example.json`)
2. Cek format JSON valid (tidak ada koma extra, kutip benar)
3. Cek `bot_token` dan `owner_id` sudah diisi benar

### Error "config.json tidak ditemukan"?
Buat file `config.json` di folder bot. Copy dari `config.example.json`.

### Error JSON parse?
Pastikan format JSON benar. Gunakan validator online jika perlu.

---

## 📁 Struktur File

```
/bot
├── config.example.json  ← Template config
├── config.json          ← CONFIG KAMU (buat manual)
├── package.json
├── tsconfig.json
└── src/
    └── server.ts
```
