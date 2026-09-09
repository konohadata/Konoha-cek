// ============================
// 📁 NIK_TO_HP_HANDLER.JS - VERSI SIMPLE
// ============================

const nikToHpV2 = require('./nikToHpV2.js');

async function handleNikToHpCallback(bot, q) {
    try {
        const data = q.data;
        const chatId = q.message?.chat?.id || q.from?.id;
        const userId = q.from?.id;

        if (!chatId || !userId) {
            console.error('❌ Chat ID atau User ID tidak ditemukan');
            return;
        }

        if (data === "nik_to_hp_v2" || data === "menu_nik_to_hp_v2") {
            await nikToHpV2(bot, q);
            return;
        }

        if (data === "cancel_nik_to_hp_v2") {
            await bot.answerCallbackQuery(q.id, { text: '✅ Dibatalkan' });
            const topupModule = require('./topupSaldo.js');
            topupModule.clearTopupSession(chatId);
            await bot.sendMessage(chatId, '✅ <b>PROSES NIK TO HP DIBATALKAN</b>', {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📱 NIK TO HP V2', callback_data: 'nik_to_hp_v2' }],
                        [{ text: '🔙 MENU UTAMA', callback_data: 'back_to_main' }]
                    ]
                }
            });
            return;
        }

        if (data === "nik_to_hp_v2_confirm_topup") {
            await bot.answerCallbackQuery(q.id, { text: '⏳ Proses topup...' });
            const topupModule = require('./topupSaldo.js');
            const session = topupModule.getTopupSession(chatId);
            if (session && session.feature === 'nik_to_hp_v2') {
                const price = session.additionalData?.price || 5000;
                const nik = session.additionalData?.nik || null;
                await topupModule.processTopup(bot, chatId, price, { feature: 'nik_to_hp_v2', nik: nik });
            }
            return;
        }

        if (data === "nik_to_hp_v2_cancel_topup") {
            await bot.answerCallbackQuery(q.id, { text: '✅ Dibatalkan' });
            const topupModule = require('./topupSaldo.js');
            topupModule.clearTopupSession(chatId);
            return;
        }

    } catch (err) {
        console.error('❌ Error handleNikToHpCallback:', err);
        try {
            await bot.answerCallbackQuery(q.id, {
                text: '❌ Error: ' + err.message,
                show_alert: true
            });
        } catch (e) {}
    }
}

async function handleNikToHpMessage(bot, msg) {
    try {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;
        const messageText = msg.text?.trim() || '';

        if (!chatId || !userId) return false;

        if (/^\d{16}$/.test(messageText)) {
            console.log(`📩 [NIK TO HP] Valid NIK detected: ${messageText}`);
            
            const topupModule = require('./topupSaldo.js');
            const session = topupModule.getTopupSession(chatId);
            
            if (session && session.feature === 'nik_to_hp_v2') {
                console.log('📋 [SESSION] Found NIK TO HP session, processing...');
                const isOwnerUser = session.additionalData?.isOwner || false;
                topupModule.clearTopupSession(chatId);
                await nikToHpV2.prosesCekNikToHp(bot, chatId, userId, messageText, isOwnerUser);
                return true;
            }
            
            console.log('⚠️ [SESSION] No session found, checking as owner...');
            const isOwnerUser = nikToHpV2.isOwner(userId);
            await nikToHpV2.prosesCekNikToHp(bot, chatId, userId, messageText, isOwnerUser);
            return true;
        }

        const topupModule = require('./topupSaldo.js');
        const session = topupModule.getTopupSession(chatId);
        if (session && session.feature === 'nik_to_hp_v2') {
            await bot.sendMessage(chatId,
                '❌ Yang anda kirim bukan NIK 16 digit!\n' +
                '📝 Contoh: <code>3328044510990008</code>\n\n' +
                'Silahkan kirim NIK yang valid.',
                { parse_mode: 'HTML' }
            );
            return true;
        }

        return false;

    } catch (err) {
        console.error('❌ Error handleNikToHpMessage:', err);
        return false;
    }
}

module.exports = {
    handleNikToHpCallback,
    handleNikToHpMessage
};