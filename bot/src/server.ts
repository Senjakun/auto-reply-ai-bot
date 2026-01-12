import TelegramBot from 'node-telegram-bot-api';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIG FILE LOADER
// ============================================
interface Config {
  bot_token: string;
  owner_id: number;
  supabase_url: string;
  supabase_anon_key: string;
  sheerid_program_id?: string;
  ms_client_id?: string;
  ms_client_secret?: string;
}

function loadConfig(): Config {
  const configPath = path.join(process.cwd(), 'config.json');
  
  // Check if config.json exists
  if (!fs.existsSync(configPath)) {
    console.error('═══════════════════════════════════════════');
    console.error('❌ ERROR: config.json tidak ditemukan!');
    console.error('═══════════════════════════════════════════');
    console.log('\n📝 Cara Setup:');
    console.log('1. Copy file config.example.json ke config.json');
    console.log('2. Edit config.json dan isi nilai-nilai yang diperlukan\n');
    console.log('Contoh config.json:');
    console.log(JSON.stringify({
      bot_token: "123456:ABC-YOUR-BOT-TOKEN",
      owner_id: 123456789,
      supabase_url: "https://xxx.supabase.co",
      supabase_anon_key: "eyJhbGc..."
    }, null, 2));
    process.exit(1);
  }
  
  try {
    const configRaw = fs.readFileSync(configPath, 'utf-8');
    const config: Config = JSON.parse(configRaw);
    
    // Validate required fields
    const errors: string[] = [];
    
    if (!config.bot_token || config.bot_token.includes('YOUR')) {
      errors.push('bot_token - Token dari @BotFather');
    }
    if (!config.owner_id || config.owner_id === 123456789) {
      errors.push('owner_id - ID Telegram kamu (dari @userinfobot)');
    }
    if (!config.supabase_url || config.supabase_url.includes('xxx')) {
      errors.push('supabase_url - URL database');
    }
    if (!config.supabase_anon_key || config.supabase_anon_key.length < 100) {
      errors.push('supabase_anon_key - Key database (panjang ~200 karakter)');
    }
    
    if (errors.length > 0) {
      console.error('═══════════════════════════════════════════');
      console.error('❌ ERROR: config.json tidak lengkap!');
      console.error('═══════════════════════════════════════════');
      console.log('\n⚠️ Field yang perlu diisi:');
      errors.forEach(e => console.log(`   • ${e}`));
      console.log('\n📁 Edit file config.json dan isi nilai yang benar.');
      process.exit(1);
    }
    
    return config;
  } catch (error) {
    console.error('═══════════════════════════════════════════');
    console.error('❌ ERROR: config.json tidak valid!');
    console.error('═══════════════════════════════════════════');
    console.error('\nPastikan format JSON benar (periksa koma, kutip, dll)');
    console.error('Error:', error);
    process.exit(1);
  }
}

// Load config
const config = loadConfig();
console.log('✅ Config loaded dari config.json');

// Type definitions for API responses
interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: string;
}

interface GraphMailResponse {
  value?: any[];
  error?: { message: string };
}

// Initialize Supabase client
const supabase: SupabaseClient = createClient(config.supabase_url, config.supabase_anon_key);
console.log('✅ Database connected');

// Initialize Telegram Bot with polling
const bot = new TelegramBot(config.bot_token, { polling: true });

console.log('🤖 Bot starting...');

// Helper functions
function isOwner(userId: number): boolean {
  return userId === config.owner_id;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Database functions
async function getSetting(key: string): Promise<any> {
  const { data } = await supabase
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .single();
  
  return data?.setting_value;
}

async function setSetting(key: string, value: any): Promise<void> {
  await supabase
    .from('site_settings')
    .upsert({
      setting_key: key,
      setting_value: value,
      updated_at: new Date().toISOString()
    }, { onConflict: 'setting_key' });
}

async function isApprovedUser(telegramId: number): Promise<boolean> {
  if (isOwner(telegramId)) return true;
  
  const { data } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('is_active', true)
    .single();
  
  if (!data) return false;
  
  const expiresAt = new Date(data.expires_at);
  return expiresAt > new Date();
}

async function getApprovedUsers(): Promise<any[]> {
  const { data } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString());
  
  return data || [];
}

async function approveUser(telegramId: number, username: string | null, days: number): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  
  await supabase
    .from('telegram_users')
    .upsert({
      telegram_id: telegramId,
      telegram_username: username,
      approved_by: config.owner_id,
      approved_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      is_active: true
    }, { onConflict: 'telegram_id' });
}

async function revokeUser(telegramId: number): Promise<void> {
  await supabase
    .from('telegram_users')
    .update({ is_active: false })
    .eq('telegram_id', telegramId);
}

