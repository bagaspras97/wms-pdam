import type { NextConfig } from "next";
// Cache development sengaja berada di luar OneDrive. OneDrive Files On-Demand
// mengubah file .next menjadi reparse point dan menyebabkan EINVAL/readlink.
const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development"
    ? "../../../../AppData/Local/wms-pdam-next"
    : ".next",
};
export default nextConfig;
