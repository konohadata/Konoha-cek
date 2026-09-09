// ============================
// SALDO.JS - MANAJEMEN SALDO USER
// ============================

const fs = require('fs');
const path = require('path');

const SALDO_FILE = "./saldo.json";

// Load saldo
const loadSaldo = () => {
    try {
        if (!fs.existsSync(SALDO_FILE)) {
            fs.writeFileSync(SALDO_FILE, "{}");
            return {};
        }
        const raw = fs.readFileSync(SALDO_FILE, "utf8").trim();
        if (!raw || raw === "") {
            fs.writeFileSync(SALDO_FILE, "{}");
            return {};
        }
        return JSON.parse(raw);
    } catch (err) {
        console.log(`❌ SALDO ERROR:`, err.message);
        fs.writeFileSync(SALDO_FILE, "{}");
        return {};
    }
};

// Save saldo
const saveSaldo = (data) => {
    try {
        fs.writeFileSync(SALDO_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
        console.log(`❌ SAVE SALDO ERROR:`, err.message);
    }
};

// Get saldo user
const getSaldo = (userId) => {
    const data = loadSaldo();
    return data[String(userId)] || 0;
};

// Kurangi saldo
const kurangiSaldo = (userId, amount) => {
    const data = loadSaldo();
    const key = String(userId);
    const current = data[key] || 0;
    
    if (current < amount) {
        return false;
    }
    
    data[key] = current - amount;
    saveSaldo(data);
    return true;
};

// Tambah saldo
const tambahSaldo = (userId, amount) => {
    const data = loadSaldo();
    const key = String(userId);
    data[key] = (data[key] || 0) + amount;
    saveSaldo(data);
    return true;
};

// Format Rupiah
const formatRupiah = (val) => {
    if (!val) return '0';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

module.exports = {
    loadSaldo,
    saveSaldo,
    getSaldo,
    kurangiSaldo,
    tambahSaldo,
    formatRupiah
};