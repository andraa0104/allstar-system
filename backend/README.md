# AllStar System Backend

Backend REST API berbasis Next.js Route Handlers. Frontend tetap terpisah dan
bisa dideploy ke Cloudflare Pages, sedangkan backend ini dijalankan di VPS agar
bisa connect langsung ke MySQL/MariaDB.

## Local Setup

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Backend ini tidak menjalankan migration dan tidak membuat tabel. Semua query
harus mengikuti struktur database permanen yang sudah ada di VPS.

## Environment

```env
PORT=8000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=allstar_user
DB_PASSWORD=change_this_password
DB_NAME=allstar_system
FRONTEND_ORIGIN=http://localhost:3000,https://your-cloudflare-project.pages.dev
```

## Frontend Connection

Di frontend, buat `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Untuk production Cloudflare Pages:

```env
NEXT_PUBLIC_API_BASE_URL=https://api-domain-vps-kamu.com
```

## VPS Deployment Outline

1. Install Node.js 20+ dan MySQL/MariaDB.
2. Pastikan database permanen sudah tersedia dan user MySQL punya akses yang benar.
3. Upload folder `backend` ke VPS.
4. Isi `.env` dengan credential database VPS.
5. Jalankan `npm install`, lalu `npm run build`.
6. Jalankan API dengan PM2:

```bash
npm install -g pm2
pm2 start npm --name allstar-backend -- start
pm2 save
```

7. Pasang Nginx reverse proxy dari domain API ke port `8000`.

## Database Mapping

Saat ini route backend berisi SQL adapter awal. Nama tabel dan kolom harus
disesuaikan dengan database permanen AllStar. Kirim struktur tabel atau hasil
export schema database, lalu mapping di route API bisa dibuat akurat tanpa
mengubah database.
