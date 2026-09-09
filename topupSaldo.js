// ============================
// TOPUPSALDO.JS - SISTEM TOPUP SALDO
// DENGAN METODE PEMBAYARAN QRIS
// ============================

const { tambahSaldo, getSaldo, formatRupiah, loadSaldo, saveSaldo } = require("./saldo.js");
const { generateQRIS, cekStatusDualWithRetry } = require("./payment.js");
const config = require('./config.js');

// ============================
// SESSION MANAGEMENT
// ============================
const sessions = {};

const setTopupSession = (chatId, data) => {
    sessions[String(chatId)] = {
        ...data,
        createdAt: Date.now()
    };
    console.log(`📝 [TOPUP] Session set untuk ${chatId}`);
};

const getTopupSession = (chatId) => {
    const session = sessions[String(chatId)];
    if (!session) return null;
    
    if (Date.now() - session.createdAt > 30 * 60 * 1000) {
        delete sessions[String(chatId)];
        return null;
    }
    
    return session;
};

const clearTopupSession = (chatId) => {
    delete sessions[String(chatId)];
    console.log(`🗑️ [TOPUP] Session cleared untuk ${chatId}`);
};

// ============================
// SHOW TOPUP MENU
// ============================
const showTopupMenu = async (bot, chatId) => {
    const userId = chatId;
    const saldo = getSaldo(userId);

    let caption = `
╭ ───┈ " 📢 " ── ⬦ ׁ
├  <b>TOPUP SALDO</b>
╰─┈꯭─꯭──꯭─꯭─꯭──꯭─╌─꯭─꯭─꯭─꯭──꯭──꯭

💰 <b>Saldo Anda:</b> Rp${formatRupiah(saldo)}

━━━━━━━━━━━━━━━━━━━━
📌 <b>Cara Topup:</b>

1️⃣ Pilih nominal topup di bawah
2️⃣ Scan QRIS yang muncul
3️⃣ Bayar sesuai nominal
4️⃣ Saldo akan otomatis bertambah

━━━━━━━━━━━━━━━━━━━━
💳 <b>Pilih Nominal Topup:</b>
`;

    await bot.sendMessage(chatId, caption, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Rp10.000", callback_data: "topup_10000" },
                    { text: "Rp20.000", callback_data: "topup_20000" }
                ],
                [
                    { text: "Rp50.000", callback_data: "topup_50000" },
                    { text: "Rp100.000", callback_data: "topup_100000" }
                ],
                [
                    { text: "Rp200.000", callback_data: "topup_200000" },
                    { text: "Rp500.000", callback_data: "topup_500000" }
                ],
                [
                    { text: "✏️ Input Manual", callback_data: "topup_manual" }
                ],
                [
                    { text: "🔙 KEMBALI KE MENU", callback_data: "back_to_main" }
                ]
            ]
        }
    });
};

