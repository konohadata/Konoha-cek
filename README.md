# 🍃 Konoha Cek

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Telegram-Bot-blue?style=for-the-badge&logo=telegram" alt="Telegram Bot">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/PM2-Managed-orange?style=for-the-badge&logo=pm2" alt="PM2">
</div>

<p align="center">
  <b>Simple Telegram Bot for NIK to Phone Number Check with Saldo System & QRIS Topup</b>
</p>

---

## 📌 Fitur

- ✅ **Cek NIK ke No HP** - Cari nomor HP berdasarkan NIK 16 digit
- ✅ **Multi API** - Mencoba beberapa API untuk hasil maksimal
- ✅ **Sistem Saldo** - Setiap user memiliki saldo sendiri
- ✅ **Topup Saldo** - Topup via QRIS (AutoGoPay + GoMerch fallback)
- ✅ **Admin Panel** - Manajemen user & saldo untuk Owner
- ✅ **Profil User** - Lihat informasi akun dan riwayat
- ✅ **Broadcast** - Kirim pesan ke semua user (Owner only)
- ✅ **PM2 Support** - Auto restart dan monitoring

---

## 📋 Struktur File



---

## 🚀 Instalasi

### Prasyarat

- **Node.js** v18 atau lebih tinggi
- **NPM** (terinstall bersama Node.js)
- **PM2** (akan diinstall otomatis)
- **Telegram Bot Token** dari [@BotFather](https://t.me/BotFather)

---

### Cara Instalasi

#### 1. Upload File ke Server

Upload file `Bot-cek.zip` ke server VPS Anda.

#### 2. Jalankan Perintah Instalasi

```bash
cd ~
unzip Bot-cek.zip
cd ~/Bot-cek
npm install node-telegram-bot-api qrcode --save
pm2 start bot.js --name "konoha-cek"
pm2 save
pm2 logs konoha-cek --lines 20

