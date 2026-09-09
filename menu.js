// ============================
// MENU.JS - KONOHA CEK
// FITUR: NIK TO HP, TOPUP, ADMIN, PROFIL
// ============================

const config = require('./config');
const OWNER_ID = config.BOT.OWNER_ID;
const fs = require('fs');

// ============================
// IMPORT TOPUP MODULE
// ============================
const topup = require('./topupSaldo.js');

// ============================
// LOAD USERS
// ============================
const loadUsers = () => {
    try {
        const USERS_FILE = "./users.json";
        if (!fs.existsSync(USERS_FILE)) {
            return {};
        }
        const raw = fs.readFileSync(USERS_FILE, "utf8").trim();
        if (!raw || raw === "") {
            return {};
        }
        return JSON.parse(raw);
    } catch (err) {
        console.log(`❌ Load users error:`, err.message);
        return {};
    }
};

// ============================
// LOAD SALDO
// ============================
const loadSaldo = () => {
    try {
        const SALDO_FILE = "./saldo.json";
        if (!fs.existsSync(SALDO_FILE)) {
            return {};
        }
        const raw = fs.readFileSync(SALDO_FILE, "utf8").trim();
        if (!raw || raw === "") {
            return {};
        }
        return JSON.parse(raw);
    } catch (err) {
        console.log(`❌ Load saldo error:`, err.message);
        return {};
    }
};

// ============================
// FORMAT RUPIAH
// ============================
const formatRupiah = (val) => {
    if (!val) return '0';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// ============================
// CEK OWNER
// ============================
const isOwner = (userId) => {
    return String(userId) === String(OWNER_ID);
};

// ============================
// KEYBOARD USER BIASA
// ============================
const MAIN_REPLY_KEYBOARD = [
    ['📱 Cek NIK ke No HP'],
    ['💰 Cek Saldo', '📢 Topup Saldo'],
    ['👤 Profil Saya'],
    ['❓ Bantuan', '📞 Hubungi Owner']
];

// ============================
// KEYBOARD OWNER
// ============================
const OWNER_REPLY_KEYBOARD = [
    ['📱 Cek NIK ke No HP'],
    ['💰 Cek Saldo', '📢 Topup Saldo'],
    ['👤 Profil Saya'],
    ['⚙️ Admin Panel'],
    ['❓ Bantuan', '📞 Hubungi Owner']
];

// ============================
// SHOW MENU UTAMA
// ============================
const showMenu = async (bot, chatId, users) => {
    const userId = chatId;
    const isOwnerUser = isOwner(userId);
    const userData = users[userId] || {};
    const username = userData.username || 'User';

    // Ambil saldo
    const saldoData = loadSaldo();
    const saldo = saldoData[String(userId)] || 0;

    let menuText = `
╭ ───┈ " 🍃 " ── ⬦ ׁ
├  <b>KONOHA CEK</b>
╰─┈꯭─꯭──꯭─꯭─꯭──꯭─╌─꯭─꯭─꯭─꯭──꯭──꯭

👤 <b>Username:</b> ${username}
🆔 <b>User ID:</b> <code>${userId}</code>
💰 <b>Saldo:</b> Rp${formatRupiah(saldo)}

━━━━━━━━━━━━━━━━━━━━
📌 <b>Fitur yang tersedia:</b>

1️⃣ <b>📱 Cek NIK ke No HP</b>
   Cari nomor HP berdasarkan NIK 16 digit
   💰 Biaya: Rp5.000 per cek

2️⃣ <b>💰 Cek Saldo</b>
   Lihat sisa saldo Anda

3️⃣ <b>📢 Topup Saldo</b>
   Tambah saldo untuk cek NIK

4️⃣ <b>👤 Profil Saya</b>
   Lihat informasi akun Anda

━━━━━━━━━━━━━━━━━━━━
💡 Pilih menu di bawah:
`;

    if (isOwnerUser) {
        menuText += `
━━━━━━━━━━━━━━━━━━━━
👑 <b>OWNER PANEL</b>
├ ⚙️ Admin Panel - Manajemen user & saldo
└ 📊 Statistik - Lihat statistik bot
`;
    }

    const keyboard = isOwnerUser ? OWNER_REPLY_KEYBOARD : MAIN_REPLY_KEYBOARD;

    await bot.sendMessage(chatId, menuText, {
        parse_mode: "HTML",
        reply_markup: {
            keyboard: keyboard,
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });
};

// ============================
// SHOW PROFIL
// ============================
const showProfil = async (bot, chatId, userId, users) => {
    const userData = users[userId] || {};
    const username = userData.username || 'User';
    const firstName = userData.firstName || 'User';
    const date = userData.date || new Date().toISOString();
    
    // Ambil saldo
    const saldoData = loadSaldo();
    const saldo = saldoData[String(userId)] || 0;
    
    // Hitung total pengeluaran (jika ada)
    const purchases = userData.purchases || [];
    let totalSpent = 0;
    for (const p of purchases) {
        totalSpent += (p.finalPrice || p.price || 0);
    }

    const isOwnerUser = isOwner(userId);

    let profilText = `
╭ ───┈ " 👤 " ── ⬦ ׁ
├  <b>PROFIL SAYA</b>
╰─┈꯭─꯭──꯭─꯭─꯭──꯭─╌─꯭─꯭─꯭─꯭──꯭──꯭

🆔 <b>User ID:</b> <code>${userId}</code>
👤 <b>Username:</b> @${username}
📛 <b>Nama:</b> ${firstName}
📅 <b>Bergabung:</b> ${new Date(date).toLocaleDateString('id-ID')}
💰 <b>Saldo:</b> Rp${formatRupiah(saldo)}
📊 <b>Total Cek:</b> ${purchases.length} kali
💵 <b>Total Pengeluaran:</b> Rp${formatRupiah(totalSpent)}
`;

    if (isOwnerUser) {
        profilText += `
━━━━━━━━━━━━━━━━━━━━
👑 <b>Status: OWNER</b>
✅ Anda memiliki akses penuh ke bot
`;
    }

    profilText += `
━━━━━━━━━━━━━━━━━━━━
📌 Klik tombol di bawah untuk kembali
`;

    await bot.sendMessage(chatId, profilText, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "🔙 KEMBALI KE MENU", callback_data: "back_to_main" }]
            ]
        }
    });
};