// ============================
// PROSES TOPUP - GENERATE QRIS
// ============================
const processTopup = async (bot, chatId, amount, method = 'qris') => {
    const userId = chatId;
    
    if (!amount || amount < 10000) {
        await bot.sendMessage(chatId, '❌ Minimal topup Rp10.000!', { parse_mode: "HTML" });
        return;
    }

    const description = `Topup Saldo Konoha Cek - ${formatRupiah(amount)}`;
    const loadingMsg = await bot.sendMessage(chatId, `⏳ <b>Generate QRIS untuk Rp${formatRupiah(amount)}...</b>`, { parse_mode: "HTML" });

    try {
        let result = await generateQRIS(amount, description);
        
        if (!result.success) {
            await bot.editMessageText(`
⚠️ <b>QRIS SEDANG MAINTENANCE!</b>

📌 Mohon maaf, sistem pembayaran QRIS sedang dalam perbaikan.

💡 <b>Solusi:</b>
├ Coba beberapa menit lagi
└ Atau hubungi admin untuk topup manual

👑 Owner: @AbahKonoha
━━━━━━━━━━━━━━━━━━━━
🙏 Terima kasih atas pengertiannya.
            `, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔙 KEMBALI KE MENU", callback_data: "back_to_main" }]
                    ]
                }
            });
            return;
        }

        try {
            await bot.deleteMessage(chatId, loadingMsg.message_id);
        } catch (e) {}

        setTopupSession(chatId, {
            feature: 'topup',
            amount: amount,
            transactionId: result.transaction_id,
            paymentMethod: result.method || 'AUTOGOPAY',
            timestamp: Date.now(),
            status: 'pending',
            qrisMessageId: null // Akan diisi nanti
        });

        let caption = `
💰 <b>TOPUP SALDO</b>
━━━━━━━━━━━━━━━━━━━━

💳 <b>Nominal:</b> Rp${formatRupiah(amount)}
💳 <b>Metode:</b> ${result.method || 'QRIS'}
🆔 <b>Transaksi:</b> ${result.transaction_id}

⏳ Scan QRIS di atas untuk membayar.
⏰ QRIS berlaku 15 menit.

📌 Setelah bayar, klik "✅ CEK PEMBAYARAN"
`;

        let sentMsg;

        if (result.image_data) {
            const buffer = Buffer.from(result.image_data.split(',')[1], 'base64');
            sentMsg = await bot.sendPhoto(chatId, buffer, {
                caption: caption,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✅ CEK PEMBAYARAN", callback_data: `topup_check_${result.transaction_id}` }],
                        [{ text: "❌ BATAL", callback_data: "topup_cancel" }]
                    ]
                }
            });
        } else if (result.qr_url) {
            sentMsg = await bot.sendPhoto(chatId, result.qr_url, {
                caption: caption,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✅ CEK PEMBAYARAN", callback_data: `topup_check_${result.transaction_id}` }],
                        [{ text: "❌ BATAL", callback_data: "topup_cancel" }]
                    ]
                }
            });
        } else {
            sentMsg = await bot.sendMessage(chatId, `
❌ <b>QRIS tidak tersedia!</b>
Silakan hubungi admin untuk topup manual.
👑 Owner: @AbahKonoha
            `, { parse_mode: "HTML" });
        }

        // Simpan message ID untuk dihapus nanti
        if (sentMsg) {
            const session = getTopupSession(chatId);
            if (session) {
                session.qrisMessageId = sentMsg.message_id;
                sessions[String(chatId)] = session;
            }
        }

        // Auto check payment
        if (sentMsg) {
            const startAutoCheck = async () => {
                let checkCount = 0;
                const maxChecks = 30;
                const checkInterval = 5000;

                const intervalId = setInterval(async () => {
                    checkCount++;

                    const session = getTopupSession(chatId);
                    if (!session || session.status === 'completed') {
                        clearInterval(intervalId);
                        return;
                    }

                    console.log(`🔄 [TOPUP AUTOCHECK] #${checkCount} - Checking ${chatId}...`);

                    try {
                        const paymentMethod = session.paymentMethod || 'AUTOGOPAY';
                        let result = await cekStatusDualWithRetry(
                            session.transactionId,
                            session.amount,
                            paymentMethod,
                            session.timestamp,
                            1
                        );

                        if (!result.matched && paymentMethod === 'AUTOGOPAY') {
                            result = await cekStatusDualWithRetry(
                                session.transactionId,
                                session.amount,
                                'GOMERCH',
                                session.timestamp,
                                1
                            );
                        } else if (!result.matched && paymentMethod === 'GOMERCH') {
                            result = await cekStatusDualWithRetry(
                                session.transactionId,
                                session.amount,
                                'AUTOGOPAY',
                                session.timestamp,
                                1
                            );
                        }

                        if (result.matched || result.status === 'settlement' || result.status === 'success' || result.status === 'paid') {
                            console.log(`✅ [TOPUP AUTOCHECK] Payment found for ${chatId}!`);
                            clearInterval(intervalId);
                            await processTopupSuccess(bot, chatId, session);
                            return;
                        }

                        if (checkCount >= maxChecks) {
                            console.log(`⏰ [TOPUP AUTOCHECK] Max checks reached for ${chatId}`);
                            clearInterval(intervalId);
                        }

                    } catch (error) {
                        console.error('❌ [TOPUP AUTOCHECK] Error:', error.message);
                    }
                }, checkInterval);

                if (!global.autoCheckIntervals) global.autoCheckIntervals = {};
                global.autoCheckIntervals[chatId] = intervalId;
            };

            await startAutoCheck();
        }

    } catch (error) {
        console.error('❌ [TOPUP] Error:', error.message);
        await bot.editMessageText(`
❌ <b>GAGAL GENERATE QRIS!</b>

Error: ${error.message}

Silakan coba lagi atau hubungi owner.
👑 Owner: @AbahKonoha
        `, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔄 COBA LAGI", callback_data: "menu_topup" }],
                    [{ text: "🔙 KEMBALI KE MENU", callback_data: "back_to_main" }]
                ]
            }
        });
    }
};

