# MikroTik PPP Monitoring

## Tech Stack

### Backend
*   **Framework**: NestJS (Node.js)
*   **Database**: SQLite + Prisma ORM
*   **API**: REST, MikroTik RouterOS Client

### Frontend
*   **Framework**: React + Vite
*   **State Management**: Zustand
*   **UI**: Vanilla CSS + Glassmorphism

## Features

*   **Multi-Router Management**: Tambahkan banyak router MikroTik.
*   **Real-time PPP Monitoring**: Status Online/Offline, IP Address, Uptime.
*   **Bandwidth Usage**: Tracking upload/download per sesi & akumulasi total history.
*   **User Isolation (Isolir)**:
    *   One-Click Isolate (Gembok).
    *   Auto-Disconnect user saat diisolir.
    *   Smart Restore ke profile asli.
*   **Notifikasi Telegram**:
    *   Laporan Login/Logout.
    *   Status harian/berkala.
    *   Indikator user isolir (🔒).
*   **Self-Healing**: Auto-recover jika koneksi ke router timeout.
*   **Search & Filter**: Pencarian cepat tanpa reload.

## Cara Install

### 1. Clone Repository
```bash
git clone https://github.com/diecoputra24/ppp-monitoring.git
cd mikrotik-monitoring
```

### 2. Setup Backend
```bash
cd be
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```
_(Port: 3008)_

### 3. Setup Frontend
Buka terminal baru:
```bash
cd fe
npm install
npm run dev
```
_(Port: 5173)_

## Konfigurasi

1.  Buka `http://localhost:5173`.
2.  Add Router -> Masukkan IP, User, Pass MikroTik.
3.  Pastikan API service di MikroTik aktif (`/ip service enable api`).
4.  (Opsional) Isi Profile Isolir & Telegram Token di menu edit router.

## License
MIT