// Microsoft Graph API functions
async function getAccessToken(): Promise<string | null> {
  const credentials = await getSetting('microsoft_credentials');
  if (!credentials?.refresh_token) return null;
  
  const clientId = config.ms_client_id || credentials.client_id;
  const clientSecret = config.ms_client_secret || credentials.client_secret;
  
  if (!clientId || !clientSecret) return null;
  
  try {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: credentials.refresh_token,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Mail.Read offline_access'
      })
    });
    
    const data = (await response.json()) as TokenResponse;
    
    if (data.refresh_token) {
      await setSetting('microsoft_credentials', {
        ...credentials,
        refresh_token: data.refresh_token
      });
    }
    
    return data.access_token || null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

async function fetchOutlookInbox(limit = 10): Promise<any[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];
  
  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,isRead`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    
    const data = (await response.json()) as GraphMailResponse;
    return data.value || [];
  } catch (error) {
    console.error('Error fetching inbox:', error);
    return [];
  }
}

function formatEmail(email: any): string {
  const from = email.from?.emailAddress?.address || 'Unknown';
  const subject = email.subject || '(No Subject)';
  const date = new Date(email.receivedDateTime).toLocaleString('id-ID');
  const preview = email.bodyPreview?.substring(0, 100) || '';
  const readStatus = email.isRead ? '📭' : '📬';
  
  return `${readStatus} <b>${escapeHtml(subject)}</b>\nDari: ${escapeHtml(from)}\nWaktu: ${date}\n\n${escapeHtml(preview)}...`;
}

// Command handlers
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id || 0;
  
  const isApproved = await isApprovedUser(userId);
  
  let welcomeText = `🎖️ <b>Auto Reply AI Bot</b>\n\n`;
  
  if (isOwner(userId)) {
    welcomeText += `👑 Selamat datang, Owner!\n\n`;
    welcomeText += `<b>Perintah Owner:</b>\n`;
    welcomeText += `/approve [id] [hari] - Approve user\n`;
    welcomeText += `/revoke [id] - Revoke akses user\n`;
    welcomeText += `/users - Lihat semua user\n`;
    welcomeText += `/broadcast [pesan] - Kirim ke semua\n`;
    welcomeText += `/setclient - Set Microsoft credentials\n`;
    welcomeText += `/inbox - Lihat inbox email\n`;
    welcomeText += `/check - Cek email baru\n`;
  } else if (isApproved) {
    welcomeText += `✅ Status: Approved\n\n`;
    welcomeText += `<b>Perintah:</b>\n`;
    welcomeText += `/inbox - Lihat inbox email\n`;
    welcomeText += `/status - Cek status akses\n`;
    welcomeText += `/help - Bantuan\n`;
  } else {
    welcomeText += `❌ Status: Tidak diizinkan\n\n`;
    welcomeText += `Hubungi owner untuk mendapatkan akses.\n`;
    welcomeText += `User ID kamu: <code>${userId}</code>`;
  }
  
  if (config.sheerid_program_id) {
    welcomeText += `\n\n/verify - Verifikasi militer`;
  }
  
  await bot.sendMessage(chatId, welcomeText, { parse_mode: 'HTML' });
});

bot.onText(/\/verify/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (!config.sheerid_program_id) {
    await bot.sendMessage(chatId, '❌ Verifikasi militer tidak dikonfigurasi.');
    return;
  }
  
  const verifyUrl = `https://verify.sheerid.com/${config.sheerid_program_id}`;
  await bot.sendMessage(
    chatId,
    `🎖️ <b>Verifikasi Militer</b>\n\nKlik link berikut untuk verifikasi:\n${verifyUrl}`,
    { parse_mode: 'HTML' }
  );
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id || 0;
  
  if (isOwner(userId)) {
    await bot.sendMessage(chatId, '👑 Kamu adalah Owner - akses penuh!');
    return;
  }
  
  const { data } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('telegram_id', userId)
    .single();
  
  if (!data || !data.is_active) {
    await bot.sendMessage(chatId, `❌ Kamu belum diizinkan.\nUser ID: <code>${userId}</code>`, { parse_mode: 'HTML' });
    return;
  }
  
  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  
  if (expiresAt <= now) {
    await bot.sendMessage(chatId, '❌ Akses kamu sudah expired.');
    return;
  }
  
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  await bot.sendMessage(chatId, `✅ Status: Aktif\n⏰ Sisa: ${daysLeft} hari\n📅 Expired: ${expiresAt.toLocaleDateString('id-ID')}`);
});

bot.onText(/\/inbox/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id || 0;
  
  if (!await isApprovedUser(userId)) {
    await bot.sendMessage(chatId, '❌ Kamu tidak memiliki akses.');
    return;
  }
  
  await bot.sendMessage(chatId, '📨 Mengambil email...');
  
  const emails = await fetchOutlookInbox(5);
  
  if (emails.length === 0) {
    await bot.sendMessage(chatId, '📭 Tidak ada email atau Microsoft belum dikonfigurasi.');
    return;
  }
  
  for (const email of emails) {
    await bot.sendMessage(chatId, formatEmail(email), { parse_mode: 'HTML' });
  }
});

