# MikroTik Monitoring (Local Dev)

Panduan instalasi dan menjalankan aplikasi di laptop untuk development.
Tidak perlu PM2 atau Nginx. Cukup Node.js.

---

## 📋 Persiapan (Prerequisites)

Pastikan sudah terinstall:
-   **Node.js** (Download di https://nodejs.org/)
-   **Git**

---

## 🚀 1. Setup Backend

Buka terminal baru (Terminal A), lalu jalankan:

```bash
cd be
npm install

# Copy file env jika belum ada
cp .env.example .env

# Generate BETTER_AUTH_SECRET (Wajib)
# Jalankan command ini di terminal untuk mendapatkan random string:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output string tersebut dan masukkan ke dalam file .env pada variabel BETTER_AUTH_SECRET=...

# Setup Database
npx prisma db push

# Jalankan Backend
npm run dev
```

*Backend akan berjalan di port `3008`.*

---

## 🌐 2. Setup Frontend

Buka terminal **baru** lainnya (Terminal B), jangan matikan terminal backend.

```bash
cd fe
npm install

# Jalankan Frontend
npm run dev
```

*Frontend akan berjalan di port `8081`.*

---

## ✅ Cara Pakai

1.  Pastikan kedua terminal (Backend & Frontend) tetap berjalan.
2.  Buka browser dan akses: **http://localhost:8081**
3.  Login dan gunakan aplikasi.

Jika ingin mematikan aplikasi, cukup tekan `Ctrl + C` di masing-masing terminal.
