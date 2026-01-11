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
    .maybeSingle()
  return data?.setting_value
}

// Set setting in database
async function setSetting(key: string, value: any) {
  const { data: existing } = await supabase
    .from('site_settings')
    .select('id')
    .eq('setting_key', key)
    .maybeSingle()

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

// Check if user is approved and not expired
async function isApprovedUser(telegramId: number): Promise<boolean> {
  const { data } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  return !!data
}

// Get all active approved users
async function getApprovedUsers(): Promise<any[]> {
  const { data } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
  return data || []
}

// Approve a user
async function approveUser(telegramId: number, username: string | null, days: number, approvedBy: number) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + days)

  const { data: existing } = await supabase
    .from('telegram_users')
    .select('id')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('telegram_users')
      .update({
        telegram_username: username,
        expires_at: expiresAt.toISOString(),
        approved_by: approvedBy,
        is_active: true,
        approved_at: new Date().toISOString(),
      })
      .eq('telegram_id', telegramId)
  } else {
    await supabase
      .from('telegram_users')
      .insert({
        telegram_id: telegramId,
        telegram_username: username,
        expires_at: expiresAt.toISOString(),
        approved_by: approvedBy,
        is_active: true,
      })
  }
}

// Revoke user access
async function revokeUser(telegramId: number) {
  await supabase
    .from('telegram_users')
    .update({ is_active: false })
    .eq('telegram_id', telegramId)
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
async function fetchOutlookInbox(limit = 10): Promise<any[]> {
  const accessToken = await getAccessToken()
  
  if (!accessToken) {
    throw new Error('Microsoft credentials not configured or invalid')
  }

  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,isRead,bodyPreview`,
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

// Get last tracked email ID
async function getLastEmailId(): Promise<string | null> {
  const { data } = await supabase
    .from('telegram_inbox_tracker')
    .select('last_email_id')
    .order('last_check_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.last_email_id || null
}

// Update last tracked email ID
async function updateLastEmailId(emailId: string) {
  const { data: existing } = await supabase
    .from('telegram_inbox_tracker')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('telegram_inbox_tracker')
      .update({ last_email_id: emailId, last_check_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('telegram_inbox_tracker')
      .insert({ last_email_id: emailId })
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

// Check for new emails and notify all approved users
async function checkAndNotifyNewEmails() {
  try {
    const emails = await fetchOutlookInbox(5)
    if (emails.length === 0) return

    const lastEmailId = await getLastEmailId()
    const latestEmail = emails[0]

    if (!lastEmailId || lastEmailId !== latestEmail.id) {
      // Find new emails (all emails newer than the last tracked one)
      const newEmails: any[] = []
      for (const email of emails) {
        if (email.id === lastEmailId) break
        newEmails.push(email)
      }

      if (newEmails.length > 0) {
        // Update tracker
        await updateLastEmailId(latestEmail.id)

        // Get all approved users
        const approvedUsers = await getApprovedUsers()
        
        // Also notify owner
        const ownerId = await getOwnerId()
        
        // Send notifications
        for (const email of newEmails.reverse()) {
          const message = `📬 <b>Email Baru!</b>\n\n${formatEmail(email)}`
          
          // Notify owner
          if (ownerId) {
            await sendTelegramMessage(ownerId, message)
          }
          
          // Notify approved users
          for (const user of approvedUsers) {
            if (user.telegram_id !== ownerId) {
              await sendTelegramMessage(user.telegram_id, message)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking new emails:', error)
  }
}

// Handle commands
async function handleCommand(chatId: number, userId: number, username: string | null, text: string) {
  const [command, ...args] = text.split(' ')
  const arg = args.join(' ')

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
      `/setclient [client_id]\n` +
      `/setsecret [client_secret]\n` +
      `/settenant [tenant_id]\n` +
      `/setrefresh [refresh_token]\n\n` +
      `<b>User Management:</b>\n` +
      `/approve [user_id] [days] - Approve user\n` +
      `/revoke [user_id] - Revoke access\n` +
      `/users - List approved users\n\n` +
      `<b>Email:</b>\n` +
      `/inbox - Cek inbox\n` +
      `/check - Cek email baru & kirim notif\n` +
      `/status - Status konfigurasi`
    )
    return
  }

  const isOwnerUser = await isOwner(userId)
  const isApproved = await isApprovedUser(userId)
  const hasAccess = isOwnerUser || isApproved

  switch (command) {
    case '/start':
      if (isOwnerUser) {
        await sendTelegramMessage(
          chatId,
          `👋 <b>Selamat datang, Owner!</b>\n\n` +
          `<b>User Management:</b>\n` +
          `/approve [user_id] [days] - Approve user\n` +
          `/revoke [user_id] - Revoke access\n` +
          `/users - List approved users\n\n` +
          `<b>Microsoft Config:</b>\n` +
          `/setclient, /setsecret, /settenant, /setrefresh\n\n` +
          `<b>Email:</b>\n` +
          `/inbox - Lihat inbox\n` +
          `/check - Cek & kirim notif email baru\n` +
          `/status - Status konfigurasi`
        )
      } else if (isApproved) {
        await sendTelegramMessage(
          chatId,
          `👋 <b>Selamat datang!</b>\n\n` +
          `Anda memiliki akses ke notifikasi Outlook.\n\n` +
          `<b>Commands:</b>\n` +
          `/inbox - Lihat inbox\n` +
          `/mystatus - Cek status akses Anda`
        )
      } else {
        await sendTelegramMessage(
          chatId,
          `⛔ <b>Akses Ditolak</b>\n\n` +
          `Anda belum mendapat izin untuk menggunakan bot ini.\n` +
          `User ID Anda: <code>${userId}</code>\n\n` +
          `Hubungi owner untuk request akses.`
        )
      }
      break

    case '/help':
      if (isOwnerUser) {
        await sendTelegramMessage(
          chatId,
          `📖 <b>Panduan Owner</b>\n\n` +
          `<b>User Management:</b>\n` +
          `/approve [user_id] [days] - Berikan akses\n` +
          `Contoh: /approve 123456789 30\n\n` +
          `/revoke [user_id] - Cabut akses\n` +
          `/users - Lihat semua user\n\n` +
          `<b>Email Notifications:</b>\n` +
          `/check - Cek email baru & notif ke semua user\n` +
          `/inbox - Lihat 10 email terbaru\n\n` +
          `<b>Config:</b>\n` +
          `/status - Lihat status\n` +
          `/setclient, /setsecret, /settenant, /setrefresh`
        )
      } else if (hasAccess) {
        await sendTelegramMessage(
          chatId,
          `📖 <b>Panduan</b>\n\n` +
          `/inbox - Lihat inbox\n` +
          `/mystatus - Cek status akses`
        )
      } else {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
      }
      break

    case '/mystatus':
      if (!hasAccess) {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
        return
      }
      
      if (isOwnerUser) {
        await sendTelegramMessage(chatId, '👑 Anda adalah Owner. Akses tidak terbatas.')
      } else {
        const { data: userData } = await supabase
          .from('telegram_users')
          .select('*')
          .eq('telegram_id', userId)
          .maybeSingle()
        
        if (userData) {
          const expiresAt = new Date(userData.expires_at)
          const now = new Date()
          const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          
          await sendTelegramMessage(
            chatId,
            `📊 <b>Status Akses Anda</b>\n\n` +
            `User ID: <code>${userId}</code>\n` +
            `Berlaku hingga: ${expiresAt.toLocaleDateString('id-ID')}\n` +
            `Sisa waktu: ${daysLeft} hari`
          )
        }
      }
      break

    case '/status':
      if (!isOwnerUser) {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
        return
      }
      const creds = await getMicrosoftCredentials()
      const approvedCount = (await getApprovedUsers()).length
      const status = `📊 <b>Status Konfigurasi</b>\n\n` +
        `<b>Microsoft:</b>\n` +
        `Client ID: ${creds.client_id ? '✅' : '❌'}\n` +
        `Client Secret: ${creds.client_secret ? '✅' : '❌'}\n` +
        `Tenant ID: ${creds.tenant_id ? '✅' : '❌'}\n` +
        `Refresh Token: ${creds.refresh_token ? '✅' : '❌'}\n\n` +
        `<b>Users:</b>\n` +
        `Approved users: ${approvedCount}`
      await sendTelegramMessage(chatId, status)
      break

    case '/approve':
      if (!isOwnerUser) {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
        return
      }
      const approveArgs = arg.split(' ')
      if (approveArgs.length < 2) {
        await sendTelegramMessage(chatId, '❌ Gunakan: /approve [user_id] [days]\nContoh: /approve 123456789 30')
        return
      }
      const targetUserId = parseInt(approveArgs[0])
      const days = parseInt(approveArgs[1])
      
      if (isNaN(targetUserId) || isNaN(days) || days < 1) {
        await sendTelegramMessage(chatId, '❌ User ID dan days harus berupa angka valid.')
        return
      }
      
      await approveUser(targetUserId, null, days, userId)
      await sendTelegramMessage(chatId, `✅ User <code>${targetUserId}</code> berhasil diapprove untuk ${days} hari.`)
      
      // Notify the approved user
      try {
        await sendTelegramMessage(
          targetUserId,
          `🎉 <b>Akses Diberikan!</b>\n\n` +
          `Anda telah mendapat akses ke bot Outlook notifications selama ${days} hari.\n\n` +
          `Gunakan /start untuk mulai.`
        )
      } catch (e) {
        // User might not have started the bot yet
      }
      break

    case '/revoke':
      if (!isOwnerUser) {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
        return
      }
      const revokeUserId = parseInt(arg)
      if (isNaN(revokeUserId)) {
        await sendTelegramMessage(chatId, '❌ Gunakan: /revoke [user_id]')
        return
      }
      
      await revokeUser(revokeUserId)
      await sendTelegramMessage(chatId, `✅ Akses user <code>${revokeUserId}</code> telah dicabut.`)
      
      // Notify the revoked user
      try {
        await sendTelegramMessage(revokeUserId, '⚠️ Akses Anda ke bot ini telah dicabut.')
      } catch (e) {
        // User might have blocked the bot
      }
      break

    case '/users':
      if (!isOwnerUser) {
        await sendTelegramMessage(chatId, '⛔ Akses ditolak.')
        return
      }
      const users = await getApprovedUsers()
      
      if (users.length === 0) {
        await sendTelegramMessage(chatId, '📭 Belum ada user yang diapprove.')
        return
      }
      
      let userList = `👥 <b>Approved Users (${users.length})</b>\n\n`
      for (const user of users) {
        const expiresAt = new Date(user.expires_at)
        const now = new Date()
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        userList += `• <code>${user.telegram_id}</code>`
        if (user.telegram_username) {
          userList += ` (@${user.telegram_username})`
        }
        userList += ` - ${daysLeft} hari lagi\n`
      }
      
      await sendTelegramMessage(chatId, userList)
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
      if (!hasAccess) {
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
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await sendTelegramMessage(
          chatId,
          `❌ Error: ${errorMessage}\n\nGunakan /status untuk cek konfigurasi.`
        )
      }
      break

    case '/check':
      if (!isOwnerUser) {
        await sendTelegramMessage(chatId, '⛔ Hanya owner yang bisa trigger manual check.')
        return
      }
      await sendTelegramMessage(chatId, '🔍 Mengecek email baru...')
      await checkAndNotifyNewEmails()
      await sendTelegramMessage(chatId, '✅ Pengecekan selesai.')
      break

    default:
      if (hasAccess) {
        await sendTelegramMessage(chatId, '❓ Command tidak dikenal. Gunakan /help.')
      }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Check if this is a cron/scheduled call for auto-check
    const url = new URL(req.url)
    if (url.searchParams.get('action') === 'check_new_emails') {
      await checkAndNotifyNewEmails()
      return new Response(JSON.stringify({ ok: true, action: 'checked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const update = await req.json()
    
    if (update.message) {
      const chatId = update.message.chat.id
      const userId = update.message.from.id
      const username = update.message.from.username || null
      const text = update.message.text || ''

      // Update username if user sends a message
      if (username) {
        const { data: existingUser } = await supabase
          .from('telegram_users')
          .select('id')
          .eq('telegram_id', userId)
          .maybeSingle()
        
        if (existingUser) {
          await supabase
            .from('telegram_users')
            .update({ telegram_username: username })
            .eq('telegram_id', userId)
        }
      }

      if (text.startsWith('/')) {
        await handleCommand(chatId, userId, username, text)
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
