import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SHEERID_BASE_URL = 'https://services.sheerid.com/rest/v2/verification';

// Military organizations
const MILITARY_ORGS = [
  { id: 4070, name: "Army" },
  { id: 4073, name: "Air Force" },
  { id: 4072, name: "Navy" },
  { id: 4071, name: "Marine Corps" },
  { id: 4074, name: "Coast Guard" },
  { id: 4544268, name: "Space Force" }
];

// User session storage (in production, use database)
const userSessions: Map<number, any> = new Map();

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { id: number; first_name?: string };
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message: { chat: { id: number } };
    data: string;
  };
}

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  return response.json();
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
}

// Step 1: Collect Military Status
async function collectMilitaryStatus(verificationId: string, status: string) {
  const url = `${SHEERID_BASE_URL}/${verificationId}/step/collectMilitaryStatus`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  
  return response.json();
}

// Step 2: Collect Personal Info
async function collectPersonalInfo(submissionUrl: string, data: any) {
  const response = await fetch(submissionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  return response.json();
}

// Generate random personal info
function generateRandomInfo() {
  const firstNames = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  // Random birth date (age 25-55)
  const year = 1970 + Math.floor(Math.random() * 30);
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const birthDate = `${year}-${month}-${day}`;
  
  // Random discharge date (last 5 years)
  const dischargeYear = 2020 + Math.floor(Math.random() * 5);
  const dischargeMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const dischargeDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const dischargeDate = `${dischargeYear}-${dischargeMonth}-${dischargeDay}`;
  
  const org = MILITARY_ORGS[Math.floor(Math.random() * MILITARY_ORGS.length)];
  
  return { firstName, lastName, birthDate, dischargeDate, org };
}

async function handleStart(chatId: number) {
  const text = `🎖️ <b>ChatGPT Military SheerID Verification Bot</b>

Selamat datang! Bot ini membantu proses verifikasi military untuk ChatGPT Plus discount.

<b>Fitur:</b>
• Otomatis generate data veteran
• Support semua branch military US
• Auto-submit ke SheerID API

<b>Commands:</b>
/verify - Mulai verifikasi baru
/status - Cek status verifikasi
/help - Bantuan

⚠️ <i>Disclaimer: Gunakan dengan bijak dan bertanggung jawab.</i>`;

  await sendTelegramMessage(chatId, text);
}

async function handleVerify(chatId: number, userId: number) {
  // Reset session
  userSessions.set(userId, { step: 'awaiting_verification_id' });
  
  const text = `📝 <b>Mulai Verifikasi Military</b>

Silakan kirim <b>Verification ID</b> dari halaman SheerID ChatGPT.

Contoh format: <code>abc123def456...</code>

💡 <i>Tip: Buka halaman verifikasi ChatGPT, inspect network, cari verification ID dari request.</i>`;

  await sendTelegramMessage(chatId, text);
}

async function handleVerificationId(chatId: number, userId: number, verificationId: string) {
  const session = userSessions.get(userId) || {};
  session.verificationId = verificationId;
  session.step = 'select_status';
  userSessions.set(userId, session);
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '🎖️ VETERAN', callback_data: 'status_VETERAN' }],
      [{ text: '🔄 RESERVIST', callback_data: 'status_RESERVIST' }],
      [{ text: '⭐ ACTIVE_DUTY', callback_data: 'status_ACTIVE_DUTY' }],
    ]
  };
  
  await sendTelegramMessage(chatId, '🎖️ Pilih status military:', keyboard);
}