// ============================
// SHOW CEK SALDO
// ============================
const showCekSaldo = async (bot, chatId, userId) => {
    const saldoData = loadSaldo();
    const saldo = saldoData[String(userId)] || 0;

    await bot.sendMessage(chatId, `
╭ ───┈ " 💰 " ── ⬦ ׁ
├  <b>CEK SALDO</b>
╰─┈꯭─꯭──꯭─꯭─꯭──꯭─╌─꯭─꯭─꯭─꯭──꯭──꯭

💳 <b>Saldo Anda:</b> Rp${formatRupiah(saldo)}

📌 <b>Info:</b>
├ Biaya cek NIK: Rp5.000
└ Topup minimal: Rp10.000

━━━━━━━━━━━━━━━━━━━━
📌 Klik tombol di bawah:
`, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "📢 Topup Saldo", callback_data: "menu_topup" }],
                [{ text: "📱 Cek NIK ke No HP", callback_data: "nik_to_hp_v2" }],
                [{ text: "🔙 KEMBALI KE MENU", callback_data: "back_to_main" }]
            ]
        }
    });
};

// ============================
// SHOW TOPUP SALDO - MENGGUNAKAN TOPUP MODULE
// ============================
const showTopupSaldo = async (bot, chatId) => {
    // 🔥 PANGGIL TOPUP MODULE UNTUK MENAMPILKAN MENU TOPUP
    await topup.showTopupMenu(bot, chatId);
};

