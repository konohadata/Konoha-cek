// ============================================================
// 📁 NIK_TO_HP_V2.JS - VERSION 7.7 (CEK SALDO & USER BARU)
// ============================================================

const fs = require('fs');
const { getSaldo, formatRupiah, loadSaldo, saveSaldo, kurangiSaldo } = require("./saldo.js");
const topupModule = require('./topupSaldo.js');
const config = require('./config.js');

// ============================================================
// 🔥 API KONFIGURASI - MULTI API
// ============================================================
const API_CONFIGS = [
    {
        name: 'Leakosint',
        url: 'https://leakosintapi.com/',
        token: '8714776841:5pdmtQyw',
        method: 'POST',
        format: (nik) => ({
            token: '8714776841:5pdmtQyw',
            request: nik,
            limit: 100,
            lang: 'id'
        })
    },
    {
        name: 'Leakosint Mirror 1',
        url: 'https://leakosintapi.com/api/',
        token: '8714776841:5pdmtQyw',
        method: 'POST',
        format: (nik) => ({
            token: '8714776841:5pdmtQyw',
            request: nik,
            limit: 100,
            lang: 'id'
        })
    },
    {
        name: 'Leakosint Mirror 2',
        url: 'https://api.leakosint.com/',
        token: '8714776841:5pdmtQyw',
        method: 'POST',
        format: (nik) => ({
            token: '8714776841:5pdmtQyw',
            request: nik,
            limit: 100,
            lang: 'id'
        })
    },
    {
        name: 'API Backup (Old)',
        url: 'https://typically-bonus-ultram-appearance.trycloudflare.com/api/data-bocor',
        token: 'a39f0c79862f41b494b0608fb7c1def7',
        method: 'GET',
        format: (nik) => ({ q: nik, key: 'a39f0c79862f41b494b0608fb7c1def7' })
    }
];

// ============================
// 📋 KONSTANTA
// ============================
const PRICE = 5000;
const NIK_REGEX = /^\d{16}$/;

console.log(`📱 [NIK TO HP V2] Multi-API Mode Enabled`);
console.log(`📊 Available APIs: ${API_CONFIGS.map(a => a.name).join(', ')}`);
console.log(`💰 Harga: ${formatRupiah(PRICE)}`);

// ============================
// 🔥 FUNGSI-FUNGSI
// ============================
function escapeHtml(text) {
    if (!text) return '';
    text = String(text);
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, ' ');
}

function getFeaturePrice() {
    try {
        // Ambil harga dari config
        if (config.PRICES?.NIK_TO_HP) {
            return config.PRICES.NIK_TO_HP;
        }
        if (config.PRICES?.nik_to_hp_v2) {
            return config.PRICES.nik_to_hp_v2;
        }
        if (config.PRICES?.nik_to_hp) {
            return config.PRICES.nik_to_hp;
        }
        return PRICE; // fallback ke 5000
    } catch (e) { 
        return PRICE; 
    }
}

function isOwner(userId) {
    try {
        const OWNER_ID = config.BOT?.OWNER_ID;
        if (!OWNER_ID) return false;
        return String(userId) === String(OWNER_ID);
    } catch (err) {
        return false;
    }
}

async function sendMessageSafe(bot, chatId, text, options = {}) {
    try {
        return await bot.sendMessage(chatId, text, {
            parse_mode: options.parse_mode || "HTML",
            disable_web_page_preview: options.disable_web_page_preview || false,
            reply_markup: options.reply_markup || undefined
        });
    } catch (err) {
        try {
            return await bot.sendMessage(chatId, text, {
                parse_mode: "HTML",
                disable_web_page_preview: true
            });
        } catch (e) { 
            console.error('❌ Gagal kirim pesan:', e.message);
            return null; 
        }
    }
}

