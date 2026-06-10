import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["localhost", "192.168.1.12", "192.168.209.1"],
};

export default nextConfig;
