# MikroTik Monitor & Billing System

Aplikasi monitoring dan billing sederhana untuk MikroTik PPP, dibuat dengan NestJS (Backend) dan React Vite (Frontend).

## 📂 Struktur Project

Repo ini menggunakan konsep **monorepo simple** dengan dua folder utama:
- `be/` - Backend (NestJS + Prisma + SQLite3)
- `fe/` - Frontend (React + Vite + Tailwind/CSS)

## 🚀 Panduan Instalasi & Menjalankan (Deployment)

Ikuti langkah-langkah ini untuk menjalankan aplikasi di server atau komputer lokal.

### 1. Persiapan (Prerequisites)
Pastikan di komputer/server sudah terinstall:
- **Node.js** (Versi 18 atau 20 recommended)
- **Git**

### 2. Setup Backend (`be`)
Backend bertugas konek ke MikroTik dan menyimpan data ke database SQLite lokal (`monitoring.db`).

```bash
# Masuk ke folder backend
cd be

# 1. Install Library
npm install

# 2. Setup Database (Generate Prisma Client & Push DB)
npx prisma generate
npx prisma db push

# 3. Jalankan Backend (Mode Produksi)
npm run build
npm run start:prod
```
> Backend akan berjalan di port **3008** (http://localhost:3008)

### 2.1 Setup Auto-Start (Rekomendasi Produksi)
Agar aplikasi **otomatis menyala** saat server restart/mati lampu, gunakan **PM2**.

1. **Install PM2 di server:**
   ```bash
   npm install -g pm2
   ```

2. **Jalankan Backend dengan PM2:**
   ```bash
   cd be
   pm2 start dist/main.js --name "mikrotik-be"
   ```

3. **Jalankan Frontend dengan PM2 (serve):**
   ```bash
   # Kita perlu serve build statis frontend
   cd ../fe
   npm run build
   npx pm2 serve dist 8081 --spa --name "mikrotik-fe"
   ```

4. **Simpan agar jalan saat Booting:**
   ```bash
   pm2 save
   pm2 startup
   # Copy paste command yang muncul di layar terminal setelah 'pm2 startup'
   ```

---

### 3. Setup Frontend (Mode Dev / Manual)
Jika tidak menggunakan PM2, gunakan cara ini untuk menjalankan Frontend.

```bash
# Buka terminal BARU (jangan matikan terminal backend)
# Masuk ke folder frontend
cd fe

# 1. Install Library
npm install

# 2. Jalankan Frontend (Mode Preview/Host)
npm run dev -- --host
```
> Frontend akan berjalan di port **8081** (http://localhost:8081)

---

### 4. Cara Menggunakan
1. Buka browser dan akses `http://localhost:8081` (atau IP server port 8081).
2. Di menu sidebar, klik **Add Router**.
3. Masukkan detail MikroTik Anda:
   - **Host:** IP Router (misal: 192.168.88.1)
   - **Port:** Port API (Default: 8728)
   - **Username:** User admin mikrotik
   - **Password:** Password admin
4. Klik **Save**.
5. Klik nama router di sidebar untuk melihat status PPP user real-time.

---

### 🛠️ Troubleshooting (Masalah Umum)

**Q: Backend error `Address already in use`**
A: Ada proses lain yang memakai port 3008. Matikan dulu proses node sebelumnya (task manager) atau restart server.

**Q: Frontend tidak bisa konek ke Backend (`Network Error`)**
A: Pastikan file `fe/src/api/index.ts` mengarah ke URL backend yang benar. Jika di server, pastikan port 3008 dibuka di firewall.

**Q: Telegram Sync Timeout / Error**
A: Koneksi internet server ke `api.telegram.org` mungkin sedang gangguan. Bot akan otomatis normal kembali saat koneksi stabil.

**Q: Database hilang saat restart?**
A: Karena pakai SQLite, pastikan file `be/prisma/monitoring.db` tidak terhapus. File ini menyimpan semua data router & setting.

---

### 📜 Tech Stack
- **Backend:** NestJS, Prisma ORM, SQLite, RxJS, Axios
- **Frontend:** React, Vite, Zustand (State Management), Lucide Icons
- **Integration:** MikroTik RouterOS API, Telegram Bot API
