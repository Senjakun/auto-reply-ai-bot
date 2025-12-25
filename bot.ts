/**
 * Military Verification Telegram Bot
 * Standalone Deno bot with polling mode
 * 
 * Run: deno run --allow-all bot.ts
 */

// Types
interface Config {
  bot_token: string;
  owner_id: number;
  allowed_users: number[];
  sheerid_program_id?: string;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: { id: number; type: string };
  text?: string;
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

// Load config
async function loadConfig(): Promise<Config> {
  try {
    const configText = await Deno.readTextFile("config.json");
    return JSON.parse(configText);
  } catch {
    console.error("❌ config.json not found!");
    console.log("Run setup first: deno run --allow-all setup.ts");
    Deno.exit(1);
  }
}

// Telegram API helpers
class TelegramBot {
  private baseUrl: string;
  private config: Config;
  private offset = 0;

  constructor(config: Config) {
    this.config = config;
    this.baseUrl = `https://api.telegram.org/bot${config.bot_token}`;
  }

  private async request(method: string, params: Record<string, unknown> = {}) {
    const url = `${this.baseUrl}/${method}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return response.json();
  }

  async sendMessage(chatId: number, text: string, options: Record<string, unknown> = {}) {
    return this.request("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...options,
    });
  }

  async getUpdates(): Promise<TelegramUpdate[]> {
    const result = await this.request("getUpdates", {
      offset: this.offset,
      timeout: 30,
      allowed_updates: ["message"],
    });
    
    if (result.ok && result.result.length > 0) {
      this.offset = result.result[result.result.length - 1].update_id + 1;
    }
    
    return result.ok ? result.result : [];
  }

  async getMe() {
    return this.request("getMe");
  }

  // Access control
  isOwner(userId: number): boolean {
    return userId === this.config.owner_id;
  }

  isAllowed(userId: number): boolean {
    return this.isOwner(userId) || this.config.allowed_users.includes(userId);
  }

  // User management
  async addUser(userId: number): Promise<boolean> {
    if (!this.config.allowed_users.includes(userId)) {
      this.config.allowed_users.push(userId);
      await this.saveConfig();
      return true;
    }
    return false;
  }

  async removeUser(userId: number): Promise<boolean> {
    const index = this.config.allowed_users.indexOf(userId);
    if (index > -1) {
      this.config.allowed_users.splice(index, 1);
      await this.saveConfig();
      return true;
    }
    return false;
  }

  private async saveConfig() {
    await Deno.writeTextFile("config.json", JSON.stringify(this.config, null, 2));
  }

  getConfig(): Config {
    return this.config;
  }
}

// Command handlers
async function handleStart(bot: TelegramBot, message: TelegramMessage) {
  const user = message.from;
  const isAllowed = bot.isAllowed(user.id);
  
  let text = `👋 <b>Welcome, ${user.first_name}!</b>\n\n`;
  
  if (isAllowed) {
    text += `✅ You have access to this bot.\n\n`;
    text += `<b>Available Commands:</b>\n`;
    text += `/verify - Start military verification\n`;
    text += `/help - Show help message\n`;
    text += `/status - Check your status\n`;
    
    if (bot.isOwner(user.id)) {
      text += `\n<b>Owner Commands:</b>\n`;
      text += `/adduser [id] - Add allowed user\n`;
      text += `/removeuser [id] - Remove user\n`;
      text += `/users - List all allowed users\n`;
      text += `/broadcast [msg] - Send to all users\n`;
    }
  } else {
    text += `⛔ You don't have access to this bot.\n`;
    text += `Your ID: <code>${user.id}</code>\n\n`;
    text += `Contact the bot owner for access.`;
  }
  