// ============================
// SHOW ADMIN PANEL (OWNER ONLY)
// ============================
const showAdminPanel = async (bot, chatId) => {
    const isOwnerUser = isOwner(chatId);
    if (!isOwnerUser) {
        await bot.sendMessage(chatId, '❌ <b>Khusus Owner!</b>', { parse_mode: "HTML" });
        return;
    }

    // Ambil statistik
    const users = loadUsers();
    const saldoData = loadSaldo();
    const totalUsers = Object.keys(users).length;
    const totalSaldo = Object.values(saldoData).reduce((a, b) => a + b, 0);

    let adminText = `
╭ ───┈ " ⚙️ " ── ⬦ ׁ
├  <b>ADMIN PANEL</b>
╰─┈꯭─꯭──꯭─꯭─꯭──꯭─╌─꯭─꯭─꯭─꯭──꯭──꯭

👑 <b>Selamat datang Owner!</b>

━━━━━━━━━━━━━━━━━━━━
📊 <b>STATISTIK</b>
├ 👥 Total User: ${totalUsers}
├ 💰 Total Saldo: Rp${formatRupiah(totalSaldo)}
└ 📅 ${new Date().toLocaleString('id-ID')}

━━━━━━━━━━━━━━━━━━━━
⚙️ <b>Fitur Admin:</b>
├ 👥 Daftar User - Lihat semua user
├ 💰 Tambah Saldo - Tambah saldo user
├ 📊 Statistik - Lihat statistik detail
└ 📢 Broadcast - Kirim pesan ke semua user

━━━━━━━━━━━━━━━━━━━━
📌 Pilih aksi di bawah:
`;

    await bot.sendMessage(chatId, adminText, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "👥 Daftar User", callback_data: "admin_list_users" }],
                [{ text: "💰 Tambah Saldo", callback_data: "admin_add_saldo" }],
                [{ text: "📊 Statistik", callback_data: "admin_stats" }],
                [{ text: "📢 Broadcast", callback_data: "admin_broadcast" }],
                [{ text: "🔙 KEMBALI KE MENU", callback_data: "back_to_main" }]
            ]
        }
    });
};

// ============================
// SHOW ADMIN - DAFTAR USER
// ============================
const showAdminListUsers = async (bot, chatId) => {
    const isOwnerUser = isOwner(chatId);
    if (!isOwnerUser) {
        await bot.sendMessage(chatId, '❌ <b>Khusus Owner!</b>', { parse_mode: "HTML" });
        return;
    }

    const users = loadUsers();
    const userList = Object.values(users);
    
    if (userList.length === 0) {
        await bot.sendMessage(chatId, '❌ Belum ada user terdaftar.');
        return;
    }

    let text = `
👥 <b>DAFTAR USER</b>
━━━━━━━━━━━━━━━━━━━━
📊 Total: ${userList.length} user

`;

    // Tampilkan 10 user pertama
    const showUsers = userList.slice(0, 10);
    for (const user of showUsers) {
        const saldoData = loadSaldo();
        const saldo = saldoData[String(user.id)] || 0;
        text += `├ <b>${user.username || 'no_username'}</b>\n`;
        text += `│  🆔 <code>${user.id}</code>\n`;
        text += `│  💰 Rp${formatRupiah(saldo)}\n`;
        text += `│  📅 ${new Date(user.date).toLocaleDateString('id-ID')}\n\n`;
    }

    if (userList.length > 10) {
        text += `└ ... dan ${userList.length - 10} user lainnya\n`;
    }

    text += `
━━━━━━━━━━━━━━━━━━━━
📌 Klik tombol di bawah untuk kembali
`;

    await bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "🔙 KEMBALI KE ADMIN", callback_data: "admin_back" }]
            ]
        }
    });
};

// ============================
// SHOW ADMIN - TAMBAH SALDO
// ============================
const showAdminAddSaldo = async (bot, chatId) => {
    const isOwnerUser = isOwner(chatId);
    if (!isOwnerUser) {
        await bot.sendMessage(chatId, '❌ <b>Khusus Owner!</b>', { parse_mode: "HTML" });
        return;
    }

    await bot.sendMessage(chatId, `
💰 <b>TAMBAH SALDO USER</b>
━━━━━━━━━━━━━━━━━━━━

📌 Kirim pesan dengan format:
<code>user_id|jumlah</code>

📋 <b>Contoh:</b>
<code>8714776841|50000</code>
<code>123456789|10000</code>

📌 <b>Keterangan:</b>
├ user_id: ID Telegram user
└ jumlah: nominal saldo yang ditambahkan

📌 Ketik <code>batal</code> untuk membatalkan.
`, {
        parse_mode: "HTML",
        reply_markup: {
            keyboard: [
                ['❌ BATAL'],
                ['🔙 Kembali ke Menu Utama']
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });
};

// ============================
// SHOW ADMIN - STATISTIK
// ============================
const showAdminStats = async (bot, chatId) => {
    const isOwnerUser = isOwner(chatId);
    if (!isOwnerUser) {
        await bot.sendMessage(chatId, '❌ <b>Khusus Owner!</b>', { parse_mode: "HTML" });
        return;
    }

    const users = loadUsers();
    const saldoData = loadSaldo();
    const totalUsers = Object.keys(users).length;
    const totalSaldo = Object.values(saldoData).reduce((a, b) => a + b, 0);
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    let statsText = `
📊 <b>STATISTIK BOT</b>
━━━━━━━━━━━━━━━━━━━━

👥 <b>Total User:</b> ${totalUsers}
💰 <b>Total Saldo:</b> Rp${formatRupiah(totalSaldo)}
💾 <b>Memory:</b> ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB
⏰ <b>Uptime:</b> ${hours}h ${minutes}m ${seconds}s
📅 <b>Server Time:</b> ${new Date().toLocaleString('id-ID')}

━━━━━━━━━━━━━━━━━━━━
📌 Klik tombol di bawah untuk kembali
`;

    await bot.sendMessage(chatId, statsText, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "🔙 KEMBALI KE ADMIN", callback_data: "admin_back" }]
            ]
        }
    });
};

