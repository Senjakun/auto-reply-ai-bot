import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Helper to send Telegram message
async function sendTelegramMessage(chatId: number, text: string, parseMode = 'HTML') {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  })
}

// Get setting from database
async function getSetting(key: string): Promise<any> {
  const { data } = await supabase
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .single()
  return data?.setting_value
}

// Set setting in database
async function setSetting(key: string, value: any) {
  const { data: existing } = await supabase
    .from('site_settings')
    .select('id')
    .eq('setting_key', key)
    .single()

  if (existing) {
    await supabase
      .from('site_settings')
      .update({ setting_value: value, updated_at: new Date().toISOString() })
      .eq('setting_key', key)
  } else {
    await supabase
      .from('site_settings')
      .insert({ setting_key: key, setting_value: value })
  }
}

// Get owner ID from settings
async function getOwnerId(): Promise<number | null> {
  const settings = await getSetting('telegram_bot')
  return settings?.owner_id || null
}

// Check if user is owner
async function isOwner(userId: number): Promise<boolean> {
  const ownerId = await getOwnerId()
  return ownerId === userId
}

// Get Microsoft credentials from database
async function getMicrosoftCredentials() {
  const creds = await getSetting('microsoft_credentials')
  return creds || {}
}

// Get access token using refresh token
async function getAccessToken(): Promise<string | null> {
  const creds = await getMicrosoftCredentials()
  
  if (!creds.client_id || !creds.client_secret || !creds.tenant_id || !creds.refresh_token) {
    return null
  }

  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${creds.tenant_id}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: creds.client_id,
          client_secret: creds.client_secret,
          refresh_token: creds.refresh_token,
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/.default offline_access',
        }),
      }
    )

    const data = await response.json()
    
    if (data.access_token) {
      // Update refresh token if new one provided
      if (data.refresh_token && data.refresh_token !== creds.refresh_token) {
        await setSetting('microsoft_credentials', {
          ...creds,
          refresh_token: data.refresh_token,
        })
      }
      return data.access_token
    }
    return null
  } catch (error) {
    console.error('Error getting access token:', error)
    return null
  }
}

// Fetch Outlook inbox notifications
async function fetchOutlookInbox(): Promise<any[]> {
  const accessToken = await getAccessToken()
  
  if (!accessToken) {
    throw new Error('Microsoft credentials not configured or invalid')
  }

  try {
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=10&$orderby=receivedDateTime desc&$select=subject,from,receivedDateTime,isRead,bodyPreview',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status}`)
    }

    const data = await response.json()
    return data.value || []
  } catch (error) {
    console.error('Error fetching inbox:', error)
    throw error
  }
}

