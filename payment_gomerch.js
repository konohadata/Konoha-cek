// payment_gomerch.js - INTEGRASI GOMERCH API (TANPA UNIQUE AMOUNT)

const axios = require('axios');
const config = require('./config');
const qr = require('qrcode');

const GOMERCH_CONFIG = config.GOMERCH || {};

let state = {
    accessToken: GOMERCH_CONFIG.ACCESS_TOKEN,
    refreshToken: GOMERCH_CONFIG.REFRESH_TOKEN,
    merchantId: GOMERCH_CONFIG.MERCHANT_ID,
};

let isRefreshing = false;
let refreshPromise = null;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getTodayRange() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
}

async function apiPost(path, body = {}, retryCount = 0) {
    try {
        console.log(`📤 [GOMERCH] API Request: ${path}`);
        console.log(`📤 [GOMERCH] Body:`, JSON.stringify(body).substring(0, 200));
        
        const response = await axios.post(GOMERCH_CONFIG.BASE_URL + path, body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: GOMERCH_CONFIG.TIMEOUT || 30000,
        });
        
        console.log(`📊 [GOMERCH] Response status: ${response.status}`);
        return response.data;
        
    } catch (error) {
        console.log(`❌ [GOMERCH] API Error:`, error.message);
        
        if (error.response) {
            console.log(`📊 [GOMERCH] Status: ${error.response.status}`);
            console.log(`📊 [GOMERCH] Data:`, JSON.stringify(error.response.data, null, 2));
            
            if (error.response.status === 401 && retryCount < 2) {
                console.log(`🔄 [GOMERCH] Token expired, mencoba refresh...`);
                const refreshed = await refreshToken();
                if (refreshed) {
                    console.log(`✅ [GOMERCH] Token berhasil di-refresh, retry...`);
                    if (body.access_token) {
                        body.access_token = state.accessToken;
                    }
                    return await apiPost(path, body, retryCount + 1);
                }
            }
            
            throw new Error(`API Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        }
        
        throw new Error(`Network Error: ${error.message}`);
    }
}

async function refreshToken() {
    if (isRefreshing) {
        console.log(`⏳ [GOMERCH] Menunggu refresh token selesai...`);
        return refreshPromise;
    }
    
    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            console.log(`🔄 [GOMERCH] Merefresh token...`);
            
            if (!state.refreshToken) {
                throw new Error('Refresh token tidak tersedia');
            }

            const response = await axios.post(GOMERCH_CONFIG.BASE_URL + '/gomerch/api/auth/refresh', {
                refresh_token: state.refreshToken
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000,
            });

            console.log(`📊 [GOMERCH] Refresh response:`, JSON.stringify(response.data, null, 2));

            if (response.data.success && response.data.data?.access_token) {
                state.accessToken = response.data.data.access_token;
                if (response.data.data.refresh_token) {
                    state.refreshToken = response.data.data.refresh_token;
                }
                console.log(`✅ [GOMERCH] Token berhasil di-refresh!`);
                
                if (config.GOMERCH) {
                    config.GOMERCH.ACCESS_TOKEN = state.accessToken;
                    config.GOMERCH.REFRESH_TOKEN = state.refreshToken;
                }
                
                return true;
            }
            
            console.log(`❌ [GOMERCH] Refresh gagal:`, response.data);
            return false;
            
        } catch (error) {
            console.error(`❌ [GOMERCH] Refresh error:`, error.message);
            return false;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();
    
    return refreshPromise;
}

// ============================
// GENERATE QRIS - TANPA UNIQUE AMOUNT
// ============================
const generateQRIS = async (amount, description = '') => {
    try {
        let cleanAmount = 0;
        if (typeof amount === 'number') {
            cleanAmount = amount;
        } else if (typeof amount === 'string') {
            const cleaned = amount.replace(/[^0-9]/g, '');
            cleanAmount = parseInt(cleaned) || 0;
        } else {
            cleanAmount = parseInt(amount) || 0;
        }

        if (cleanAmount <= 0) {
            return {
                success: false,
                method: 'GOMERCH',
                error: `Invalid amount: ${amount}`
            };
        }

        if (!GOMERCH_CONFIG.ENABLED) {
            throw new Error("GoMerch dinonaktifkan di config");
        }

        if (!state.accessToken || !state.merchantId) {
            throw new Error("Access token atau merchant ID kosong");
        }

        if (!GOMERCH_CONFIG.STATIC_QR || GOMERCH_CONFIG.STATIC_QR === 'YOUR_STATIC_QR_STRING_HERE') {
            throw new Error("Static QR belum diisi di config.js");
        }

        console.log(`💰 [GOMERCH] Generating QRIS for Rp${cleanAmount}`);

        // 🔥 PAKAI HARGA ASLI, TANPA UNIQUE AMOUNT
        const finalAmount = cleanAmount;
        console.log(`🔄 [GOMERCH] Amount: ${finalAmount} (tanpa unique)`);

        const payload = {
            amount: finalAmount,
            static_qr: GOMERCH_CONFIG.STATIC_QR
        };

        const response = await apiPost('/gomerch/api/qris/generate', payload);

        if (response.success) {
            const data = response.data || response;
            const createdTime = Date.now();
            const expiryTime = createdTime + (15 * 60 * 1000);

            let imageData = null;
            let qrString = '';

            if (data.qris_string) {
                qrString = data.qris_string;
            } else if (data.qr_string) {
                qrString = data.qr_string;
            }

            if (qrString) {
                try {
                    const qrBuffer = await qr.toBuffer(qrString, {
                        type: 'png',
                        width: 400,
                        margin: 2,
                        errorCorrectionLevel: 'H'
                    });
                    imageData = `data:image/png;base64,${qrBuffer.toString('base64')}`;
                } catch (qrError) {
                    console.log(`❌ [GOMERCH] QR generation failed:`, qrError.message);
                }
            }

            if (!imageData && data.qr_url) {
                try {
                    const imgResponse = await axios.get(data.qr_url, {
                        responseType: 'arraybuffer',
                        timeout: 15000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    const base64Data = Buffer.from(imgResponse.data, 'binary').toString('base64');
                    imageData = `data:image/png;base64,${base64Data}`;
                } catch (fetchError) {
                    console.log(`❌ [GOMERCH] Failed to fetch from qr_url:`, fetchError.message);
                }
            }

            if (!imageData && GOMERCH_CONFIG.STATIC_QR) {
                try {
                    const qrBuffer = await qr.toBuffer(GOMERCH_CONFIG.STATIC_QR, {
                        type: 'png',
                        width: 400,
                        margin: 2,
                        errorCorrectionLevel: 'H'
                    });
                    imageData = `data:image/png;base64,${qrBuffer.toString('base64')}`;
                } catch (qrError) {
                    console.log(`❌ [GOMERCH] Fallback QR generation failed:`, qrError.message);
                }
            }

            if (!imageData) {
                return {
                    success: false,
                    method: 'GOMERCH',
                    error: 'Tidak ada data QRIS dari GoMerch.'
                };
            }

            return {
                success: true,
                method: 'GOMERCH',
                transaction_id: data.transaction_id || data.order_id || `GOM-${Date.now()}`,
                order_id: data.order_id || `GOM-${Date.now()}`,
                amount: finalAmount,
                amount_original: cleanAmount,
                random_add: 0,
                expiry_time: expiryTime,
                image_data: imageData,
                qr_url: data.qr_url,
                qr_string: qrString,
                merchant: 'GoMerch',
                created_at: createdTime,
                display: {
                    harga: finalAmount,
                    kode_unik: 0,
                    total: finalAmount,
                }
            };
        }

        throw new Error(response.message || 'Gagal generate QRIS GoMerch');

    } catch (error) {
        console.error('❌ [GOMERCH] Error:', error.message);
        return { 
            success: false, 
            method: 'GOMERCH', 
            error: error.message 
        };
    }
};

// ============================
// CEK STATUS GOMERCH - DENGAN FILTER WAKTU
// ============================
// ============================
// CEK STATUS GOMERCH - AMOUNT HARUS EXACT MATCH
// ============================
const cekStatus = async (transactionId, expectedAmount = null, startTime = null) => {
    try {
        if (!GOMERCH_CONFIG.ENABLED) {
            throw new Error("GoMerch dinonaktifkan di config");
        }

        if (!state.accessToken || !state.merchantId) {
            throw new Error("Access token atau merchant ID kosong");
        }

        console.log(`🔍 [GOMERCH] Checking status for ${transactionId}...`);

        // 🔥 AMBIL MUTASI DARI 5 MENIT TERAKHIR (lebih pendek)
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        
        const body = {
            access_token: state.accessToken,
            merchant_id: state.merchantId,
            start_time: fiveMinutesAgo.toISOString(),
            end_time: now.toISOString()
        };

        const response = await apiPost('/gomerch/api/mutasi', body);

        if (response.success) {
            const transactions = response.data?.transactions || [];
            
            console.log(`📊 [GOMERCH] Total transaksi: ${transactions.length} (5 menit terakhir)`);

            // 🔥 TAMPILKAN SEMUA TRANSAKSI
            for (const t of transactions) {
                console.log(`📊 [GOMERCH] order_id=${t.order_id}, status=${t.transaction_status}, amount=${Math.floor(t.gross_amount || 0)}, time=${t.transaction_time}`);
            }

            let match = null;

            // 🔥🔥🔥 PRIORITAS: Cari berdasarkan order_id (PALING AKURAT)
            console.log(`🔄 [GOMERCH] Mencari berdasarkan order_id: ${transactionId}`);
            
            match = transactions.find(t => {
                const orderId = t.order_id || '';
                return orderId.includes(transactionId) || 
                       transactionId.includes(orderId) ||
                       orderId === transactionId;
            });

            if (match) {
                const isSettled = match.transaction_status === 'SETTLEMENT' ||
                                 match.transaction_status === 'success' ||
                                 match.transaction_status === 'paid' ||
                                 match.transaction_status === 'SUCCESS';

                console.log(`📊 [GOMERCH] ✅ Match by ID! Status: ${match.transaction_status}`);

                return {
                    success: true,
                    status: match.transaction_status || 'pending',
                    method: 'GOMERCH',
                    transaction: match,
                    matched: isSettled,
                    order_id: match.order_id,
                    amount: match.gross_amount || 0,
                    transaction_time: match.transaction_time
                };
            }

            // 🔥🔥🔥 METODE 2: Cari berdasarkan Amount + Waktu (EXACT MATCH, TANPA TOLERANSI)
            if (!match && expectedAmount && startTime) {
                const checkStart = new Date(startTime);
                // Toleransi waktu 5 menit
                const toleranceStart = new Date(checkStart.getTime() - 5 * 60 * 1000);
                
                console.log(`🔄 [GOMERCH] Mencari amount EXACT: ${expectedAmount}, setelah: ${toleranceStart.toISOString()}`);
                
                // 🔥 AMOUNT HARUS EXACT MATCH (TOLERANSI 0)
                const candidates = transactions.filter(t => {
                    const amount = Math.floor(t.gross_amount || 0);
                    const isMatch = amount === expectedAmount; // 🔥 HARUS EXACT!
                    const isSettled = t.transaction_status === 'SETTLEMENT' ||
                                     t.transaction_status === 'success' ||
                                     t.transaction_status === 'paid' ||
                                     t.transaction_status === 'SUCCESS';
                    
                    let isAfterStart = false;
                    if (t.transaction_time) {
                        const trxTime = new Date(t.transaction_time);
                        isAfterStart = trxTime >= toleranceStart;
                    }
                    
                    console.log(`📊 [GOMERCH] Cek: amount=${amount}, expected=${expectedAmount}, match=${isMatch}, settled=${isSettled}, after=${isAfterStart}`);
                    
                    return isMatch && isSettled && isAfterStart;
                });

                console.log(`📊 [GOMERCH] Candidate matches: ${candidates.length}`);

                // Ambil yang paling baru
                if (candidates.length > 0) {
                    match = candidates.sort((a, b) => {
                        return new Date(b.transaction_time) - new Date(a.transaction_time);
                    })[0];
                    
                    console.log(`📊 [GOMERCH] ✅ Match by Exact Amount! ${match.order_id}`);
                    return {
                        success: true,
                        status: 'settlement',
                        method: 'GOMERCH',
                        transaction: match,
                        matched: true,
                        order_id: match.order_id,
                        amount: match.gross_amount || 0,
                        transaction_time: match.transaction_time
                    };
                }

                console.log(`📊 [GOMERCH] ❌ No settlement with amount ${expectedAmount} after ${toleranceStart.toISOString()}`);
            }

            console.log(`📊 [GOMERCH] ❌ No matching transaction found`);
            return {
                success: true,
                status: 'pending',
                method: 'GOMERCH',
                matched: false,
                message: 'Transaksi belum ditemukan'
            };
        }

        return {
            success: false,
            status: 'pending',
            method: 'GOMERCH',
            matched: false,
            error: response.message || 'Unknown error'
        };

    } catch (error) {
        console.error('❌ [GOMERCH] Error:', error.message);
        return {
            success: false,
            status: 'pending',
            method: 'GOMERCH',
            matched: false,
            error: error.message
        };
    }
};

const cekStatusWithRetry = async (transactionId, maxRetry = 10, expectedAmount = null, startTime = null) => {
    let lastResult = null;

    for (let i = 0; i < maxRetry; i++) {
        console.log(`🔄 [GOMERCH] Cek status attempt ${i + 1}/${maxRetry}`);
        const result = await cekStatus(transactionId, expectedAmount, startTime);

        if (result.success && result.matched) {
            return result;
        }

        if (result.status === 'settlement' || result.status === 'success' || result.status === 'paid') {
            result.matched = true;
            return result;
        }

        if (i < maxRetry - 1) {
            await delay(3000);
        }
        lastResult = result;
    }

    return lastResult || {
        success: false,
        status: 'error',
        error: 'Max retry exceeded',
        method: 'GOMERCH'
    };
};

const getMutasi = async (startTime = null, endTime = null) => {
    try {
        if (!GOMERCH_CONFIG.ENABLED) {
            throw new Error("GoMerch dinonaktifkan di config");
        }

        if (!state.accessToken || !state.merchantId) {
            throw new Error("Access token atau merchant ID kosong");
        }

        const { start, end } = getTodayRange();
        const body = {
            access_token: state.accessToken,
            merchant_id: state.merchantId,
            start_time: startTime || start,
            end_time: endTime || end,
        };

        const response = await apiPost('/gomerch/api/mutasi', body);
        return response;

    } catch (error) {
        console.error('❌ [GOMERCH] Get mutasi error:', error.message);
        return { success: false, error: error.message };
    }
};

const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return '0';
    return new Intl.NumberFormat('id-ID').format(angka);
};

module.exports = {
    generateQRIS,
    cekStatus,
    cekStatusWithRetry,
    getMutasi,
    refreshToken,
    formatRupiah,
    state
};