async function handleStatusSelection(chatId: number, userId: number, status: string, callbackId: string) {
  await answerCallbackQuery(callbackId, `Status: ${status}`);
  
  const session = userSessions.get(userId);
  if (!session?.verificationId) {
    await sendTelegramMessage(chatId, '❌ Session expired. Gunakan /verify untuk mulai ulang.');
    return;
  }
  
  await sendTelegramMessage(chatId, '⏳ Memproses collectMilitaryStatus...');
  
  try {
    const result = await collectMilitaryStatus(session.verificationId, status);
    
    if (result.errorIds?.length > 0) {
      await sendTelegramMessage(chatId, `❌ Error: ${JSON.stringify(result.errorIds)}`);
      return;
    }
    
    session.submissionUrl = result.submissionUrl;
    session.step = 'select_org';
    userSessions.set(userId, session);
    
    const keyboard = {
      inline_keyboard: MILITARY_ORGS.map(org => ([
        { text: `🎖️ ${org.name}`, callback_data: `org_${org.id}_${org.name}` }
      ]))
    };
    
    await sendTelegramMessage(chatId, `✅ Status diterima!\n\nPilih branch military:`, keyboard);
    
  } catch (error) {
    console.error('Error collecting military status:', error);
    await sendTelegramMessage(chatId, `❌ Error: ${(error as Error).message}`);
  }
}

async function handleOrgSelection(chatId: number, userId: number, orgData: string, callbackId: string) {
  await answerCallbackQuery(callbackId);
  
  const session = userSessions.get(userId);
  if (!session?.submissionUrl) {
    await sendTelegramMessage(chatId, '❌ Session expired. Gunakan /verify untuk mulai ulang.');
    return;
  }
  
  const [orgId, orgName] = orgData.split('_').slice(1);
  session.org = { id: parseInt(orgId), name: orgName };
  session.step = 'input_email';
  userSessions.set(userId, session);
  
  await sendTelegramMessage(chatId, '📧 Masukkan email untuk verifikasi:');
}

async function handleEmailInput(chatId: number, userId: number, email: string) {
  const session = userSessions.get(userId);
  if (!session?.submissionUrl || !session?.org) {
    await sendTelegramMessage(chatId, '❌ Session expired. Gunakan /verify untuk mulai ulang.');
    return;
  }
  
  session.email = email;
  session.step = 'confirm';
  userSessions.set(userId, session);
  
  // Generate random info
  const info = generateRandomInfo();
  session.generatedInfo = info;
  userSessions.set(userId, session);
  
  const text = `📋 <b>Data yang akan di-submit:</b>

👤 Nama: <code>${info.firstName} ${info.lastName}</code>
📅 Tanggal Lahir: <code>${info.birthDate}</code>
📧 Email: <code>${email}</code>
🎖️ Organization: <code>${session.org.name}</code>
📆 Discharge Date: <code>${info.dischargeDate}</code>

Konfirmasi submit?`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Submit', callback_data: 'confirm_submit' },
        { text: '🔄 Regenerate', callback_data: 'confirm_regenerate' },
      ],
      [{ text: '❌ Cancel', callback_data: 'confirm_cancel' }],
    ]
  };
  
  await sendTelegramMessage(chatId, text, keyboard);
}