// ============================
// PROSES TOPUP SUKSES
// ============================
const processTopupSuccess = async (bot, chatId, session) => {
    try {
        const userId = chatId;
        const amount = session.amount;

        // Hapus QRIS
        if (session.qrisMessageId) {
            try {
                await bot.deleteMessage(chatId, session.qrisMessageId);
                console.log(`🗑️ QRIS dihapus untuk ${chatId}`);
            } catch (e) {
                console.log(`⚠️ Gagal hapus QRIS: ${e.message}`);
            }
        }

        const success = tambahSaldo(userId, amount);
        
        if (success) {
            const newSaldo = getSaldo(userId);
            
            session.status = 'completed';
            clearTopupSession(chatId);

            if (global.autoCheckIntervals && global.autoCheckIntervals[chatId]) {
                clearInterval(global.autoCheckIntervals[chatId]);
                delete global.autoCheckIntervals[chatId];
            }

            await bot.sendMessage(chatId, `
✅ <b>TOPUP BERHASIL!</b>
━━━━━━━━━━━━━━━━━━━━

💰 <b>Jumlah Topup:</b> Rp${formatRupiah(amount)}
💳 <b>Saldo Baru:</b> Rp${formatRupiah(newSaldo)}
🆔 <b>Transaksi:</b> ${session.transactionId}
📅 <b>Tanggal:</b> ${new Date().toLocaleString('id-ID')}

━━━━━━━━━━━━━━━━━━━━
🙏 Terima kasih telah topup!
📱 Silakan gunakan fitur "📱 Cek NIK ke No HP"
            `, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📱 CEK NIK KE HP", callback_data: "nik_to_hp_v2" }],
                        [{ text: "💰 CEK SALDO", callback_data: "cek_saldo" }],
                        [{ text: "🔙 MENU UTAMA", callback_data: "back_to_main" }]
                    ]
                }
            });

            // Notifikasi ke owner
            try {
                const users = require('./menu.js').loadUsers();
                const userData = users[userId] || {};
                const username = userData.username || 'Unknown';
                
                await bot.sendMessage(config.BOT.OWNER_ID, `
✅ <b>TOPUP BERHASIL!</b>

👤 Username: @${username}
🆔 User ID: <code>${userId}</code>
💰 Jumlah: Rp${formatRupiah(amount)}
💳 Saldo Baru: Rp${formatRupiah(newSaldo)}
🆔 Transaksi: ${session.transactionId}
📅 ${new Date().toLocaleString('id-ID')}
                `, { parse_mode: "HTML" });
            } catch (e) {
                console.log('⚠️ Gagal kirim notifikasi owner:', e.message);
            }

        } else {
            await bot.sendMessage(chatId, '❌ Gagal menambahkan saldo! Silakan hubungi owner.', { parse_mode: "HTML" });
        }

    } catch (error) {
        console.error('❌ [TOPUP SUCCESS] Error:', error.message);
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`, { parse_mode: "HTML" });
    }
};

// ============================
// CEK STATUS TOPUP
// ============================
const checkTopupStatus = async (bot, chatId, transactionId) => {
    const session = getTopupSession(chatId);
    if (!session) {
        await bot.sendMessage(chatId, '❌ Sesi tidak ditemukan! Silakan topup ulang.', { parse_mode: "HTML" });
        return;
    }

    const statusMsg = await bot.sendMessage(chatId, '⏳ <b>Mengecek status pembayaran...</b>', { parse_mode: "HTML" });

    try {
        const paymentMethod = session.paymentMethod || 'AUTOGOPAY';
        let result = await cekStatusDualWithRetry(
            transactionId,
            session.amount,
            paymentMethod,
            session.timestamp,
            5
        );

        if (!result.matched && paymentMethod === 'AUTOGOPAY') {
            result = await cekStatusDualWithRetry(
                transactionId,
                session.amount,
                'GOMERCH',
                session.timestamp,
                5
            );
        } else if (!result.matched && paymentMethod === 'GOMERCH') {
            result = await cekStatusDualWithRetry(
                transactionId,
                session.amount,
                'AUTOGOPAY',
                session.timestamp,
                5
            );
        }

        if (result.matched || result.status === 'settlement' || result.status === 'success' || result.status === 'paid') {
            try {
                await bot.deleteMessage(chatId, statusMsg.message_id);
            } catch (e) {}
            await processTopupSuccess(bot, chatId, session);
            return;
        }

        if (result.status === 'pending') {
            await bot.editMessageText(`
⏳ <b>PEMBAYARAN BELUM DITERIMA</b>
Status: PENDING
🆔 Transaksi: ${transactionId}

Silakan scan QRIS dan lakukan pembayaran.
Klik "CEK PEMBAYARAN" lagi setelah bayar.
            `, {
                chat_id: chatId,
                message_id: statusMsg.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✅ CEK LAGI", callback_data: `topup_check_${transactionId}` }],
                        [{ text: "❌ BATAL", callback_data: "topup_cancel" }]
                    ]
                }
            });
            return;
        }

        await bot.editMessageText(`
❌ <b>PEMBAYARAN GAGAL</b>
Status: ${result.status || 'error'}
${result.error ? `Error: ${result.error}` : ''}

Silakan coba lagi atau hubungi admin.
👑 Owner: @AbahKonoha
        `, {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📢 TOPUP LAGI", callback_data: "menu_topup" }],
                    [{ text: "🔙 KEMBALI KE MENU", callback_data: "back_to_main" }]
                ]
            }
        });

        clearTopupSession(chatId);

    } catch (error) {
        console.error('❌ [TOPUP CHECK] Error:', error.message);
        await bot.editMessageText(`❌ <b>Error cek payment!</b>\n\n${error.message}`, {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: "HTML"
        });
    }
};

// ============================
// HANDLE TOPUP CALLBACK
// ============================
const handleTopupCallback = async (bot, q) => {
    const data = q.data;
    const chatId = q.message?.chat?.id || q.from?.id;
    const userId = q.from?.id;

    try {
        await bot.answerCallbackQuery(q.id);
    } catch (err) {}

    // ===== TOPUP MENU =====
    if (data === "menu_topup") {
        await showTopupMenu(bot, chatId);
        return true;
    }

    // ===== TOPUP NOMINAL =====
    if (data.startsWith("topup_")) {
        const amount = parseInt(data.replace("topup_", ""));
        if (!isNaN(amount) && amount > 0) {
            await processTopup(bot, chatId, amount);
        }
        return true;
    }

    // ===== TOPUP MANUAL =====
    if (data === "topup_manual") {
        await bot.sendMessage(chatId, `
✏️ <b>TOPUP MANUAL</b>
━━━━━━━━━━━━━━━━━━━━

📌 Kirim nominal yang ingin di-topup.
📌 Contoh: <code>25000</code> untuk Rp25.000

📌 Minimal: Rp10.000
📌 Maksimal: Rp1.000.000

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
        
        setTopupSession(chatId, {
            feature: 'topup_manual',
            status: 'waiting_amount'
        });
        return true;
    }

    // ===== CHECK TOPUP =====
    if (data.startsWith("topup_check_")) {
        const transactionId = data.replace("topup_check_", "");
        await checkTopupStatus(bot, chatId, transactionId);
        return true;
    }

    // ===== CANCEL TOPUP =====
    if (data === "topup_cancel") {
        // Hapus QRIS
        const session = getTopupSession(chatId);
        if (session && session.qrisMessageId) {
            try {
                await bot.deleteMessage(chatId, session.qrisMessageId);
                console.log(`🗑️ QRIS dihapus untuk ${chatId}`);
            } catch (e) {
                console.log(`⚠️ Gagal hapus QRIS: ${e.message}`);
            }
        }
        
        // Hapus session
        clearTopupSession(chatId);
        
        // Hapus auto check interval
        if (global.autoCheckIntervals && global.autoCheckIntervals[chatId]) {
            clearInterval(global.autoCheckIntervals[chatId]);
            delete global.autoCheckIntervals[chatId];
        }

        // Kirim pesan dan langsung ke menu
        await bot.sendMessage(chatId, '❌ <b>Topup dibatalkan!</b>', {
            parse_mode: "HTML"
        });

        // ✅ LANGSUNG KE MENU UTAMA
        const menu = require('./menu.js');
        const users = menu.loadUsers();
        await menu.showMenu(bot, chatId, users);
        return true;
    }

    return false;
};