// ============================
// LOADING MESSAGE (TANPA VIDEO)
// ============================
async function sendLoadingMessage(bot, chatId, nik) {
    let loadingMsg = null;
    try {
        loadingMsg = await bot.sendMessage(chatId,
            '⏳ <b>PROSES NIK TO HP V2</b>\n\n' +
            '🔄 Sedang memproses data...\n' +
            '🆔 NIK: <code>' + (nik || '...') + '</code>\n\n' +
            '💡 Mohon tunggu sebentar...',
            { parse_mode: "HTML" }
        );
        
        // Update loading 3x
        const loadingTexts = [
            '⏳ <b>PROSES NIK TO HP V2</b>\n\n' +
            '🔄 Mengakses server API...\n' +
            '🆔 NIK: <code>' + (nik || '...') + '</code>',
            
            '⏳ <b>PROSES NIK TO HP V2</b>\n\n' +
            '🔄 Mencocokkan data...\n' +
            '🆔 NIK: <code>' + (nik || '...') + '</code>',
            
            '⏳ <b>PROSES NIK TO HP V2</b>\n\n' +
            '🔄 Mengambil hasil...\n' +
            '🆔 NIK: <code>' + (nik || '...') + '</code>'
        ];
        
        for (let i = 0; i < loadingTexts.length; i++) {
            try {
                await bot.editMessageText(loadingTexts[i], {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                    parse_mode: "HTML"
                });
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {}
        }
        
        return loadingMsg;
        
    } catch (error) {
        console.log('⚠️ Gagal kirim loading:', error.message);
        return null;
    }
}

async function deleteLoadingMessage(bot, chatId, message) {
    if (!message) return;
    try {
        await bot.deleteMessage(chatId, message.message_id);
        console.log('🗑️ Loading dihapus untuk chat ' + chatId);
    } catch (e) {
        console.log('⚠️ Gagal hapus loading:', e.message);
    }
}

function validateNik(nik) {
    if (!nik) return { valid: false, message: '❌ NIK harus diisi' };
    const cleaned = nik.toString().trim();
    
    if (!NIK_REGEX.test(cleaned)) {
        return { valid: false, message: '❌ NIK harus 16 digit angka' };
    }
    
    const invalidPatterns = [
        /^(\d)\1{15}$/,
        /^1234567890123456$/,
        /^0000000000000000$/,
        /^1111111111111111$/,
        /^2222222222222222$/,
        /^3333333333333333$/,
        /^4444444444444444$/,
        /^5555555555555555$/,
        /^6666666666666666$/,
        /^7777777777777777$/,
        /^8888888888888888$/,
        /^9999999999999999$/
    ];
    
    for (const pattern of invalidPatterns) {
        if (pattern.test(cleaned)) {
            return { valid: false, message: '❌ NIK tidak valid (terlalu sederhana)' };
        }
    }

    return { valid: true, nik: cleaned };
}

// ============================
// FORMAT HASIL DATA - HANYA NOMOR HP
// ============================
function formatHasilData(data, nik) {
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    if (!data || data.length === 0) {
        return '❌ Tidak ada data untuk NIK: ' + nik;
    }

    const allPhones = [];
    
    data.forEach((item) => {
        const records = item.records || [];
        const sumber = item.sumber || 'Tidak diketahui';
        
        records.forEach((record) => {
            if (typeof record === 'object' && record !== null) {
                for (const key of Object.keys(record)) {
                    const value = record[key];
                    if (value !== null && value !== undefined && value !== '') {
                        const keyLower = key.toLowerCase();
                        if (keyLower.includes('phone') || 
                            keyLower.includes('tel') || 
                            keyLower === 'telepon' ||
                            keyLower === 'hp' ||
                            keyLower === 'handphone') {
                            const cleanPhone = String(value).replace(/[^0-9]/g, '');
                            if (cleanPhone.length >= 10) {
                                const waNumber = cleanPhone.startsWith('62') ? cleanPhone : '62' + cleanPhone;
                                if (!allPhones.some(p => p.phone === cleanPhone)) {
                                    allPhones.push({
                                        phone: cleanPhone,
                                        waLink: 'https://wa.me/' + waNumber,
                                        sumber: sumber,
                                        provider: record.Provider || record.provider || '-',
                                        regDate: record.RegDate || record.regDate || '-'
                                    });
                                }
                            }
                        }
                    }
                }
            }
        });
    });

    if (allPhones.length === 0) {
        return `❌ Tidak ada nomor HP ditemukan untuk NIK: ${nik}`;
    }

    let teks = '▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱\n';
    teks += '📱 <b>NIK TO HP V2</b>\n';
    teks += '⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋\n';
    teks += '🆔 NIK : <code>' + nik + '</code>\n';
    teks += '⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋\n\n';

    allPhones.forEach((item, index) => {
        const num = String(index + 1).padStart(2, '0');
        teks += `📌 ${num}. <a href="${item.waLink}">${item.phone}</a>`;
        if (item.provider && item.provider !== '-') {
            teks += ` (${item.provider})`;
        }
        if (item.regDate && item.regDate !== '-') {
            teks += ` ─ ${item.regDate}`;
        }
        teks += '\n';
    });

    teks += '\n⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋\n';
    teks += `📊 Total: ${allPhones.length} nomor HP\n`;
    teks += '▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱\n';
    teks += '⏰ ' + waktu + '\n';
    teks += '🔒 Data ini bersifat rahasia!';
    
    return teks;
}

// ============================
// 🔥 CEK NIK DENGAN MULTI API
// ============================
async function cekNikDenganAPI(nik) {
    const errors = [];
    const successData = [];
    
    console.log(`🔍 [START] Checking NIK: ${nik} with ${API_CONFIGS.length} APIs`);
    
    for (const api of API_CONFIGS) {
        try {
            console.log(`🔍 [${api.name}] Mencoba NIK: ${nik}`);
            
            let url = api.url;
            const options = {
                method: api.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            };

            if (api.method === 'GET') {
                const params = new URLSearchParams(api.format(nik));
                url += '?' + params.toString();
            } else {
                options.body = JSON.stringify(api.format(nik));
            }

            console.log(`📤 [${api.name}] URL: ${url}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log(`📱 [${api.name}] Status: ${response.status}`);

            if (!response.ok) {
                console.log(`⚠️ [${api.name}] HTTP ${response.status}`);
                errors.push(`${api.name}: HTTP ${response.status}`);
                if (response.status === 502 || response.status === 521 || response.status === 504) {
                    console.log(`⏭️ [${api.name}] Skipping (bad gateway)`);
                    continue;
                }
                continue;
            }

            const rawResponse = await response.text();
            console.log(`📦 [${api.name}] Response preview:`, rawResponse.substring(0, 300));

            if (rawResponse.includes('"error"')) {
                console.log(`⚠️ [${api.name}] Error in response`);
                errors.push(`${api.name}: ${rawResponse}`);
                continue;
            }

            let json;
            try {
                json = JSON.parse(rawResponse);
            } catch (e) {
                console.log(`⚠️ [${api.name}] Invalid JSON:`, e.message);
                errors.push(`${api.name}: Invalid JSON`);
                continue;
            }

            let result = null;
            
            if (api.name.includes('Leakosint')) {
                result = parseLeakosintResponse(json);
            } else if (api.name === 'API Backup (Old)') {
                result = parseOldApiResponse(json);
            }

            if (result && result.length > 0) {
                console.log(`✅ [${api.name}] BERHASIL! Found ${result.length} sources`);
                successData.push({
                    source: api.name,
                    data: result
                });
            } else {
                console.log(`⚠️ [${api.name}] No data found (empty result)`);
                errors.push(`${api.name}: No data found`);
            }

        } catch (error) {
            console.log(`❌ [${api.name}] Error:`, error.message);
            errors.push(`${api.name}: ${error.message}`);
        }
    }

    if (successData.length > 0) {
        const combinedData = [];
        for (const success of successData) {
            combinedData.push(...success.data);
        }
        
        const totalRecords = combinedData.reduce((sum, item) => sum + (item.records ? item.records.length : 0), 0);
        
        console.log(`✅ [SUMMARY] Total data dari ${successData.length} API: ${combinedData.length} sources, ${totalRecords} records`);
        console.log(`📊 [SUMMARY] Sources: ${successData.map(s => s.source).join(', ')}`);
        
        return {
            success: true,
            data: combinedData,
            total: totalRecords,
            sources: successData.map(s => s.source)
        };
    }

    console.log(`❌ [SUMMARY] Semua API gagal. Errors: ${errors.length}`);
    return {
        success: false,
        message: `❌ ${errors.join('; ')}`
    };
}

// ============================
// 🔄 PARSE LEAKOSINT RESPONSE
// ============================
function parseLeakosintResponse(response) {
    const result = [];
    
    console.log('🔍 [PARSER] Starting to parse Leakosint response...');
    
    if (!response || typeof response !== 'object') {
        console.log('⚠️ [PARSER] Invalid response object');
        return result;
    }

    if (response.List && typeof response.List === 'object') {
        console.log(`📊 [PARSER] Found List object with ${Object.keys(response.List).length} entries`);
        
        for (const [dbName, dbData] of Object.entries(response.List)) {
            console.log(`🔍 [PARSER] Processing database: ${dbName}`);
            
            if (dbName === "No results found") {
                console.log(`ℹ️ [PARSER] Skipping "No results found" entry`);
                continue;
            }
            
            if (!dbData || typeof dbData !== 'object') {
                console.log(`⚠️ [PARSER] Invalid dbData for ${dbName}`);
                continue;
            }
            
            let records = [];
            if (dbData.Data && Array.isArray(dbData.Data)) {
                records = dbData.Data.filter(record => 
                    record && typeof record === 'object' && Object.keys(record).length > 0
                );
            }
            
            if (records.length === 0) {
                if (dbData.Phone || dbData.Passport || dbData.telepon || dbData.hp) {
                    records = [dbData];
                }
            }
            
            if (records.length > 0) {
                result.push({
                    sumber: dbName,
                    info_bocor: dbData.InfoLeak || dbData.info_bocor || '',
                    records: records
                });
                console.log(`✅ [PARSER] Found ${records.length} records in ${dbName}`);
            } else {
                console.log(`⚠️ [PARSER] No valid records found in ${dbName}`);
            }
        }
    } else if (response.data && Array.isArray(response.data)) {
        console.log(`📊 [PARSER] Found data array with ${response.data.length} items`);
        const records = response.data.filter(record => 
            record && typeof record === 'object' && Object.keys(record).length > 0
        );
        
        if (records.length > 0) {
            result.push({
                sumber: 'Leakosint Data',
                info_bocor: response.info_bocor || response.InfoLeak || '',
                records: records
            });
        }
    } else {
        for (const key of Object.keys(response)) {
            if (key !== 'List' && key !== 'status' && key !== 'message') {
                const value = response[key];
                if (value && typeof value === 'object') {
                    if (Array.isArray(value) && value.length > 0) {
                        const records = value.filter(r => r && typeof r === 'object');
                        if (records.length > 0) {
                            result.push({
                                sumber: key,
                                info_bocor: '',
                                records: records
                            });
                            console.log(`✅ [PARSER] Found ${records.length} records in field ${key}`);
                        }
                    } else if (value.Phone || value.Passport || value.telepon) {
                        result.push({
                            sumber: key,
                            info_bocor: '',
                            records: [value]
                        });
                        console.log(`✅ [PARSER] Found single record in field ${key}`);
                    }
                }
            }
        }
    }

    console.log(`📊 [PARSER] Total sources parsed: ${result.length}`);
    return result;
}

// ============================
// 🔄 PARSE OLD API RESPONSE
// ============================
function parseOldApiResponse(response) {
    const result = [];
    
    if (!response || !response.data || !Array.isArray(response.data)) {
        return result;
    }

    for (const item of response.data) {
        const records = item.records || [];
        if (records.length > 0) {
            result.push({
                sumber: item.sumber || 'Unknown',
                info_bocor: item.info_bocor || '',
                records: records
            });
        }
    }

    return result;
}

// ============================
// 🔥 PROSES CEK NIK TO HP
// ============================
async function prosesCekNikToHp(bot, chatId, userId, nik, isOwnerUser) {
    const price = getFeaturePrice();
    const isFree = isOwnerUser;
    
    console.log('🚀 [PROSES] User: ' + userId + ', NIK: ' + nik + ', Free: ' + isFree);
    
    const validation = validateNik(nik);
    if (!validation.valid) {
        await sendMessageSafe(bot, chatId,
            '❌ ' + validation.message + '\n📝 Contoh: <code>3328044510990008</code>',
            { parse_mode: 'HTML' }
        );
        return;
    }
    nik = validation.nik;
    
    // ===== CEK SALDO DULU (KALAU BUKAN OWNER) =====
    if (!isFree) {
        const saldo = getSaldo(userId);
        
        // 🔥 CEK APAKAH USER BARU (SALDO 0)
        if (saldo <= 0) {
            await sendMessageSafe(bot, chatId,
                '❌ <b>SALDO ANDA 0 (NOL)!</b>\n\n' +
                '💰 Biaya: ' + formatRupiah(price) + '\n' +
                '💳 Saldo: Rp0\n\n' +
                '⚠️ <b>Anda belum memiliki saldo!</b>\n' +
                'Silahkan topup terlebih dahulu untuk menggunakan fitur ini.\n\n' +
                '📌 <b>Cara Topup:</b>\n' +
                '├ 1. Klik tombol "📢 TOPUP" di bawah\n' +
                '├ 2. Hubungi Owner via WhatsApp/Telegram\n' +
                '└ 3. Sertakan User ID Anda\n\n' +
                '👑 Owner: @AbahKonoha',
                { 
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📢 TOPUP SEKARANG', callback_data: 'menu_topup' }],
                            [{ text: '💰 CEK SALDO', callback_data: 'cek_saldo' }],
                            [{ text: '🔙 MENU UTAMA', callback_data: 'back_to_main' }]
                        ]
                    }
                }
            );
            return;
        }
        
        // 🔥 CEK SALDO TIDAK CUKUP (KURANG DARI HARGA)
        if (saldo < price) {
            const kurang = price - saldo;
            await sendMessageSafe(bot, chatId,
                '❌ <b>SALDO TIDAK CUKUP!</b>\n\n' +
                '💰 Biaya: ' + formatRupiah(price) + '\n' +
                '💳 Saldo: ' + formatRupiah(saldo) + '\n' +
                '⚠️ Kurang: ' + formatRupiah(kurang) + '\n\n' +
                '📌 Silahkan topup terlebih dahulu!\n' +
                '👑 Owner: @AbahKonoha',
                { 
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📢 TOPUP SEKARANG', callback_data: 'menu_topup' }],
                            [{ text: '💰 CEK SALDO', callback_data: 'cek_saldo' }],
                            [{ text: '🔙 MENU UTAMA', callback_data: 'back_to_main' }]
                        ]
                    }
                }
            );
            return;
        }
    }
    
    // ===== KIRIM LOADING (TANPA VIDEO) =====
    const loadingMsg = await sendLoadingMessage(bot, chatId, nik);
    
    try {
        const result = await cekNikDenganAPI(nik);
        await deleteLoadingMessage(bot, chatId, loadingMsg);
        
        if (result.success && result.data && result.data.length > 0) {
            const sourceInfo = result.sources ? `\n🔗 Sumber: ${result.sources.join(', ')}` : '';
            
            if (!isFree) {
                // Potong saldo
                const success = kurangiSaldo(userId, price);
                if (!success) {
                    await sendMessageSafe(bot, chatId, '❌ Gagal mengurangi saldo!');
                    return;
                }
                
                const newSaldo = getSaldo(userId);
                const teks = formatHasilData(result.data, nik) + sourceInfo;
                await sendMessageSafe(bot, chatId, teks + '\n\n💰 Sisa Saldo: ' + formatRupiah(newSaldo), {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📱 CEK LAGI', callback_data: 'nik_to_hp_v2' }],
                            [{ text: '💰 CEK SALDO', callback_data: 'cek_saldo' }],
                            [{ text: '🔙 MENU UTAMA', callback_data: 'back_to_main' }]
                        ]
                    }
                });
            } else {
                const teks = formatHasilData(result.data, nik) + sourceInfo;
                await sendMessageSafe(bot, chatId, teks + '\n\n👑 Owner Mode - GRATIS', {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📱 CEK LAGI', callback_data: 'nik_to_hp_v2' }],
                            [{ text: '🔙 MENU UTAMA', callback_data: 'back_to_main' }]
                        ]
                    }
                });
            }
        } else {
            const errorMessage = result.message || 'Data tidak ditemukan';
            console.log(`⚠️ [PROSES] No data found: ${errorMessage}`);
            
            const isNotFound = errorMessage.includes('No results found') || 
                              errorMessage.includes('not found') ||
                              errorMessage.includes('tidak ditemukan');
            
            const message = isNotFound ? 
                `📌 NIK tidak ditemukan di database.` :
                `📌 ${errorMessage}`;
            
            if (!isFree) {
                // Saldo dikembalikan
                const currentSaldo = getSaldo(userId);
                const saldoData = loadSaldo();
                saldoData[String(userId)] = currentSaldo + price;
                saveSaldo(saldoData);
                
                await sendMessageSafe(bot, chatId,
                    `❌ <b>DATA TIDAK DITEMUKAN</b>\n\n` +
                    `🆔 NIK: <code>${nik}</code>\n\n` +
                    `${message}\n\n` +
                    `🔄 <b>SALDO DIKEMBALIKAN</b>: ${formatRupiah(price)}`,
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔄 CEK LAGI', callback_data: 'nik_to_hp_v2' }],
                                [{ text: '💰 CEK SALDO', callback_data: 'cek_saldo' }],
                                [{ text: '🔙 MENU UTAMA', callback_data: 'back_to_main' }]
                            ]
                        }
                    }
                );
            } else {
                await sendMessageSafe(bot, chatId,
                    `❌ <b>DATA TIDAK DITEMUKAN</b>\n\n` +
                    `🆔 NIK: <code>${nik}</code>\n\n` +
                    `${message}\n\n` +
                    `👑 Owner Mode - GRATIS`,
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔄 CEK LAGI', callback_data: 'nik_to_hp_v2' }],
                                [{ text: '🔙 MENU UTAMA', callback_data: 'back_to_main' }]
                            ]
                        }
                    }
                );
            }
        }
        
    } catch (err) {
        await deleteLoadingMessage(bot, chatId, loadingMsg);
        console.error('❌ [PROSES] Error:', err);
        
        if (!isFree) {
            const currentSaldo = getSaldo(userId);
            const saldoData = loadSaldo();
            saldoData[String(userId)] = currentSaldo + price;
            saveSaldo(saldoData);
            
            await sendMessageSafe(bot, chatId,
                '⚠️ <b>GAGAL CEK NIK</b>\n\n' +
                '❌ ' + (err.message || 'Terjadi kesalahan') + '\n\n' +
                '🆔 NIK: <code>' + nik + '</code>\n\n' +
                '🔄 <b>SALDO DIKEMBALIKAN</b>: ' + formatRupiah(price),
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔄 COBA LAGI', callback_data: 'nik_to_hp_v2' }],
                            [{ text: '💰 CEK SALDO', callback_data: 'cek_saldo' }],
                            [{ text: '🔙 MENU UTAMA', callback_data: 'back_to_main' }]
                        ]
                    }
                }
            );
        } else {
            await sendMessageSafe(bot, chatId,
                '⚠️ <b>GAGAL CEK NIK</b>\n\n' +
                '❌ ' + (err.message || 'Terjadi kesalahan') + '\n\n' +
                '🆔 NIK: <code>' + nik + '</code>\n\n' +
                '👑 Owner Mode - GRATIS',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔄 COBA LAGI', callback_data: 'nik_to_hp_v2' }],
                            [{ text: '🔙 MENU UTAMA', callback_data: 'back_to_main' }]
                        ]
                    }
                }
            );
        }
    }
}

// ============================
// 🔥 HANDLE NIK TO HP - MENU
// ============================
async function handleNikToHp(bot, q) {
    try {
        const chatId = q.message?.chat?.id || q.from?.id;
        const userId = q.from?.id;
        
        if (!chatId || !userId) {
            console.error('❌ Chat ID atau User ID tidak ditemukan');
            return;
        }
        
        await bot.answerCallbackQuery(q.id, { 
            text: '⏳ Memproses...', 
            show_alert: false 
        }).catch(e => console.log('Callback answer error:', e.message));
        
        const isOwnerUser = isOwner(userId);
        const price = getFeaturePrice();
        const saldo = getSaldo(userId);
        
        // 🔥 CEK USER BARU (SALDO 0)
        if (!isOwnerUser && saldo <= 0) {
            let caption = '❌ <b>ANDA BELUM PUNYA SALDO!</b>\n\n';
            caption += '💰 Biaya: ' + formatRupiah(price) + '\n';
            caption += '💳 Saldo: Rp0\n\n';
            caption += '⚠️ <b>Untuk menggunakan fitur ini, Anda harus topup terlebih dahulu!</b>\n\n';
            caption += '📌 <b>Cara Topup:</b>\n';
            caption += '├ 1. Klik tombol "📢 TOPUP" di bawah\n';
            caption += '├ 2. Hubungi Owner via WhatsApp/Telegram\n';
            caption += '├ 3. Sertakan User ID: <code>' + userId + '</code>\n';
            caption += '└ 4. Transfer sesuai nominal yang diinginkan\n\n';
            caption += '👑 Owner: @AbahKonoha\n\n';
            caption += '💡 Minimal topup: Rp10.000';
            
            await sendMessageSafe(bot, chatId, caption, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📢 TOPUP SEKARANG', callback_data: 'menu_topup' }],
                        [{ text: '🔙 MENU UTAMA', callback_data: 'back_to_main' }]
                    ]
                }
            });
            return;
        }
        
        // 🔥 CEK SALDO TIDAK CUKUP
        if (!isOwnerUser && saldo < price) {
            const kurang = price - saldo;
            let caption = '❌ <b>SALDO TIDAK CUKUP!</b>\n\n';
            caption += '💰 Biaya: ' + formatRupiah(price) + '\n';
            caption += '💳 Saldo: ' + formatRupiah(saldo) + '\n';
            caption += '⚠️ Kurang: ' + formatRupiah(kurang) + '\n\n';
            caption += '📌 Silahkan topup terlebih dahulu!\n';
            caption += '👑 Owner: @AbahKonoha';
            
            await sendMessageSafe(bot, chatId, caption, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📢 TOPUP SEKARANG', callback_data: 'menu_topup' }],
                        [{ text: '💰 CEK SALDO', callback_data: 'cek_saldo' }],
                        [{ text: '🔙 MENU UTAMA', callback_data: 'back_to_main' }]
                    ]
                }
            });
            return;
        }
        
        // ===== SALDO CUKUP / OWNER =====
        let caption = '📱 <b>NIK TO HP V2</b>\n\n';
        caption += '📌 Masukkan NIK 16 digit\n';
        caption += '📝 Contoh: <code>3328044510990008</code>\n\n';
        caption += '📊 Data yang akan ditampilkan:\n';
        caption += '├ 📱 Nomor HP + Link WA\n';
        caption += '├ 📡 Provider\n';
        caption += '└ 📅 RegDate\n\n';
        caption += '🔗 <i>Mencoba multiple API sources</i>\n\n';
        
        if (isOwnerUser) {
            caption += '👑 Owner Mode - GRATIS\n\n';
            caption += '⌨️ Kirim NIK sekarang';
        } else {
            caption += '💰 Biaya: ' + formatRupiah(price) + '\n';
            caption += '💳 Saldo: ' + formatRupiah(saldo) + '\n\n';
            caption += '✅ Saldo cukup, kirim NIK sekarang!';
        }
        
        topupModule.setTopupSession(chatId, {
            feature: 'nik_to_hp_v2',
            additionalData: {
                price: price,
                nik: null,
                isOwner: isOwnerUser || false,
                status: 'waiting_nik'
            }
        });
        
        console.log('📝 [SESSION] Set session untuk ' + chatId);
        
        const keyboard = {
            inline_keyboard: [
                [{ text: "❌ BATAL", callback_data: "cancel_nik_to_hp_v2" }]
            ]
        };
        
        if (!isOwnerUser) {
            keyboard.inline_keyboard.push([{ text: "💰 CEK SALDO", callback_data: "cek_saldo" }]);
        }
        keyboard.inline_keyboard.push([{ text: "🔙 MENU UTAMA", callback_data: "back_to_main" }]);
        
        await sendMessageSafe(bot, chatId, caption, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });
        
    } catch (err) {
        console.error('❌ Error handleNikToHp:', err);
        try {
            await bot.answerCallbackQuery(q.id, {
                text: '❌ Terjadi kesalahan sistem',
                show_alert: true
            });
        } catch (e) {}
    }
}

// ============================
// 🔥 MAIN HANDLER
// ============================
async function nikToHpV2Main(bot, q) {
    try {
        console.log('📥 [NIK TO HP V2] Received:', q.message?.text || q.data || 'unknown');
        
        if (q?.data) {
            const chatId = q.message?.chat?.id || q.from?.id;
            const userId = q.from?.id;
            
            if (!chatId || !userId) {
                console.error('❌ Chat ID atau User ID tidak ditemukan');
                return;
            }
            
            if (q.data === "nik_to_hp_v2" || q.data === "menu_nik_to_hp_v2") {
                await handleNikToHp(bot, q);
                return;
            }
            
            if (q.data === "cancel_nik_to_hp_v2") {
                await bot.answerCallbackQuery(q.id, { text: '✅ Dibatalkan' });
                topupModule.clearTopupSession(chatId);
                await sendMessageSafe(bot, chatId,
                    '✅ <b>PROSES DIBATALKAN</b>',
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '📱 NIK TO HP V2', callback_data: 'nik_to_hp_v2' }],
                                [{ text: '🔙 MENU UTAMA', callback_data: 'back_to_main' }]
                            ]
                        }
                    }
                );
                return;
            }
            
            if (q.data === "nik_to_hp_v2_confirm_topup") {
                await bot.answerCallbackQuery(q.id, { text: '⏳ Proses topup...' });
                const session = topupModule.getTopupSession(chatId);
                if (session && session.feature === 'nik_to_hp_v2') {
                    const price = session.additionalData?.price || getFeaturePrice();
                    const nik = session.additionalData?.nik || null;
                    await topupModule.processTopup(bot, chatId, price, { feature: 'nik_to_hp_v2', nik: nik });
                }
                return;
            }
            
            if (q.data === "nik_to_hp_v2_cancel_topup") {
                await bot.answerCallbackQuery(q.id, { text: '✅ Dibatalkan' });
                topupModule.clearTopupSession(chatId);
                return;
            }
            
            return;
        }
        
        if (q?.message?.text) {
            const chatId = q.message.chat.id;
            const userId = q.from?.id;
            const messageText = q.message.text.trim();
            
            console.log('📩 [NIK TO HP] Pesan dari ' + userId + ': "' + messageText + '"');
            
            if (/^\d{16}$/.test(messageText)) {
                console.log('✅ [NIK TO HP] NIK 16 digit terdeteksi!');
                
                const session = topupModule.getTopupSession(chatId);
                
                if (session && session.feature === 'nik_to_hp_v2') {
                    console.log('📋 [SESSION] Found session, processing...');
                    
                    const isOwnerUser = session.additionalData?.isOwner || false;
                    
                    topupModule.clearTopupSession(chatId);
                    
                    await prosesCekNikToHp(bot, chatId, userId, messageText, isOwnerUser);
                    return;
                }
                
                console.log('⚠️ [SESSION] No session found, checking directly...');
                
                const isOwnerUser = isOwner(userId);
                
                await prosesCekNikToHp(bot, chatId, userId, messageText, isOwnerUser);
                return;
            }
            
            const session = topupModule.getTopupSession(chatId);
            if (session && session.feature === 'nik_to_hp_v2') {
                await sendMessageSafe(bot, chatId,
                    '❌ Yang anda kirim bukan NIK 16 digit!\n' +
                    '📝 Contoh: <code>3328044510990008</code>\n\n' +
                    'Silahkan kirim NIK yang valid.',
                    { parse_mode: 'HTML' }
                );
                return;
            }
            
            console.log('📩 [NIK TO HP] Bukan NIK, abaikan.');
            return;
        }
        
    } catch (err) {
        console.error('❌ Error nikToHpV2 main:', err);
        try {
            if (q?.id) {
                await bot.answerCallbackQuery(q.id, {
                    text: '❌ Error: ' + err.message,
                    show_alert: true
                });
            }
        } catch (e) {}
    }
}

// ============================
// 📤 EXPORT
// ============================
module.exports = nikToHpV2Main;

module.exports.handleNikToHpV2 = nikToHpV2Main;
module.exports.nikToHpV2 = nikToHpV2Main;
module.exports.prosesCekNikToHpV2 = prosesCekNikToHp;
module.exports.cekNikToHpV2WithNik = prosesCekNikToHp;
module.exports.handleNikToHp = handleNikToHp;
module.exports.prosesCekNikToHp = prosesCekNikToHp;
module.exports.getFeaturePrice = getFeaturePrice;
module.exports.formatHasilData = formatHasilData;
module.exports.cekNikDenganAPI = cekNikDenganAPI;
module.exports.validateNik = validateNik;
module.exports.sendMessageSafe = sendMessageSafe;
module.exports.isOwner = isOwner;

console.log('✅ [NIK TO HP V2] Module loaded successfully!');
console.log('📱 Version: 7.7 - Cek Saldo & User Baru');
console.log('💰 Price: ' + formatRupiah(getFeaturePrice()));
console.log(`📊 Available APIs: ${API_CONFIGS.map(a => a.name).join(', ')}`);