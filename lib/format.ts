export const formatQty = (value: unknown) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(Number(value ?? 0));
export const formatDate = (value: Date | string) => new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", dateStyle: "medium" }).format(new Date(value));
export const formatDateTime = (value: Date | string) => new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
export const typeLabel: Record<string,string> = { OPENING:"Saldo awal", RECEIPT:"Barang masuk", ISSUE:"Barang keluar", ADJUSTMENT_IN:"Penyesuaian masuk", ADJUSTMENT_OUT:"Penyesuaian keluar", REVERSAL:"Pembalikan" };