  await bot.sendMessage(message.chat.id, text);
}

async function handleVerify(bot: TelegramBot, message: TelegramMessage) {
  const user = message.from;
  
  if (!bot.isAllowed(user.id)) {
    await bot.sendMessage(message.chat.id, "⛔ You don't have access to this command.");
    return;
  }
  
  const config = bot.getConfig();
  
  let text = `🎖️ <b>Military Verification</b>\n\n`;
  
  if (config.sheerid_program_id) {
    const verifyUrl = `https://verify.sheerid.com/${config.sheerid_program_id}`;
    text += `Click the button below to verify your military status:\n\n`;
    text += `🔗 <a href="${verifyUrl}">Start Verification</a>\n\n`;
    text += `<i>This link will take you to SheerID's secure verification portal.</i>`;
  } else {
    text += `⚠️ SheerID Program ID not configured.\n\n`;
    text += `Please contact the bot owner to set up verification.`;
  }
  
  await bot.sendMessage(message.chat.id, text, {
    disable_web_page_preview: true,
  });
}

async function handleHelp(bot: TelegramBot, message: TelegramMessage) {
  const user = message.from;
  const isOwner = bot.isOwner(user.id);
  
  let text = `📖 <b>Bot Help</b>\n\n`;
  text += `<b>General Commands:</b>\n`;
  text += `/start - Start bot & show menu\n`;
  text += `/verify - Military verification link\n`;
  text += `/status - Check your access status\n`;
  text += `/help - Show this message\n`;
  
  if (isOwner) {
    text += `\n<b>Owner Commands:</b>\n`;
    text += `/adduser [telegram_id] - Grant access\n`;
    text += `/removeuser [telegram_id] - Revoke access\n`;
    text += `/users - List all allowed users\n`;
    text += `/broadcast [message] - Message all users\n`;
  }
  
  await bot.sendMessage(message.chat.id, text);
}

async function handleStatus(bot: TelegramBot, message: TelegramMessage) {
  const user = message.from;
  const isOwner = bot.isOwner(user.id);
  const isAllowed = bot.isAllowed(user.id);
  
  let status = isOwner ? "👑 Owner" : isAllowed ? "✅ Allowed" : "⛔ No Access";
  
  let text = `📊 <b>Your Status</b>\n\n`;
  text += `<b>Name:</b> ${user.first_name} ${user.last_name || ""}\n`;
  text += `<b>Username:</b> @${user.username || "none"}\n`;
  text += `<b>ID:</b> <code>${user.id}</code>\n`;
  text += `<b>Access:</b> ${status}`;
  
  await bot.sendMessage(message.chat.id, text);
}

// Owner commands
async function handleAddUser(bot: TelegramBot, message: TelegramMessage) {
  if (!bot.isOwner(message.from.id)) {
    await bot.sendMessage(message.chat.id, "⛔ Owner only command.");
    return;
  }
  
  const args = message.text?.split(" ");
  if (!args || args.length < 2) {
    await bot.sendMessage(message.chat.id, "Usage: /adduser [telegram_id]");
    return;
  }
  
  const userId = parseInt(args[1]);
  if (isNaN(userId)) {
    await bot.sendMessage(message.chat.id, "❌ Invalid user ID.");
    return;
  }
  
  const added = await bot.addUser(userId);
  if (added) {
    await bot.sendMessage(message.chat.id, `✅ User <code>${userId}</code> added successfully.`);
  } else {
    await bot.sendMessage(message.chat.id, `ℹ️ User <code>${userId}</code> already has access.`);
  }
}

async function handleRemoveUser(bot: TelegramBot, message: TelegramMessage) {
  if (!bot.isOwner(message.from.id)) {
    await bot.sendMessage(message.chat.id, "⛔ Owner only command.");
    return;
  }
  
  const args = message.text?.split(" ");
  if (!args || args.length < 2) {
    await bot.sendMessage(message.chat.id, "Usage: /removeuser [telegram_id]");
    return;
  }
  
  const userId = parseInt(args[1]);
  if (isNaN(userId)) {
    await bot.sendMessage(message.chat.id, "❌ Invalid user ID.");
    return;
  }
  
  if (userId === bot.getConfig().owner_id) {
    await bot.sendMessage(message.chat.id, "❌ Cannot remove owner.");
    return;
  }
  
  const removed = await bot.removeUser(userId);
  if (removed) {
    await bot.sendMessage(message.chat.id, `✅ User <code>${userId}</code> removed.`);
  } else {
    await bot.sendMessage(message.chat.id, `ℹ️ User <code>${userId}</code> not in list.`);
  }
}

async function handleUsers(bot: TelegramBot, message: TelegramMessage) {
  if (!bot.isOwner(message.from.id)) {
    await bot.sendMessage(message.chat.id, "⛔ Owner only command.");
    return;
  }
  
  const config = bot.getConfig();
  const users = config.allowed_users;
  
  let text = `👥 <b>Allowed Users</b>\n\n`;
  text += `👑 Owner: <code>${config.owner_id}</code>\n\n`;
  
  if (users.length > 0) {
    text += `<b>Users (${users.length}):</b>\n`;
    users.forEach((id, i) => {
      text += `${i + 1}. <code>${id}</code>\n`;
    });
  } else {
    text += `<i>No additional users added.</i>`;
  }
  
  await bot.sendMessage(message.chat.id, text);
}

async function handleBroadcast(bot: TelegramBot, message: TelegramMessage) {
  if (!bot.isOwner(message.from.id)) {
    await bot.sendMessage(message.chat.id, "⛔ Owner only command.");
    return;
  }
  
  const text = message.text?.replace(/^\/broadcast\s*/, "");
  if (!text) {
    await bot.sendMessage(message.chat.id, "Usage: /broadcast [message]");
    return;
  }
  
  const config = bot.getConfig();
  const allUsers = [config.owner_id, ...config.allowed_users];
  let sent = 0;
  let failed = 0;
  
  for (const userId of allUsers) {
    try {
      await bot.sendMessage(userId, `📢 <b>Broadcast</b>\n\n${text}`);
      sent++;
    } catch {
      failed++;
    }
  }
  
  await bot.sendMessage(message.chat.id, `✅ Broadcast sent to ${sent} users. Failed: ${failed}`);
}

// Message router
async function handleMessage(bot: TelegramBot, message: TelegramMessage) {
  const text = message.text || "";
  const command = text.split(" ")[0].toLowerCase();
  
  console.log(`📨 ${message.from.first_name} (${message.from.id}): ${text}`);
  
  switch (command) {
    case "/start":
      await handleStart(bot, message);
      break;
    case "/verify":
      await handleVerify(bot, message);
      break;
    case "/help":
      await handleHelp(bot, message);
      break;
    case "/status":
      await handleStatus(bot, message);
      break;
    case "/adduser":
      await handleAddUser(bot, message);
      break;
    case "/removeuser":
      await handleRemoveUser(bot, message);
      break;
    case "/users":
      await handleUsers(bot, message);
      break;
    case "/broadcast":
      await handleBroadcast(bot, message);
      break;
    default:
      // Ignore non-commands or unknown commands
      break;
  }
}

// Main polling loop
async function main() {
  console.log("🚀 Loading config...");
  const config = await loadConfig();
  
  const bot = new TelegramBot(config);
  
  // Test connection
  const me = await bot.getMe();
  if (!me.ok) {
    console.error("❌ Failed to connect to Telegram API!");
    console.error("Check your bot token in config.json");
    Deno.exit(1);
  }
  
  console.log(`✅ Connected as @${me.result.username}`);
  console.log(`👑 Owner ID: ${config.owner_id}`);
  console.log(`👥 Allowed users: ${config.allowed_users.length}`);
  console.log("📡 Polling for updates...\n");
  
  // Polling loop
  while (true) {
    try {
      const updates = await bot.getUpdates();
      
      for (const update of updates) {
        if (update.message) {
          await handleMessage(bot, update.message);
        }
      }
    } catch (error) {
      console.error("❌ Polling error:", error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Run
main();
