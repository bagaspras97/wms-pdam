# ADR 003: Transaksi bertanggal mundur

Status: diterima.

Tanggal efektif boleh sebelum hari ini dan waktu posting selalu disimpan. V1 memvalidasi saldo terkini secara atomik. Rekonstruksi saldo historis penuh perlu ditambahkan sebelum proses bisnis bergantung pada cut-off akuntansi.