bot.onText(/\/approve (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id || 0;
  
  if (!isOwner(userId)) {
    await bot.sendMessage(chatId, '❌ Hanya owner yang bisa approve user.');
    return;
  }
  
  const args = match?.[1].split(' ') || [];
  const targetId = parseInt(args[0]);
  const days = parseInt(args[1]) || 30;
  
  if (!targetId) {
    await bot.sendMessage(chatId, '❌ Format: /approve [user_id] [hari]\nContoh: /approve 123456789 30');
    return;
  }
  
  await approveUser(targetId, null, days);
  await bot.sendMessage(chatId, `✅ User ${targetId} approved untuk ${days} hari.`);
  
  // Notify user
  try {
    await bot.sendMessage(targetId, `🎉 Selamat! Kamu sudah di-approve untuk ${days} hari.`);
  } catch (e) {
    // User may not have started the bot
  }
});

bot.onText(/\/revoke (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id || 0;
  
  if (!isOwner(userId)) {
    await bot.sendMessage(chatId, '❌ Hanya owner yang bisa revoke user.');
    return;
  }
  
  const targetId = parseInt(match?.[1] || '');
  
  if (!targetId) {
    await bot.sendMessage(chatId, '❌ Format: /revoke [user_id]');
    return;
  }
  
  await revokeUser(targetId);
  await bot.sendMessage(chatId, `✅ User ${targetId} di-revoke.`);
});

bot.onText(/\/users/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id || 0;
  
  if (!isOwner(userId)) {
    await bot.sendMessage(chatId, '❌ Hanya owner yang bisa lihat users.');
    return;
  }
  
  const users = await getApprovedUsers();
  
  if (users.length === 0) {
    await bot.sendMessage(chatId, '📋 Tidak ada approved users.');
    return;
  }
  
  let text = '👥 <b>Approved Users:</b>\n\n';
  for (const user of users) {
    const expires = new Date(user.expires_at).toLocaleDateString('id-ID');
    const username = user.telegram_username ? `@${user.telegram_username}` : 'No username';
    text += `• ${user.telegram_id} (${username})\n  Expires: ${expires}\n`;
  }
  
  await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
});

bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id || 0;
  
  if (!isOwner(userId)) {
    await bot.sendMessage(chatId, '❌ Hanya owner yang bisa broadcast.');
    return;
  }
  
  const message = match?.[1];
  if (!message) {
    await bot.sendMessage(chatId, '❌ Format: /broadcast [pesan]');
    return;
  }
  
  const users = await getApprovedUsers();
  let sent = 0;
  
  for (const user of users) {
    try {
      await bot.sendMessage(user.telegram_id, `📢 <b>Broadcast:</b>\n\n${message}`, { parse_mode: 'HTML' });
      sent++;
    } catch (e) {
      // Skip failed
    }
  }
  
  await bot.sendMessage(chatId, `✅ Broadcast terkirim ke ${sent}/${users.length} users.`);
});

bot.onText(/\/setclient (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id || 0;
  
  if (!isOwner(userId)) {
    await bot.sendMessage(chatId, '❌ Hanya owner.');
    return;
  }
  
  const clientId = match?.[1];
  const current = await getSetting('microsoft_credentials') || {};
  await setSetting('microsoft_credentials', { ...current, client_id: clientId });
  await bot.sendMessage(chatId, '✅ MS Client ID tersimpan.');
});

bot.onText(/\/setsecret (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id || 0;
  
  if (!isOwner(userId)) {
    await bot.sendMessage(chatId, '❌ Hanya owner.');
    return;
  }
  
  const secret = match?.[1];
  const current = await getSetting('microsoft_credentials') || {};
  await setSetting('microsoft_credentials', { ...current, client_secret: secret });
  await bot.sendMessage(chatId, '✅ MS Client Secret tersimpan.');
});

bot.onText(/\/setrefresh (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id || 0;
  
  if (!isOwner(userId)) {
    await bot.sendMessage(chatId, '❌ Hanya owner.');
    return;
  }
  
  const token = match?.[1];
  const current = await getSetting('microsoft_credentials') || {};
  await setSetting('microsoft_credentials', { ...current, refresh_token: token });
  await bot.sendMessage(chatId, '✅ MS Refresh Token tersimpan.');
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  const helpText = `🎖️ <b>Auto Reply AI Bot</b>\n\n` +
    `<b>Perintah Umum:</b>\n` +
    `/start - Menu utama\n` +
    `/status - Cek status akses\n` +
    `/inbox - Lihat inbox email\n` +
    `/verify - Link verifikasi militer\n` +
    `/help - Bantuan\n\n` +
    `<b>Info:</b>\n` +
    `Bot ini untuk notifikasi email Outlook dengan integrasi verifikasi militer SheerID.`;
  
  await bot.sendMessage(chatId, helpText, { parse_mode: 'HTML' });
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

// Startup message
console.log('═══════════════════════════════════════════');
console.log('🤖 BOT STARTED SUCCESSFULLY!');
console.log('═══════════════════════════════════════════');
console.log(`👤 Owner ID: ${config.owner_id}`);
console.log('📡 Database: Connected');
console.log('📨 Polling: Active');
console.log('═══════════════════════════════════════════');
