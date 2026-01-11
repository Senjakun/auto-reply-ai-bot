import TelegramBot from 'node-telegram-bot-api';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

// Configuration from environment variables
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const OWNER_ID = parseInt(process.env.OWNER_ID || '0');
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SHEERID_PROGRAM_ID = process.env.SHEERID_PROGRAM_ID || '';
const MS_CLIENT_ID = process.env.MS_CLIENT_ID || '';
const MS_CLIENT_SECRET = process.env.MS_CLIENT_SECRET || '';

// Validate required config
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is required!');
  process.exit(1);
}

if (!OWNER_ID) {
  console.error('❌ OWNER_ID is required!');
  process.exit(1);
}

// Initialize Supabase client (optional)
let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase connected');
}

// Initialize Telegram Bot with polling
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Bot is starting...');

// Helper functions
function isOwner(userId: number): boolean {
  return userId === OWNER_ID;
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
  if (!supabase) return null;
  
  const { data } = await supabase
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .single();
  
  return data?.setting_value;
}

async function setSetting(key: string, value: any): Promise<void> {
  if (!supabase) return;
  
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
  if (!supabase) return false;
  
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
  if (!supabase) return [];
  
  const { data } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString());
  
  return data || [];
}

async function approveUser(telegramId: number, username: string | null, days: number): Promise<void> {
  if (!supabase) return;
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  
  await supabase
    .from('telegram_users')
    .upsert({
      telegram_id: telegramId,
      telegram_username: username,
      approved_by: OWNER_ID,
      approved_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      is_active: true
    }, { onConflict: 'telegram_id' });
}

async function revokeUser(telegramId: number): Promise<void> {
  if (!supabase) return;
  
  await supabase
    .from('telegram_users')
    .update({ is_active: false })
    .eq('telegram_id', telegramId);
}

// Microsoft Graph API functions
async function getAccessToken(): Promise<string | null> {
  const credentials = await getSetting('microsoft_credentials');
  if (!credentials?.refresh_token) return null;
  
  const clientId = MS_CLIENT_ID || credentials.client_id;
  const clientSecret = MS_CLIENT_SECRET || credentials.client_secret;
  
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
    
    const data: TokenResponse = await response.json();
    
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
    
    const data: GraphMailResponse = await response.json();
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
  const username = msg.from?.username || null;
  
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
  
  if (SHEERID_PROGRAM_ID) {
    welcomeText += `\n\n/verify - Verifikasi militer`;
  }
  
  await bot.sendMessage(chatId, welcomeText, { parse_mode: 'HTML' });
});

bot.onText(/\/verify/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (!SHEERID_PROGRAM_ID) {
    await bot.sendMessage(chatId, '❌ Verifikasi militer tidak dikonfigurasi.');
    return;
  }
  
  const verifyUrl = `https://verify.sheerid.com/${SHEERID_PROGRAM_ID}`;
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
  
  if (!supabase) {
    await bot.sendMessage(chatId, '❌ Database tidak terhubung.');
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
console.log('✅ Bot is running!');
console.log(`👤 Owner ID: ${OWNER_ID}`);
console.log(`📡 Supabase: ${supabase ? 'Connected' : 'Not configured'}`);
