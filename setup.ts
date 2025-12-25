/**
 * Interactive Setup Wizard for Military Verification Bot
 * 
 * Run: deno run --allow-all setup.ts
 */

interface Config {
  bot_token: string;
  owner_id: number;
  allowed_users: number[];
  sheerid_program_id?: string;
}

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header() {
  console.clear();
  log("╔════════════════════════════════════════════╗", colors.cyan);
  log("║    🎖️  Military Verification Bot Setup    ║", colors.cyan);
  log("╚════════════════════════════════════════════╝", colors.cyan);
  console.log();
}

async function prompt(question: string): Promise<string> {
  const buf = new Uint8Array(1024);
  await Deno.stdout.write(new TextEncoder().encode(`${colors.yellow}${question}${colors.reset}`));
  const n = await Deno.stdin.read(buf);
  return new TextDecoder().decode(buf.subarray(0, n!)).trim();
}

async function validateBotToken(token: string): Promise<{ valid: boolean; username?: string }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      return { valid: true, username: data.result.username };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

async function loadExistingConfig(): Promise<Config | null> {
  try {
    const text = await Deno.readTextFile("config.json");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function saveConfig(config: Config): Promise<void> {
  await Deno.writeTextFile("config.json", JSON.stringify(config, null, 2));
}

async function main() {
  header();
  
  // Check existing config
  const existing = await loadExistingConfig();
  if (existing) {
    log("⚠️  Existing config.json found!", colors.yellow);
    const overwrite = await prompt("Overwrite? (y/N): ");
    if (overwrite.toLowerCase() !== "y") {
      log("\n✅ Setup cancelled. Existing config preserved.", colors.green);
      Deno.exit(0);
    }
    console.log();
  }
  
  // Step 1: Bot Token
  log("📝 Step 1: Bot Token", colors.bright);
  log("Get your token from @BotFather on Telegram\n", colors.blue);
  
  let botToken = "";
  let botUsername = "";
  
  while (true) {
    botToken = await prompt("Enter Bot Token: ");
    
    if (!botToken) {
      log("❌ Token cannot be empty!\n", colors.red);
      continue;
    }
    
    log("\n🔄 Validating token...", colors.blue);
    const validation = await validateBotToken(botToken);
    
    if (validation.valid) {
      botUsername = validation.username!;
      log(`✅ Valid! Bot: @${botUsername}\n`, colors.green);
      break;
    } else {
      log("❌ Invalid token! Please check and try again.\n", colors.red);
    }
  }
  
  // Step 2: Owner ID
  log("📝 Step 2: Owner Telegram ID", colors.bright);
  log("Send /start to @userinfobot to get your ID\n", colors.blue);
  
  let ownerId = 0;
  
  while (true) {
    const ownerInput = await prompt("Enter your Telegram ID: ");
    ownerId = parseInt(ownerInput);
    
    if (isNaN(ownerId) || ownerId <= 0) {
      log("❌ Invalid ID! Must be a positive number.\n", colors.red);
      continue;
    }
    
    log(`✅ Owner ID set to: ${ownerId}\n`, colors.green);
    break;
  }
  
  // Step 3: SheerID (Optional)
  log("📝 Step 3: SheerID Program ID (Optional)", colors.bright);
  log("Enter your SheerID program ID for military verification\n", colors.blue);
  
  const sheeridInput = await prompt("SheerID Program ID (press Enter to skip): ");
  const sheeridProgramId = sheeridInput.trim() || undefined;
  
  if (sheeridProgramId) {
    log(`✅ SheerID configured: ${sheeridProgramId}\n`, colors.green);
  } else {
    log("ℹ️  Skipped. You can add this later in config.json\n", colors.blue);
  }
  
  // Create config
  const config: Config = {
    bot_token: botToken,
    owner_id: ownerId,
    allowed_users: [],
    sheerid_program_id: sheeridProgramId,
  };
  
  // Save
  log("💾 Saving configuration...", colors.blue);
  await saveConfig(config);
  
  // Summary
  console.log();
  log("╔════════════════════════════════════════════╗", colors.green);
  log("║           ✅ Setup Complete!               ║", colors.green);
  log("╚════════════════════════════════════════════╝", colors.green);
  console.log();
  
  log("📋 Configuration Summary:", colors.bright);
  log(`   Bot: @${botUsername}`, colors.cyan);
  log(`   Owner ID: ${ownerId}`, colors.cyan);
  log(`   SheerID: ${sheeridProgramId || "Not configured"}`, colors.cyan);
  log(`   Allowed Users: 0`, colors.cyan);
  console.log();
  
  log("🚀 To start the bot, run:", colors.bright);
  log("   deno run --allow-all bot.ts", colors.yellow);
  console.log();
  
  log("📖 Bot Commands:", colors.bright);
  log("   /start    - Welcome message", colors.blue);
  log("   /verify   - Military verification link", colors.blue);
  log("   /adduser  - Add allowed user (owner only)", colors.blue);
  log("   /users    - List allowed users (owner only)", colors.blue);
  console.log();
}

main();
