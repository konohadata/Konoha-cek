// ============================
// KONOHA CEK - BOT SEDERHANA
// DENGAN NIK TO HP V2 & TOPUP
// ============================

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

// ============================
// IMPORT MODULES
// ============================
const nikToHpV2 = require('./nikToHpV2.js');
const menu = require('./menu.js');
const topup = require('./topupSaldo.js');
const config = require('./config.js');
const { tambahSaldo, getSaldo, formatRupiah } = require('./saldo.js');

// ============================
// CONFIG
// ============================
const BOT_TOKEN = config.BOT.TOKEN;
const OWNER_ID = config.BOT.OWNER_ID;

// ============================
// INIT BOT
// ============================
const bot = new TelegramBot(BOT_TOKEN, {
    polling: {
        interval: 500,
        autoStart: true
    }
});

// ============================
// FILE PATHS
// ============================
const USERS_FILE = "./users.json";

// ============================
// LOAD/SAVE JSON
// ============================
const loadJSON = (file) => {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, "{}");
            return {};
        }
        const raw = fs.readFileSync(file, "utf8").trim();
        if (!raw || raw === "") {
            fs.writeFileSync(file, "{}");
            return {};
        }
        return JSON.parse(raw);
    } catch (err) {
        console.log(`❌ JSON ERROR ${file}:`, err.message);
        fs.writeFileSync(file, "{}");
        return {};
    }
};

const saveJSON = (file, data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
        console.log(`❌ SAVE ERROR ${file}:`, err.message);
    }
};

let users = loadJSON(USERS_FILE);

