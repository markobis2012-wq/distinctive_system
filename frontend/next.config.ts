import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows the Next.js dev server to accept connections from your phone/other devices
  allowedDevOrigins: ["192.168.0.114"], 

  // Proxies frontend API calls to your hidden Go backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8081/api/:path*", 
      },
    ];
  },
};

export default nextConfig;