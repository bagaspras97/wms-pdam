# Monitor Aktivitas PDAM — Demo Frontend

Prototype website tanpa backend. Data dummy dan perubahan selama demo disimpan di `localStorage` browser.

## Menjalankan

Jalankan `pnpm install`, lalu `pnpm dev` dan buka `http://localhost:3000`.

- Username: `admin.demo`
- Password: `demo12345`

Flow demo mencakup login admin/PIC, pembuatan tim dan akun PIC, penugasan aktivitas kepada tim, pengelolaan anggota oleh PIC, pembaruan status, dokumentasi, pengajuan/persetujuan biaya, serta laporan CSV. Hapus key `monitor-pdam-demo` dari Local Storage untuk mengembalikan data awal.

Akun demo PIC: `pic.distribusi` / `demo12345`. PIC lain memakai password sementara yang wajib diganti saat login pertama.

Tahap berikutnya akan mengganti penyimpanan browser dengan Supabase Auth, PostgreSQL, RLS, dan RPC transaksi atomik.