// ============================
// HANDLE MANUAL INPUT
// ============================
const handleManualInput = async (bot, chatId, text) => {
    const session = getTopupSession(chatId);
    if (!session || session.feature !== 'topup_manual') {
        return false;
    }

    if (text.toLowerCase() === 'batal' || text === '❌ BATAL') {
        clearTopupSession(chatId);
        await bot.sendMessage(chatId, '❌ Topup dibatalkan.', {
            reply_markup: {
                keyboard: [
                    ['📱 Cek NIK ke No HP'],
                    ['💰 Cek Saldo', '📢 Topup Saldo'],
                    ['👤 Profil Saya'],
                    ['❓ Bantuan', '📞 Hubungi Owner']
                ],
                resize_keyboard: true
            }
        });
        return true;
    }

    const amount = parseInt(text.replace(/[^0-9]/g, ''));
    if (isNaN(amount) || amount < 10000) {
        await bot.sendMessage(chatId, '❌ Minimal topup Rp10.000! Silakan kirim nominal yang valid.', { parse_mode: "HTML" });
        return true;
    }

    if (amount > 1000000) {
        await bot.sendMessage(chatId, '❌ Maksimal topup Rp1.000.000! Silakan kirim nominal yang valid.', { parse_mode: "HTML" });
        return true;
    }

    clearTopupSession(chatId);

    await bot.sendMessage(chatId, '🔄', {
        reply_markup: { remove_keyboard: true }
    });

    await processTopup(bot, chatId, amount);
    return true;
};

// ============================
// EXPORT
// ============================
module.exports = {
    setTopupSession,
    getTopupSession,
    clearTopupSession,
    showTopupMenu,
    processTopup,
    processTopupSuccess,
    checkTopupStatus,
    handleTopupCallback,
    handleManualInput
};