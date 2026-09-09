// ============================
// PAYMENT.JS - DENGAN GOMERCH FALLBACK (FIXED)
// ============================

const config = require('./config');

// ============================
// 🔥 KONFIGURASI
// ============================
const IS_DEV = process.env.NODE_ENV === 'development';
const MAINTENANCE_MODE = false;

// ============================
// 🔥 HELPERS
// ============================
const log = (msg, ...args) => console.log(`🔍 [PAYMENT] ${msg}`, ...args);
const warn = (msg, ...args) => console.warn(`⚠️ [PAYMENT] ${msg}`, ...args);
const error = (msg, ...args) => console.error(`❌ [PAYMENT] ${msg}`, ...args);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================
// 🔥 GENERATE QRIS - DENGAN FALLBACK GOMERCH
// ============================
const generateQRIS = async (amount, description = '') => {
    log(`Generate QRIS untuk Rp${amount} - ${description}`);
    
    if (MAINTENANCE_MODE) {
        return {
            success: false,
            error: 'MAINTENANCE',
            message: '⚠️ QRIS sedang dalam maintenance!'
        };
    }
    
    // 🔥 COBA AUTOGOPAY DULU
    try {
        const autogopay = require('./payment_autogopay.js');
        const result = await autogopay.generateQRIS(amount, description);
        
        if (result.success) {
            log(`✅ AutoGoPay berhasil: ${result.transaction_id}`);
            return result;
        }
        
        log(`⚠️ AutoGoPay gagal: ${result.error || 'unknown'}, mencoba GoMerch...`);
    } catch (err) {
        log(`⚠️ AutoGoPay error: ${err.message}, mencoba GoMerch...`);
    }
    
    // 🔥 FALLBACK KE GOMERCH
    try {
        const gomerch = require('./payment_gomerch.js');
        const result = await gomerch.generateQRIS(amount, description);
        
        if (result.success) {
            log(`✅ GoMerch berhasil: ${result.transaction_id}`);
            result.method = 'GOMERCH';
            return result;
        }
        
        log(`❌ GoMerch gagal: ${result.error}`);
        return {
            success: false,
            error: result.error || 'Gagal generate QRIS dari semua metode'
        };
    } catch (err) {
        error(`GoMerch error: ${err.message}`);
        return {
            success: false,
            error: err.message || 'Gagal generate QRIS'
        };
    }
};

// ============================
// 🔥 CEK STATUS - PRIORITASKAN METODE YANG DIGUNAKAN
// ============================
const cekStatusDual = async (transactionId, amount, method, startTime = null) => {
    log(`Cek status: ${transactionId} via ${method || 'AUTOGOPAY'}`);
    
    if (MAINTENANCE_MODE) {
        return {
            success: false,
            status: 'maintenance',
            method: 'none',
            source: 'maintenance',
            error: '⚠️ QRIS sedang dalam maintenance!'
        };
    }
    
    // 🔥 PRIORITAS: CEK DENGAN METODE YANG DIGUNAKAN
    const primaryMethod = method || 'AUTOGOPAY';
    const fallbackMethod = primaryMethod === 'GOMERCH' ? 'AUTOGOPAY' : 'GOMERCH';
    
    // 🔥 CEK DENGAN METODE UTAMA DULU
    try {
        let result;
        
        if (primaryMethod === 'GOMERCH') {
            const gomerch = require('./payment_gomerch.js');
            // 🔥 KIRIM AMOUNT DAN STARTTIME
            result = await gomerch.cekStatus(transactionId, amount, startTime);
        } else {
            const autogopay = require('./payment_autogopay.js');
            result = await autogopay.cekStatus(transactionId);
        }
        
        // 🔥 JIKA METODE UTAMA BERHASIL, LANGSUNG RETURN
        if (result && result.success && result.matched) {
            log(`✅ ${primaryMethod} menemukan pembayaran!`);
            return {
                ...result,
                method: primaryMethod,
                source: primaryMethod.toLowerCase()
            };
        }
        
        // 🔥 JIKA STATUS SETTLEMENT/SUCCESS/PAID
        if (result && (result.status === 'settlement' || result.status === 'success' || result.status === 'paid')) {
            log(`✅ ${primaryMethod} status: ${result.status}`);
            return {
                ...result,
                matched: true,
                method: primaryMethod,
                source: primaryMethod.toLowerCase()
            };
        }
        
        // 🔥 JIKA METODE UTAMA GAGAL DAN BUKAN GOMERCH, COBA FALLBACK
        if (primaryMethod !== 'GOMERCH') {
            log(`🔄 ${primaryMethod} belum ditemukan, mencoba ${fallbackMethod}...`);
            
            try {
                let fallbackResult;
                
                if (fallbackMethod === 'GOMERCH') {
                    const gomerch = require('./payment_gomerch.js');
                    fallbackResult = await gomerch.cekStatus(transactionId, amount, startTime);
                } else {
                    const autogopay = require('./payment_autogopay.js');
                    fallbackResult = await autogopay.cekStatus(transactionId);
                }
                
                if (fallbackResult && (fallbackResult.matched || fallbackResult.status === 'settlement' || fallbackResult.status === 'success' || fallbackResult.status === 'paid')) {
                    log(`✅ ${fallbackMethod} menemukan pembayaran!`);
                    return {
                        ...fallbackResult,
                        matched: true,
                        method: fallbackMethod,
                        source: fallbackMethod.toLowerCase()
                    };
                }
            } catch (fallbackErr) {
                log(`⚠️ ${fallbackMethod} error: ${fallbackErr.message}`);
            }
        }
        
        // 🔥 KALAU MASIH PENDING, RETURN PENDING
        if (result && result.status === 'pending') {
            return {
                success: true,
                status: 'pending',
                matched: false,
                method: primaryMethod,
                message: 'Pembayaran belum ditemukan'
            };
        }
        
        return result || {
            success: false,
            status: 'pending',
            matched: false,
            error: 'Pembayaran belum ditemukan'
        };
        
    } catch (err) {
        error(`Cek status error: ${err.message}`);
        return {
            success: false,
            status: 'error',
            matched: false,
            error: err.message
        };
    }
};

