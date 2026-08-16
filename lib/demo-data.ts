export type Status =
  | "Direncanakan"
  | "Sedang Dikerjakan"
  | "Tertunda"
  | "Selesai"
  | "Dibatalkan";
export type Priority = "Rendah" | "Normal" | "Tinggi" | "Darurat";
export type Expense = {
  id: string;
  category: string;
  amount: number;
  note: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
  rejectionReason?: string;
};
export type Team = {
  id: string;
  name: string;
  picName: string;
  username: string;
  password: string;
  active: boolean;
  mustChangePassword: boolean;
  members: string[];
};
export type RegionCode = { code: string; name: string; hamlets?: string[] };
export type RepairCode = { code: string; name: string; pricePerPoint: number };
export type RepairItem = { code: string; name: string; pricePerPoint: number; points: number; total: number };
export type Activity = {
  id: string;
  name: string;
  type: string;
  address: string;
  regionCode?: string;
  regionName?: string;
  hamlet?: string;
  repairItems?: RepairItem[];
  toolsUsed?: string[];
  source: "Internal" | "Pengaduan pelanggan";
  customer?: string;
  officer: string;
  priority: Priority;
  paymentStatus?: "Belum dibayar" | "Sudah dibayar";
  paidAt?: string;
  paymentNote?: string;
  status: Status;
  createdAt: string;
  targetDate: string;
  startedAt?: string;
  completedAt?: string;
  pausedReason?: string;
  resumeDate?: string;
  note: string;
  files: string[];
  expenses: Expense[];
  history: { status: Status; at: string; note: string }[];
  progressNotes?: { id: string; at: string; note: string; author: string }[];
};
export type Officials = { kasubag: string; kepalaBagian: string; admin: string };
export type DemoState = { activities: Activity[]; teams: Team[]; regions: RegionCode[]; repairCodes: RepairCode[]; tools: string[]; officials?: Officials };
export const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
export const initialState: DemoState = {
  officials: { kasubag: "", kepalaBagian: "", admin: "" },
  tools: ["Kunci pipa", "Tang pompa air", "Gergaji pipa", "Mesin bor", "Meteran"],
  regions: [
    { code: "01", name: "Perean Timur", hamlets: ["Dusun A", "Dusun B", "Dusun C"] },
    { code: "02", name: "Perean Barat", hamlets: ["Dusun A", "Dusun B", "Dusun C"] },
    { code: "03", name: "Perean Tengah", hamlets: ["Dusun A", "Dusun B", "Dusun C"] },
  ],
  repairCodes: [
    { code: "01", name: "Perbaikan pipa 2 inci", pricePerPoint: 60000 },
    { code: "02", name: "Perbaikan pipa 3 inci", pricePerPoint: 70000 },
    { code: "03", name: "Perbaikan keran", pricePerPoint: 80000 },
  ],
  teams: [
    { id: "tim-001", name: "Tim Distribusi A", picName: "I Made Wirata", username: "pic.distribusi", password: "demo12345", active: true, mustChangePassword: false, members: ["Putu Gede Arta", "Komang Yudiana"] },
    { id: "tim-002", name: "Tim Mekanikal", picName: "Komang Aditya", username: "pic.mekanikal", password: "demo12345", active: true, mustChangePassword: true, members: ["Made Sujana"] },
    { id: "tim-003", name: "Tim Sambungan Baru", picName: "Ni Luh Pradani", username: "pic.sambungan", password: "demo12345", active: true, mustChangePassword: true, members: [] },
  ],
  activities: [
    {
      id: "AKT-2026-0018",
      name: "Perbaikan kebocoran pipa distribusi",
      type: "Perbaikan pipa",
      address: "Jl. Ahmad Yani No. 42, Denpasar",
      source: "Pengaduan pelanggan",
      customer: "Putu Ariasa · PGD-260814-08",
      officer: "Tim Distribusi A",
      priority: "Darurat",
      status: "Sedang Dikerjakan",
      createdAt: "2026-08-14T07:35:00+08:00",
      targetDate: "2026-08-14",
      startedAt: "2026-08-14T08:10:00+08:00",
      note: "Kebocoran menyebabkan tekanan air turun di sekitar lokasi.",
      files: ["foto-lokasi-awal.jpg"],
      expenses: [
        {
          id: "b1",
          category: "Material",
          amount: 875000,
          note: "Pipa dan sambungan PVC",
          status: "Menunggu",
        },
      ],
      history: [
        {
          status: "Direncanakan",
          at: "2026-08-14T07:35:00+08:00",
          note: "Aktivitas dibuat admin",
        },
        {
          status: "Sedang Dikerjakan",
          at: "2026-08-14T08:10:00+08:00",
          note: "Tim tiba di lokasi",
        },
      ],
    },
    {
      id: "AKT-2026-0017",
      name: "Pemeriksaan meter air pelanggan",
      type: "Inspeksi meter",
      address: "Perumahan Taman Sari Blok C-12, Badung",
      source: "Pengaduan pelanggan",
      customer: "Ni Luh Sari · PGD-260813-21",
      officer: "Tim Distribusi A",
      priority: "Normal",
      status: "Direncanakan",
      createdAt: "2026-08-13T15:20:00+08:00",
      targetDate: "2026-08-15",
      note: "Tagihan meningkat tidak wajar.",
      files: [],
      expenses: [],
      history: [
        {
          status: "Direncanakan",
          at: "2026-08-13T15:20:00+08:00",
          note: "Menunggu kunjungan petugas",
        },
      ],
    },
    {
      id: "AKT-2026-0016",
      name: "Pemeliharaan pompa booster",
      type: "Pemeliharaan",
      address: "Rumah Pompa Booster Sanur, Jl. Danau Tamblingan",
      source: "Internal",
      officer: "Tim Mekanikal",
      priority: "Tinggi",
      status: "Selesai",
      createdAt: "2026-08-12T08:00:00+08:00",
      targetDate: "2026-08-13",
      startedAt: "2026-08-12T09:15:00+08:00",
      completedAt: "2026-08-13T14:30:00+08:00",
      note: "Pemeliharaan berkala triwulan.",
      files: ["pompa-sebelum.jpg", "pompa-sesudah.jpg"],
      expenses: [
        {
          id: "b2",
          category: "Material",
          amount: 1450000,
          note: "Seal dan pelumas",
          status: "Disetujui",
        },
        {
          id: "b3",
          category: "Transportasi",
          amount: 225000,
          note: "Mobil operasional",
          status: "Disetujui",
        },
      ],
      history: [
        {
          status: "Direncanakan",
          at: "2026-08-12T08:00:00+08:00",
          note: "Jadwal pemeliharaan",
        },
        {
          status: "Sedang Dikerjakan",
          at: "2026-08-12T09:15:00+08:00",
          note: "Pemeriksaan dimulai",
        },
        {
          status: "Selesai",
          at: "2026-08-13T14:30:00+08:00",
          note: "Pompa kembali normal",
        },
      ],
    },
    {
      id: "AKT-2026-0015",
      name: "Pemasangan sambungan rumah baru",
      type: "Pemasangan baru",
      address: "Jl. Tukad Yeh Aya Gang VIII No. 7",
      source: "Internal",
      officer: "Tim Sambungan Baru",
      priority: "Normal",
      status: "Sedang Dikerjakan",
      createdAt: "2026-08-11T10:10:00+08:00",
      targetDate: "2026-08-13",
      startedAt: "2026-08-13T08:30:00+08:00",
      note: "Pemasangan sesuai SPK pelanggan baru.",
      files: [],
      expenses: [
        {
          id: "b4",
          category: "Material",
          amount: 630000,
          note: "Meter dan fitting",
          status: "Menunggu",
        },
      ],
      history: [
        {
          status: "Direncanakan",
          at: "2026-08-11T10:10:00+08:00",
          note: "Aktivitas dibuat",
        },
        {
          status: "Sedang Dikerjakan",
          at: "2026-08-13T08:30:00+08:00",
          note: "Pekerjaan lapangan dimulai",
        },
      ],
    },
  ],
};
