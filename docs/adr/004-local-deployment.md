# ADR 004: Tahap demonstrasi frontend

Status: diterima.

Demo pertama berjalan sebagai website Next.js tanpa backend dan menggunakan penyimpanan browser. Setelah flow disetujui, backend memakai Supabase Cloud untuk Auth dan PostgreSQL; transaksi stok akan diposting melalui RPC atomik dengan RLS aktif.