// ============================
// 🔥 CEK STATUS DUAL DENGAN RETRY
// ============================
const cekStatusDualWithRetry = async (transactionId, amount, method, startTime = null, maxRetry = 10) => {
    log(`Cek status with retry: ${transactionId}`);
    
    if (MAINTENANCE_MODE) {
        return {
            success: false,
            status: 'maintenance',
            method: 'none',
            source: 'maintenance',
            error: '⚠️ QRIS sedang dalam maintenance!',
            retryCount: 0
        };
    }
    
    let lastResult = null;
    const primaryMethod = method || 'AUTOGOPAY';
    const fallbackMethod = primaryMethod === 'GOMERCH' ? 'AUTOGOPAY' : 'GOMERCH';
    
    for (let i = 0; i < maxRetry; i++) {
        log(`🔄 Cek attempt ${i + 1}/${maxRetry} via ${primaryMethod}`);
        
        // 🔥 CEK DENGAN METODE UTAMA
        try {
            let result;
            
            if (primaryMethod === 'GOMERCH') {
                const gomerch = require('./payment_gomerch.js');
                // 🔥 KIRIM AMOUNT DAN STARTTIME
                result = await gomerch.cekStatus(transactionId, amount, startTime);
            } else {
                const autogopay = require('./payment_autogopay.js');
                result = await autogopay.cekStatus(transactionId);
            }
            
            lastResult = result;
            
            if (result && (result.matched || result.status === 'settlement' || result.status === 'success' || result.status === 'paid')) {
                log(`✅ ${primaryMethod} payment found!`);
                return {
                    ...result,
                    matched: true,
                    method: primaryMethod,
                    source: primaryMethod.toLowerCase()
                };
            }
            
            // 🔥 JIKA MASIH PENDING, TUNGGU
            if (result && result.status === 'pending') {
                log(`⏳ ${primaryMethod} masih pending, menunggu...`);
            }
            
        } catch (err) {
            log(`⚠️ ${primaryMethod} retry ${i+1} error: ${err.message}`);
        }
        
        // 🔥 JIKA SETENGAH JALAN (attempt 5) DAN MASIH PENDING, COBA FALLBACK
        if (i === 4 && primaryMethod !== 'GOMERCH') {
            log(`🔄 Mencoba fallback ke ${fallbackMethod}...`);
            try {
                let fallbackResult;
                
                if (fallbackMethod === 'GOMERCH') {
                    const gomerch = require('./payment_gomerch.js');
                    fallbackResult = await gomerch.cekStatus(transactionId, amount, startTime);
                } else {
                    const autogopay = require('./payment_autogopay.js');
                    fallbackResult = await autogopay.cekStatus(transactionId);
                }
                
                if (fallbackResult && (fallbackResult.matched || fallbackResult.status === 'settlement' || fallbackResult.status === 'success' || fallbackResult.status === 'paid')) {
                    log(`✅ ${fallbackMethod} payment found!`);
                    return {
                        ...fallbackResult,
                        matched: true,
                        method: fallbackMethod,
                        source: fallbackMethod.toLowerCase()
                    };
                }
            } catch (fallbackErr) {
                log(`⚠️ ${fallbackMethod} error: ${fallbackErr.message}`);
            }
        }
        
        if (i < maxRetry - 1) {
            await sleep(3000);
        }
    }
    
    return lastResult || {
        success: false,
        status: 'pending',
        matched: false,
        error: 'Waktu cek habis, silakan cek manual'
    };
};

// ============================
// 🔥 CEK STATUS AUTOGOPAY
// ============================
const cekStatusAutogopay = async (transactionId) => {
    try {
        const autogopay = require('./payment_autogopay.js');
        return await autogopay.cekStatus(transactionId);
    } catch (err) {
        return {
            success: false,
            status: 'error',
            error: err.message
        };
    }
};

// ============================
// 🔥 GENERATE QRIS AUTOGOPAY
// ============================
const generateQRISAutogopay = async (amount, description = '') => {
    try {
        const autogopay = require('./payment_autogopay.js');
        return await autogopay.generateQRIS(amount, description);
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
};

// ============================
// 🔥 GENERATE QRIS GOMERCH
// ============================
const generateQRISGomerch = async (amount, description = '') => {
    try {
        const gomerch = require('./payment_gomerch.js');
        return await gomerch.generateQRIS(amount, description);
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
};

// ============================
// 🔥 GET STATUS
// ============================
const getStatus = () => ({
    autogopay: {
        available: !MAINTENANCE_MODE,
        source: 'payment_autogopay'
    },
    gomerch: {
        available: !MAINTENANCE_MODE,
        source: 'payment_gomerch'
    },
    maintenance: MAINTENANCE_MODE,
    environment: process.env.NODE_ENV || 'development',
    message: MAINTENANCE_MODE ? '⚠️ QRIS sedang dalam maintenance!' : '✅ Sistem QRIS aktif'
});

// ============================
// 🔥 EXPORT
// ============================
module.exports = {
    generateQRIS,
    generateQRISAutogopay,
    generateQRISGomerch,
    cekStatusDual,
    cekStatusAutogopay,
    cekStatusDualWithRetry,
    getStatus,
};