// ============================
// SHOW BANTUAN
// ============================
const showBantuan = async (bot, chatId) => {
    await bot.sendMessage(chatId, `
╭ ───┈ " ❓ " ── ⬦ ׁ
├  <b>BANTUAN KONOHA CEK</b>
╰─┈꯭─꯭──꯭─꯭─꯭──꯭─╌─꯭─꯭─꯭─꯭──꯭──꯭

📌 <b>Cara Cek NIK ke No HP:</b>

1. Klik "📱 Cek NIK ke No HP"
2. Masukkan NIK 16 digit
   Contoh: <code>3328044510990008</code>
3. Tunggu proses pencarian
4. Hasil nomor HP akan muncul

💰 <b>Biaya:</b> Rp5.000 per cek

━━━━━━━━━━━━━━━━━━━━
📢 <b>Cara Topup Saldo:</b>

1. Klik "📢 Topup Saldo"
2. Pilih nominal yang diinginkan
3. Scan QRIS dan bayar
4. Saldo otomatis bertambah

━━━━━━━━━━━━━━━━━━━━
👑 <b>Owner:</b> @AbahKonoha
💡 <b>Info:</b> Minimal topup Rp10.000

━━━━━━━━━━━━━━━━━━━━
📌 Klik tombol di bawah untuk kembali
`, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "🔙 KEMBALI KE MENU", callback_data: "back_to_main" }]
            ]
        }
    });
};

// ============================
// SHOW HUBUNGI OWNER
// ============================
const showHubungiOwner = async (bot, chatId) => {
    await bot.sendMessage(chatId, `
╭ ───┈ " 📞 " ── ⬦ ׁ
├  <b>HUBUNGI OWNER</b>
╰─┈꯭─꯭──꯭─꯭─꯭──꯭─╌─꯭─꯭─꯭─꯭──꯭──꯭

💡 <b>Untuk:</b>
├ Topup Saldo
├ Pertanyaan
├ Masalah teknis
├ Saran & kritik
└ Bantuan lainnya

📌 <b>Sertakan User ID:</b> <code>${chatId}</code>

━━━━━━━━━━━━━━━━━━━━
👑 <b>Owner:</b> @AbahKonoha

📌 Klik tombol di bawah untuk menghubungi
`, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "📱 WhatsApp", url: "https://wa.me/6281319497283" },
                    { text: "📨 Telegram", url: "https://t.me/AbahKonoha" }
                ],
                [{ text: "🔙 KEMBALI KE MENU", callback_data: "back_to_main" }]
            ]
        }
    });
};