async function handleConfirmation(chatId: number, userId: number, action: string, callbackId: string) {
  await answerCallbackQuery(callbackId);
  
  const session = userSessions.get(userId);
  if (!session?.submissionUrl || !session?.generatedInfo) {
    await sendTelegramMessage(chatId, '❌ Session expired. Gunakan /verify untuk mulai ulang.');
    return;
  }
  
  if (action === 'cancel') {
    userSessions.delete(userId);
    await sendTelegramMessage(chatId, '❌ Dibatalkan. Gunakan /verify untuk mulai ulang.');
    return;
  }
  
  if (action === 'regenerate') {
    const info = generateRandomInfo();
    session.generatedInfo = info;
    userSessions.set(userId, session);
    
    const text = `📋 <b>Data baru:</b>

👤 Nama: <code>${info.firstName} ${info.lastName}</code>
📅 Tanggal Lahir: <code>${info.birthDate}</code>
📧 Email: <code>${session.email}</code>
🎖️ Organization: <code>${session.org.name}</code>
📆 Discharge Date: <code>${info.dischargeDate}</code>

Konfirmasi submit?`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Submit', callback_data: 'confirm_submit' },
          { text: '🔄 Regenerate', callback_data: 'confirm_regenerate' },
        ],
        [{ text: '❌ Cancel', callback_data: 'confirm_cancel' }],
      ]
    };
    
    await sendTelegramMessage(chatId, text, keyboard);
    return;
  }
  
  // Submit
  await sendTelegramMessage(chatId, '⏳ Submitting to SheerID...');
  
  try {
    const info = session.generatedInfo;
    
    const payload = {
      firstName: info.firstName,
      lastName: info.lastName,
      birthDate: info.birthDate,
      email: session.email,
      phoneNumber: "",
      organization: session.org,
      dischargeDate: info.dischargeDate,
      locale: "en-US",
      country: "US",
      metadata: {
        marketConsentValue: false,
        refererUrl: "",
        verificationId: session.verificationId,
        flags: '{"doc-upload-considerations":"default","doc-upload-may24":"default"}',
        submissionOptIn: "By submitting the personal information above, I acknowledge that my personal information is being collected under the privacy policy of the business from which I am seeking a discount."
      }
    };
    
    const result = await collectPersonalInfo(session.submissionUrl, payload);
    
    if (result.errorIds?.length > 0) {
      await sendTelegramMessage(chatId, `❌ Error: ${JSON.stringify(result.errorIds)}\n\nGunakan /verify untuk coba lagi.`);
    } else {
      const successText = `✅ <b>Berhasil Submit!</b>

📋 Verification ID: <code>${session.verificationId}</code>
📊 Status: <code>${result.currentStep || 'Pending'}</code>

${result.currentStep === 'success' ? '🎉 Verifikasi APPROVED!' : '⏳ Menunggu review...'}`;

      await sendTelegramMessage(chatId, successText);
    }
    
    userSessions.delete(userId);
    
  } catch (error) {
    console.error('Error submitting:', error);
    await sendTelegramMessage(chatId, `❌ Error: ${(error as Error).message}`);
  }
}

async function handleHelp(chatId: number) {
  const text = `📖 <b>Panduan Penggunaan</b>

<b>1. Dapatkan Verification ID:</b>
• Buka ChatGPT Plus discount page
• Buka DevTools (F12) → Network tab
• Mulai proses verifikasi
• Cari request ke sheerid.com
• Copy verification ID

<b>2. Gunakan Bot:</b>
• Ketik /verify
• Paste verification ID
• Pilih status (VETERAN recommended)
• Pilih branch military
• Masukkan email
• Konfirmasi & submit

<b>3. Tunggu Hasil:</b>
• Instant approval → langsung dapat discount
• Pending → perlu document upload

<b>Commands:</b>
/start - Mulai bot
/verify - Verifikasi baru
/status - Cek status
/help - Bantuan ini`;

  await sendTelegramMessage(chatId, text);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const update: TelegramUpdate = await req.json();
    console.log('Received update:', JSON.stringify(update));

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const { id, from, message, data } = update.callback_query;
      const chatId = message.chat.id;
      const userId = from.id;
      
      if (data.startsWith('status_')) {
        await handleStatusSelection(chatId, userId, data.replace('status_', ''), id);
      } else if (data.startsWith('org_')) {
        await handleOrgSelection(chatId, userId, data, id);
      } else if (data.startsWith('confirm_')) {
        await handleConfirmation(chatId, userId, data.replace('confirm_', ''), id);
      }
      
      return new Response('OK', { headers: corsHeaders });
    }

    // Handle messages
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const userId = update.message.from?.id || chatId;
      const text = update.message.text;

      if (text === '/start') {
        await handleStart(chatId);
      } else if (text === '/verify') {
        await handleVerify(chatId, userId);
      } else if (text === '/help') {
        await handleHelp(chatId);
      } else {
        // Check session state
        const session = userSessions.get(userId);
        
        if (session?.step === 'awaiting_verification_id') {
          await handleVerificationId(chatId, userId, text);
        } else if (session?.step === 'input_email') {
          await handleEmailInput(chatId, userId, text);
        } else {
          await sendTelegramMessage(chatId, 'Gunakan /verify untuk mulai verifikasi atau /help untuk bantuan.');
        }
      }
    }

    return new Response('OK', { headers: corsHeaders });

  } catch (error) {
    console.error('Error handling update:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
