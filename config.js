// ==========================================
// 🔥 CONFIG.JS - FULL CONFIGURATION
// ==========================================

module.exports = {
  // ============================
  // 🤖 BOT CONFIG
  // ============================
  BOT: {
    TOKEN: process.env.BOT_TOKEN || "8859610854:AAGwMdEfjG7v6YM1UgCEmd6Hp5BWXbPCwRc",
    OWNER_ID: Number(process.env.OWNER_ID || "8677011932")
  },

  // ============================
  // 💰 HARGA & BIAYA
  // ============================
  PRICES: {
    // Harga cek NIK ke No HP
    NIK_TO_HP: 5000,
    
    // Topup
    TOPUP_MIN: 10000,       
    TOPUP_MAX: 1000000,
    
    // Harga default (fallback)
    DEFAULT: 5000
  },

  // ============================
  // 🔥 PAYMENT AUTOGOPAY
  // ============================
  AUTOGOPAY: {
    ENABLED: true,
    API_URL: "https://v1-gateway.autogopay.site",
    API_KEY: "agp_84944d4c7b14cf80eb23a154fa9e6c200b0297068ee9478abd1d8a3d9a5a82f0",
    TIMEOUT: 30000,
  },

  // ============================
  // 💳 PAYMENT GOMERCH (BARU - UPDATE)
  // ============================
  GOMERCH: {
    ENABLED: true,
    BASE_URL: "https://qris.adijayavpnpedia.cloud",
    MERCHANT_ID: "G603433097",
    ACCESS_TOKEN: "eyJhbGciOiJkaXIiLCJjdHkiOiJKV1QiLCJlbmMiOiJBMTI4R0NNIiwidHlwIjoiSldUIiwiemlwIjoiREVGIn0..MLNmDx2tXB-4iFSd.7fI9KjhUpiksGZej0Sh5E992kogSmcDUhtm9riCDupNc1unSjeCNJN22WEvYRB79H6HTLV_Av-li16jWE0s1pbWBtb14D5O77fz8eCb85ZzS0N6T2xJL7prxc4cJqSz8gaSk_RDw8DKahUUdqlW3nNbF4G9zSjMTNpZ1XdjAf6Lz2o5w124DDoptdgl-M3wXe6Var2mYkBem_JQACofSIKl6unj1oVl8OSvroaWGPbnRET8ZQPWk2JawNoXLlZpYjtqYDF-kvtpHl7TUkxpNRq5kmypywB1ljbBCvYxktXjFdo6bPC0ogasXIRBUceJ92WTMIaneCHbBM_n3zupH6D994cbAeiSBHIV9KE1Yga-4Ye8iceZAwVVJOfIH4mhJtvv44fsr5RwMxVEgSI8Ca_iAiTiTC3NjZ11JjGP1Xle3Wu1sJLgR5YC8S6GiINu_HPmShqdKUAEtezxauCAhfVGojUG_gu9l1P2PWRKl47EZxffU75_-aUbK1S7VkVgofsNGHnduuvoNvWFDBmchg-EOq_6EbH3fVv6A5XFT418wZyFt9_1aNRGAeoI2SX6TD-zVBcfHWi3Hjeq3TeCV_w5pBkzVe2ZHi9-Ui1WqeyG2M4V7S0eVxAVn4nd47xncOo0nwTbfzIMj_wQ4cVfYHvhGGpHumiFabdMNeeg02KYchsbcUvaQSCw1f9Hj6qjQ-W7_05z52hUwGR58Um3vsdL4Rd1bRFlvsN0_z8U7CsCIKEvoLW-G0TA71wvUD1IYh2XfI6HzgkS3CJBKloiha5Q2_xjxENG1Nb3OvF1DCyF1SjtIShC0qh9HBlWQ_j4c_FHbc5WhYXEE5C1aI4O0sDayWtE1WVC1Y37rZSapPR7e2agGzd6B4GOidayW_KGq7-g4JqC4yTNRsJUbxj3VSTG1vzoRQXgy_IqlNLYQfkLrIY_hq0ED51ydTOQneknVxVb0j3nu56kndaRWaHGy_Jps6kZmtv5v-puLZuaKP_ZvJGPbUP4rbb8tnI7dKtu59hpHRH1_-j6EjCxPcTbv4J383rtbzJeudZs0zCcx1oH9bM65OLc-rGGDceZhWZkXezgvrLQaPPTNHJQM1L12mEnZzgnAa81kDG8rneCrmO86Z8jANPupXKrGNDNZ7OZEgAHYYSBVgt2fbNeooZiZX4-YJEItgCFArkWfhba7N06THNKfE9aWhGLID9-119sdkdV9RqlSkeubl6ZQuMvWtYtaWRs7BKSJCWhIC9CLZDJ2Q-lU7lUQxkZ2HgbItHz0a6zU252qmTu2sWgjNotGrg8fyCZmUSpr6v_XdiNra_0nWBDkiDRduAFAjJx2mfO-Tq4VMyH-PWz6XFNHu8JOdVtguzuGeojio7oA5j6NRcwZ0JEBghVn2ldat2qJDNso5ofnLbCpfMuNRRlwTdBipePU0d0sat-7nceUBu4cIlbra72_cUgcZxxpGAFo-hWe0TFsknujROG_hg3Lg5CXcwLeFLbxiTt5wz2KDQvgChfRP3mFwCNp7L7gnNryADOWb28R0hWAKqllkNsil_pgXW6lL1SiumJzRsRscQ5MnYCr39r5K2CCNf-JQA_bKUPKxV4pIN5J3yyTf1Wsh3XTayi4JqDH7-CtLFik3H_38F9YoGrNjugqYl3NnaIwvdzzaAo6W1IxnCDu8q44nSaIIo6d6KaGJ47Crl5wIrJGY9uWieqvcQTSn29DEY_4FsutppzMj2cgSJQLpFDK6uq5DRqQ8yYGAB3iyzJaZ_fC_Rz5ZbSNJ54ggn0Fws52b38sM0fS-n4f3h7P26Ot9gW9v0d2syBbx9aIJ7Du8GwdokRct4tthhAKDqJKSIfXafm0hMKAgcPxeYMN4Q136FIFIt6IcdNXA5tYT9etbGcUHKd8t9H55S-10dbUk4WJPD723HlS8WbXwzJOaO_k_dqPYEpYb9i__LMsjObxmfQyk99HrP44GEt2D4EQJK4wVtebCo1nzhhOFY5z_jnyHj8WvIX9hkVrSNEstyRlZx1QKGGaTlUAe2DBnju6HEp_8OACHOUzoKiXQGShVQFtXBmd2lWYAEWLBM9HePqqt3ZEf2bJpk4sBgZH6wJnMQPf0m6BGMLNQIToVmobTAMEX55nawRjzVrgKPvD91dSsFlIW1ttzx-qRUs-lgZYAWLwCxbh7S5qm0xPCTxJAvhKOhJyUTg.QlsgoC181J0M_Q3M8v-pow",
    REFRESH_TOKEN: "eyJhbGciOiJkaXIiLCJjdHkiOiJKV1QiLCJlbmMiOiJBMTI4R0NNIiwidHlwIjoiSldUIiwiemlwIjoiREVGIn0..xhxjpNI3xDLvvUhc.tY0epFq80dGUvk8Cq4XnwO45BPSn4jnz41W9ktsYwDWtkZ3sCJ770tUlfKGt51ASgsQhxjWmPWDVWTGbOavlJlfy-29odtN6OoipY-p8WOJAHGXOPSUlgQb3L0bmKGwJJsuQA4DTJ4Gi_dq4SJ1MYLkt8kicMSniqaKTN--s0XQOMvrtN4vGoBCo4gh2jY0G6LUa7UADGRui05F3pQVzDxtCfFdTaUTz6IFRpcktdGWxF2V8QXWIRd5z3gXc_ncNI5cP-BdpvuUUHVDn_D4LYafJnUp8TXtYwZi9qmrXVHP3vx4taJsRfacS2Cl84nZ1CZaTrPUdBeWMgzhhzSeDYLeTq6tHT3MUErIZLU0NGhlxq74xd_vyjh-Nz1r7a1yrkjLE7JETF4JkbIg3o6dLb0N127n0IBg5FEnIHGcjxlpLHvvqcOajxxCa5o4ZSYgRO2ZxJegfCWNeK1zxu0BcA1t1q3XDEhK2YXPXzRVAQXUaqVGNvOSA0ot7ISvt9JWvxGerOyB2TFIbVjDdk6VmRIK9HMnuimROxweJs1CMZwumaW2d2uDkIA5FEnR9mMgN90u3Ektw91hK41HiyBuE7Rooc1NJ6rk6Q-SuiBO4bJxX6ejs.4ILwMMB9MQXdC6Bl2Hfgpg",
    STATIC_QR: "00020101021126610014COM.GO-JEK.WWW01189360091436034330970210G6034330970303UMI51440014ID.CO.QRIS.WWW0215ID10265854747720303UMI5204581253033605802ID5925ABAH KONOHA STORE, Makana6006SERANG61054218262070703A0163043E58",
    TIMEOUT: 30000,
    POLL_INTERVAL: 1500,
    MAX_CHECKS: 60,
    INTELLIGENT_CACHING: true,
    IP_RATE_LIMITING: true,
    AUTO_FALLBACK: true,
  },

  // ============================
  // 🔥🔥🔥 NOTIFIKASI KE BOT LAIN (CHANNEL/GROUP)
  // ============================
  NOTIFICATION: {
    ENABLED: true,                  
    BOT_TOKEN: "8772406435:AAFJOIuscwIF5BKQZOzaAlPe-9NoEkGokec", 
    CHAT_ID: "8714776841",        
    SEND_TO_OWNER: true                  
  }
};