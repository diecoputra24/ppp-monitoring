# Mikrotik PPP Monitoring System

Aplikasi monitoring berbasis web untuk memantau pengguna PPPoE Mikrotik, status koneksi, dan pemetaan jaringan (ODP/Kabel) secara real-time dan interaktif.

## 🚀 Fitur Utama

### 1. **Live PPP Monitoring**
*   **Real-time Status**: Pantau status Online/Offline user PPPoE secara langsung.
*   **Traffic Stats**: Lihat total upload/download per user.
*   **User Management**:
    *   **Isolir User**: Fitur satu klik untuk mengisolir user (memindahkan profile ke profil isolir).
    *   **Komentar**: Tambahkan catatan/komentar pada setiap user.
    *   **Kick User**: Putus koneksi user secara paksa dari dashboard.

### 2. **Interactive Network Map (Peta Jaringan)**
*   **Global Map View**: Lihat persebaran seluruh ODP, Kabel, dan User dari **semua router** dalam satu layar penuh.
*   **Router-Specific Map**: Fokus pada topologi jaringan per router.
*   **Manajemen ODP (Optical Distribution Point)**:
    *   Tambah/Hapus titik ODP di peta dengan koordinat GPS akurat.
    *   Beri nama dan label pada ODP.
*   **Manajemen Kabel (Cabling)**:
    *   **Tarik Kabel**: Hubungkan antar ODP atau ODP ke User dengan garis visual.
    *   **Waypoints (Belokan)**: Buat jalur kabel yang realistis mengikuti jalan dengan fitur *waypoints* (bisa dibelokkan).
    *   **Estimasi Jarak**: (Coming soon) Estimasi panjang kabel.
*   **User Location**:
    *   Tandai lokasi rumah pelanggan di peta.
    *   Status warna otomatis: **Hijau** (Online) / **Abu-abu** (Offline).

### 3. **Smart Integration**
*   **Multi-Router Support**: Kelola banyak Mikrotik sekaligus dalam satu dashboard.
*   **Telegram Notifications**:
    *   Bot otomatis mengirim notifikasi saat user Login/Logout.
    *   Laporan harian/berkala (configurable).
    *   Perintah bot untuk cek status via chat.
*   **Auto-Sync**: Sinkronisasi data otomatis dengan Mikrotik setiap beberapa detik.

### 4. **Modern UI/UX**
*   **Dark Mode / Light Mode**: Tampilan yang nyaman di mata.
*   **Responsive Design**: Akses monitoring dari HP, Tablet, atau Desktop dengan lancar.
*   **Interactive Dashboard**: Grafik dan ringkasan statistik yang mudah dibaca.

---

## 🛠️ Teknologi yang Digunakan

*   **Frontend**: React (Vite), TypeScript, Leaflet (Maps), Recharts, TailwindCSS/Custom CSS.
*   **Backend**: NestJS, Prisma ORM, SQLite/PostgreSQL.
*   **Integrasi**: Mikrotik API (routeros-client), Telegram Bot API.

## 📦 Cara Install (Local Development)

### Prasyarat
*   Node.js v18+
*   Mikrotik Router dengan API service aktif.

### 1. Clone Repository
```bash
git clone https://github.com/username/mikrotik-monitoring.git
cd mikrotik-monitoring
```

### 2. Setup Backend
```bash
cd be
npm install
cp .env.example .env
# Edit .env sesuaikan dengan konfigurasi database dan port
npx prisma generate
npx prisma db push
npm run dev
```

### 3. Setup Frontend
```bash
cd ../fe
npm install
npm run dev
```

Akses aplikasi di `http://localhost:5173`.

---

## 🚀 Deployment (VPS)

Lihat panduan lengkap deployment di file `DEPLOY_GUIDE.md` (jika tersedia) atau ikuti langkah singkat:

1.  Push kode ke GitHub.
2.  Pull di VPS.
3.  Di folder `be`:
    *   `npm install`
    *   `npx prisma generate` (Wajib! Generates Prisma Client)
    *   `npx prisma db push` (Sync database schema)
    *   `npm run build`
    *   Jalankan dengan PM2: `pm2 start dist/src/main.js --name "mikrotik-be"`
4.  Build Frontend (`npm run build` di folder `fe`) & serve folder `dist` menggunakan Nginx.

---

**Dikembangkan untuk memudahkan manajemen ISP/RT-RW Net.**