// Format email for Telegram
function formatEmail(email: any): string {
  const from = email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown'
  const subject = email.subject || '(No Subject)'
  const date = new Date(email.receivedDateTime).toLocaleString('id-ID')
  const preview = email.bodyPreview?.substring(0, 150) || ''
  const readStatus = email.isRead ? '✓' : '🔵'
  
  return `${readStatus} <b>${escapeHtml(subject)}</b>\n` +
    `📧 From: ${escapeHtml(from)}\n` +
    `📅 ${date}\n` +
    `${escapeHtml(preview)}${preview.length >= 150 ? '...' : ''}`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Handle commands
async function handleCommand(chatId: number, userId: number, text: string) {
  const [command, ...args] = text.split(' ')
  const arg = args.join(' ')

  // Check if owner is set
  const ownerId = await getOwnerId()

  // First-time setup - set owner
  if (!ownerId && command === '/start') {
    await setSetting('telegram_bot', { owner_id: userId })
    await sendTelegramMessage(
      chatId,
      `✅ <b>Bot berhasil diaktifkan!</b>\n\n` +
      `Anda sekarang adalah owner bot.\n` +
      `User ID Anda: <code>${userId}</code>\n\n` +
      `<b>Setup Microsoft Outlook:</b>\n` +
      `/setclient [client_id] - Set Client ID\n` +
      `/setsecret [client_secret] - Set Client Secret\n` +
      `/settenant [tenant_id] - Set Tenant ID\n` +
      `/setrefresh [refresh_token] - Set Refresh Token\n\n` +
      `<b>Commands:</b>\n` +
      `/inbox - Cek inbox Outlook\n` +
      `/status - Cek status konfigurasi\n` +
      `/help - Bantuan`
    )
    return
  }

  // Check owner for admin commands
  const isOwnerUser = await isOwner(userId)

  switch (command) {
    case '/start':
      if (isOwnerUser) {
        await sendTelegramMessage(
          chatId,
          `👋 <b>Selamat datang, Owner!</b>\n\n` +
          `<b>Commands:</b>\n` +
          `/inbox - Cek inbox Outlook\n` +
          `/status - Cek status konfigurasi\n` +
          `/setclient - Set Microsoft Client ID\n` +
          `/setsecret - Set Microsoft Client Secret\n` +
          `/settenant - Set Microsoft Tenant ID\n` +
          `/setrefresh - Set Microsoft Refresh Token\n` +
          `/help - Bantuan`
        )
      } else {
        await sendTelegramMessage(chatId, '⛔ Anda tidak memiliki akses ke bot ini.')
      }
      break

    case '/help':
      if (!isOwnerUser) {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
        return
      }
      await sendTelegramMessage(
        chatId,
        `📖 <b>Panduan Bot Outlook</b>\n\n` +
        `<b>Setup Microsoft Azure:</b>\n` +
        `1. Buat App di Azure Portal\n` +
        `2. Dapatkan Client ID, Client Secret, Tenant ID\n` +
        `3. Generate Refresh Token dengan OAuth flow\n` +
        `4. Set semua credentials via commands\n\n` +
        `<b>Commands:</b>\n` +
        `/inbox - Lihat 10 email terbaru\n` +
        `/status - Cek status konfigurasi\n` +
        `/setclient [value] - Set Client ID\n` +
        `/setsecret [value] - Set Client Secret\n` +
        `/settenant [value] - Set Tenant ID\n` +
        `/setrefresh [value] - Set Refresh Token`
      )
      break

    case '/status':
      if (!isOwnerUser) {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
        return
      }
      const creds = await getMicrosoftCredentials()
      const status = `📊 <b>Status Konfigurasi</b>\n\n` +
        `Client ID: ${creds.client_id ? '✅ Set' : '❌ Belum'}\n` +
        `Client Secret: ${creds.client_secret ? '✅ Set' : '❌ Belum'}\n` +
        `Tenant ID: ${creds.tenant_id ? '✅ Set' : '❌ Belum'}\n` +
        `Refresh Token: ${creds.refresh_token ? '✅ Set' : '❌ Belum'}`
      await sendTelegramMessage(chatId, status)
      break

    case '/setclient':
      if (!isOwnerUser) {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
        return
      }
      if (!arg) {
        await sendTelegramMessage(chatId, '❌ Gunakan: /setclient [client_id]')
        return
      }
      const currentCreds1 = await getMicrosoftCredentials()
      await setSetting('microsoft_credentials', { ...currentCreds1, client_id: arg })
      await sendTelegramMessage(chatId, '✅ Client ID berhasil disimpan!')
      break

    case '/setsecret':
      if (!isOwnerUser) {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
        return
      }
      if (!arg) {
        await sendTelegramMessage(chatId, '❌ Gunakan: /setsecret [client_secret]')
        return
      }
      const currentCreds2 = await getMicrosoftCredentials()
      await setSetting('microsoft_credentials', { ...currentCreds2, client_secret: arg })
      await sendTelegramMessage(chatId, '✅ Client Secret berhasil disimpan!')
      break

    case '/settenant':
      if (!isOwnerUser) {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
        return
      }
      if (!arg) {
        await sendTelegramMessage(chatId, '❌ Gunakan: /settenant [tenant_id]')
        return
      }
      const currentCreds3 = await getMicrosoftCredentials()
      await setSetting('microsoft_credentials', { ...currentCreds3, tenant_id: arg })
      await sendTelegramMessage(chatId, '✅ Tenant ID berhasil disimpan!')
      break

    case '/setrefresh':
      if (!isOwnerUser) {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
        return
      }
      if (!arg) {
        await sendTelegramMessage(chatId, '❌ Gunakan: /setrefresh [refresh_token]')
        return
      }
      const currentCreds4 = await getMicrosoftCredentials()
      await setSetting('microsoft_credentials', { ...currentCreds4, refresh_token: arg })
      await sendTelegramMessage(chatId, '✅ Refresh Token berhasil disimpan!')
      break

    case '/inbox':
      if (!isOwnerUser) {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
        return
      }
      try {
        await sendTelegramMessage(chatId, '⏳ Mengambil email...')
        const emails = await fetchOutlookInbox()
        
        if (emails.length === 0) {
          await sendTelegramMessage(chatId, '📭 Inbox kosong.')
          return
        }

        for (const email of emails) {
          await sendTelegramMessage(chatId, formatEmail(email))
        }
        
        await sendTelegramMessage(chatId, `📬 Menampilkan ${emails.length} email terbaru.`)
      } catch (error: any) {
        await sendTelegramMessage(
          chatId,
          `❌ Error: ${error.message}\n\nPastikan kredensial Microsoft sudah dikonfigurasi dengan benar. Gunakan /status untuk cek.`
        )
      }
      break

    default:
      if (isOwnerUser) {
        await sendTelegramMessage(chatId, '❓ Command tidak dikenal. Gunakan /help untuk bantuan.')
      }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const update = await req.json()
    
    if (update.message) {
      const chatId = update.message.chat.id
      const userId = update.message.from.id
      const text = update.message.text || ''

      if (text.startsWith('/')) {
        await handleCommand(chatId, userId, text)
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