// ============================
// PROSES TAMBAH SALDO (ADMIN)
// ============================
const prosesTambahSaldo = async (bot, chatId, input) => {
    const isOwnerUser = isOwner(chatId);
    if (!isOwnerUser) {
        await bot.sendMessage(chatId, '❌ Khusus Owner!');
        return;
    }

    const parts = input.split('|').map(s => s.trim());
    if (parts.length < 2) {
        await bot.sendMessage(chatId, `
❌ <b>Format salah!</b>

Gunakan format:
<code>user_id|jumlah</code>

Contoh: <code>8714776841|50000</code>
`, { parse_mode: "HTML" });
        return;
    }

    const targetUserId = parts[0];
    const amount = parseInt(parts[1]);

    if (isNaN(amount) || amount <= 0) {
        await bot.sendMessage(chatId, '❌ Jumlah harus angka positif!');
        return;
    }

    // Tambah saldo
    const { tambahSaldo, getSaldo } = require('./saldo.js');
    const success = tambahSaldo(targetUserId, amount);
    
    if (success) {
        const newSaldo = getSaldo(targetUserId);
        
        // Cek apakah user ada
        const users = loadUsers();
        const userExists = users[targetUserId];
        
        let userInfo = '';
        if (userExists) {
            userInfo = `👤 Username: @${userExists.username || 'no_username'}`;
        } else {
            userInfo = `⚠️ User dengan ID ${targetUserId} belum terdaftar di bot`;
        }

        await bot.sendMessage(chatId, `
✅ <b>SALDO BERHASIL DITAMBAHKAN!</b>

📌 <b>Detail:</b>
├ 🆔 User ID: <code>${targetUserId}</code>
├ ${userInfo}
├ 💰 Jumlah: Rp${formatRupiah(amount)}
└ 💳 Saldo Baru: Rp${formatRupiah(newSaldo)}

📅 ${new Date().toLocaleString('id-ID')}
`, { parse_mode: "HTML" });
    } else {
        await bot.sendMessage(chatId, '❌ Gagal menambahkan saldo!');
    }
};

// ============================
// HANDLE ADMIN CALLBACK
// ============================
const handleAdminCallback = async (bot, q) => {
    const data = q.data;
    const chatId = q.message.chat.id;
    const userId = q.from.id;

    if (data === "admin_list_users") {
        await showAdminListUsers(bot, chatId);
        return true;
    }

    if (data === "admin_add_saldo") {
        await showAdminAddSaldo(bot, chatId);
        return true;
    }

    if (data === "admin_stats") {
        await showAdminStats(bot, chatId);
        return true;
    }

    if (data === "admin_broadcast") {
        await bot.sendMessage(chatId, `
📢 <b>BROADCAST</b>
━━━━━━━━━━━━━━━━━━━━

Kirim pesan yang ingin disebarkan ke semua user.

Format: <code>/broadcast Pesan Anda</code>

Contoh:
<code>/broadcast Hallo semua! Bot sedang aktif.</code>

📌 Fitur ini mengirim pesan ke semua user terdaftar.
`, { parse_mode: "HTML" });
        return true;
    }

    if (data === "admin_back") {
        await showAdminPanel(bot, chatId);
        return true;
    }

    return false;
};

// ============================
// HANDLE BROADCAST
// ============================
const handleBroadcast = async (bot, chatId, text) => {
    const isOwnerUser = isOwner(chatId);
    if (!isOwnerUser) {
        await bot.sendMessage(chatId, '❌ Khusus Owner!');
        return;
    }

    const users = loadUsers();
    const userList = Object.keys(users);
    
    if (userList.length === 0) {
        await bot.sendMessage(chatId, '❌ Tidak ada user untuk di-broadcast.');
        return;
    }

    const statusMsg = await bot.sendMessage(chatId, `⏳ Mengirim broadcast ke ${userList.length} user...`, { parse_mode: "HTML" });

    let success = 0;
    let fail = 0;

    for (const uid of userList) {
        try {
            await bot.sendMessage(parseInt(uid), `
📢 <b>PENGUMUMAN</b>
━━━━━━━━━━━━━━━━━━━━

${text}

━━━━━━━━━━━━━━━━━━━━
🍃 Konoha Cek
👑 Owner: @AbahKonoha
`, { parse_mode: "HTML" });
            success++;
        } catch (err) {
            fail++;
        }
        await new Promise(r => setTimeout(r, 100));
    }

    await bot.editMessageText(`
✅ <b>BROADCAST SELESAI!</b>
━━━━━━━━━━━━━━━━━━━━

📊 Terkirim: ${success} user
❌ Gagal: ${fail} user
👥 Total: ${userList.length} user

📅 ${new Date().toLocaleString('id-ID')}
`, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: "HTML"
    });
};

// ============================
// EXPORT MODULE
// ============================
module.exports = {
    showMenu,
    showProfil,
    showCekSaldo,
    showTopupSaldo,
    showAdminPanel,
    showAdminListUsers,
    showAdminAddSaldo,
    showAdminStats,
    showBantuan,
    showHubungiOwner,
    prosesTambahSaldo,
    handleAdminCallback,
    handleBroadcast,
    isOwner,
    MAIN_REPLY_KEYBOARD,
    OWNER_REPLY_KEYBOARD,
    loadUsers,
    loadSaldo,
    formatRupiah
};