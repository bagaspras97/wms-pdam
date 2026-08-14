# ADR 001: Ledger persediaan immutable

Status: diterima.

Semua perubahan stok ditulis sebagai ledger dan tidak diedit/dihapus. Saldo adalah proyeksi yang diperbarui atomik. Koreksi menggunakan pembalikan agar pelaku, waktu, dan sebab tetap dapat diaudit.