// ============================
// BOT MESSAGE HANDLER
// ============================
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text || '';
    const username = msg.from.username || 'no_username';
    const firstName = msg.from.first_name || 'User';

    // ===== REGISTER USER =====
    if (!users[userId]) {
        users[userId] = {
            id: userId,
            username: username,
            firstName: firstName,
            date: new Date().toISOString()
        };
        saveJSON(USERS_FILE, users);
    }

    // ===== COMMAND /START =====
    if (text === '/start' || text === '/menu') {
        await menu.showMenu(bot, chatId, users);
        return;
    }

    // ===== MENU UTAMA =====
    if (text === '📱 Cek NIK ke No HP') {
        const fakeQ = {
            id: `nik_${Date.now()}`,
            from: { id: userId },
            message: { chat: { id: chatId } },
            data: 'nik_to_hp_v2'
        };
        try {
            await nikToHpV2(bot, fakeQ);
        } catch (error) {
            console.error('❌ Error NIK to HP:', error.message);
            await bot.sendMessage(chatId, '❌ Gagal memproses NIK to HP. Silakan coba lagi.');
        }
        return;
    }

    // ===== CEK SALDO =====
    if (text === '💰 Cek Saldo') {
        await menu.showCekSaldo(bot, chatId, userId);
        return;
    }

    // ===== TOPUP SALDO =====
    if (text === '📢 Topup Saldo') {
        await topup.showTopupMenu(bot, chatId);
        return;
    }

    // ===== PROFIL SAYA =====
    if (text === '👤 Profil Saya') {
        await menu.showProfil(bot, chatId, userId, users);
        return;
    }

    // ===== ADMIN PANEL =====
    if (text === '⚙️ Admin Panel') {
        await menu.showAdminPanel(bot, chatId);
        return;
    }

    // ===== BANTUAN =====
    if (text === '❓ Bantuan') {
        await menu.showBantuan(bot, chatId);
        return;
    }

    // ===== HUBUNGI OWNER =====
    if (text === '📞 Hubungi Owner') {
        await menu.showHubungiOwner(bot, chatId);
        return;
    }

    // ===== BATAL =====
    if (text === '❌ BATAL') {
        topup.clearTopupSession(chatId);
        await bot.sendMessage(chatId, '❌ Dibatalkan!', {
            reply_markup: {
                keyboard: [
                    ['📱 Cek NIK ke No HP'],
                    ['💰 Cek Saldo', '📢 Topup Saldo'],
                    ['👤 Profil Saya'],
                    ['❓ Bantuan', '📞 Hubungi Owner']
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        });
        return;
    }

    // ===== KEMBALI KE MENU =====
    if (text === '🔙 Kembali ke Menu Utama') {
        topup.clearTopupSession(chatId);
        await menu.showMenu(bot, chatId, users);
        return;
    }

    // ===== HANDLE TOPUP MANUAL INPUT =====
    const handledManual = await topup.handleManualInput(bot, chatId, text);
    if (handledManual) return;

    // ===== TAMBAH SALDO (ADMIN) =====
    if (menu.isOwner(userId) && text.includes('|')) {
        await menu.prosesTambahSaldo(bot, chatId, text);
        return;
    }

    // ===== BROADCAST =====
    if (menu.isOwner(userId) && text.startsWith('/broadcast ')) {
        const broadcastText = text.replace('/broadcast ', '');
        if (broadcastText.trim().length < 3) {
            await bot.sendMessage(chatId, '❌ Pesan terlalu pendek! Minimal 3 karakter.');
            return;
        }
        await menu.handleBroadcast(bot, chatId, broadcastText);
        return;
    }

    // ===== HANDLE NIK INPUT =====
    if (/^\d{16}$/.test(text)) {
        console.log(`📩 NIK 16 digit terdeteksi: ${text} dari ${userId}`);
        const fakeMsg = {
            chat: { id: chatId },
            from: { id: userId },
            text: text,
            message_id: msg.message_id
        };
        const fakeQ = {
            id: `nik_${Date.now()}`,
            from: { id: userId },
            message: fakeMsg,
            data: null
        };
        try {
            await nikToHpV2(bot, fakeQ);
        } catch (error) {
            console.error('❌ Error proses NIK:', error.message);
            await bot.sendMessage(chatId, '❌ Gagal memproses NIK. Silakan coba lagi.');
        }
        return;
    }

    // ===== PESAN TIDAK DIKENAL =====
    if (text && !text.startsWith('/')) {
        await bot.sendMessage(chatId, `
❓ *Perintah tidak dikenali!*

💡 Ketik /start untuk melihat menu.

📌 *Perintah yang tersedia:*
├ 📱 Cek NIK ke No HP
├ 💰 Cek Saldo
├ 📢 Topup Saldo
├ 👤 Profil Saya
└ ❓ Bantuan
        `, {
            parse_mode: "Markdown",
            reply_markup: {
                keyboard: [
                    ['📱 Cek NIK ke No HP'],
                    ['💰 Cek Saldo', '📢 Topup Saldo'],
                    ['👤 Profil Saya'],
                    ['❓ Bantuan', '📞 Hubungi Owner']
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        });
    }
});

// ============================
// CALLBACK QUERY HANDLER
// ============================
bot.on("callback_query", async (q) => {
    const data = q.data;
    const chatId = q.message?.chat?.id || q.from?.id;
    const userId = q.from?.id;

    try {
        await bot.answerCallbackQuery(q.id);
    } catch (err) {}

    console.log(`🔔 [CALLBACK] ${data} from ${userId}`);

    // ===== NIK TO HP V2 =====
    if (data === "nik_to_hp_v2" || 
        data === "menu_nik_to_hp_v2" ||
        data === "cancel_nik_to_hp_v2" ||
        data === "nik_to_hp_v2_confirm_topup" ||
        data === "nik_to_hp_v2_cancel_topup") {
        try {
            await nikToHpV2(bot, q);
        } catch (error) {
            console.error('❌ Error NIK to HP callback:', error.message);
            await bot.sendMessage(chatId, '❌ Gagal memproses. Silakan coba lagi.');
        }
        return;
    }

    // ===== TOPUP CALLBACKS =====
    const topupHandled = await topup.handleTopupCallback(bot, q);
    if (topupHandled) return;

    // ===== CEK SALDO =====
    if (data === "cek_saldo") {
        await menu.showCekSaldo(bot, chatId, userId);
        return;
    }

    // ===== ADMIN CALLBACKS =====
    const handled = await menu.handleAdminCallback(bot, q);
    if (handled) return;

    // ===== BACK TO MAIN =====
    if (data === "back_to_main") {
        try {
            await bot.deleteMessage(chatId, q.message.message_id);
        } catch (e) {}
        topup.clearTopupSession(chatId);
        await menu.showMenu(bot, chatId, users);
        return;
    }
});

// ============================
// ERROR HANDLER
// ============================
process.on("uncaughtException", (err) => {
    console.log("❌ ERROR CRASH:", err);
});

process.on("unhandledRejection", (err) => {
    console.log("❌ PROMISE ERROR:", err);
});

// ============================
// BOT READY
// ============================
console.log('🍃 KONOHA CEK BOT READY!');
console.log(`👑 Owner ID: ${OWNER_ID}`);
console.log(`📅 ${new Date().toLocaleString('id-ID')}`);
console.log('✅ Bot siap digunakan!');
console.log('📱 NIK to HP V2 terintegrasi!');
console.log('💳 Topup Saldo dengan QRIS siap!');