import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["localhost", "192.168.1.12", "192.168.209.1"],
  async rewrites() {
    const iotServiceUrl = (
      process.env.IOT_SERVICE_URL ?? "http://localhost:3001"
    ).replace(/\/$/, "");
    return {
      // beforeFiles so these run before the api/backend/[...path] catch-all
      beforeFiles: [
        // Camera routes are NOT rewritten: they must go through the authenticated
        // /api/backend proxy -> Gateway (JWT -> identity) -> IoT farm-scoped cameraAccess.
        // A direct rewrite to the IoT service carried no identity and returned 401.
        {
          source: "/api/backend/v1/export-assessment/:path*",
          destination: `${iotServiceUrl}/api/v1/export-assessment/:path*`,
        },
        {
          source: "/api/backend/v1/public/:path*",
          destination: `${iotServiceUrl}/api/v1/public/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
