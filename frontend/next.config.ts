import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.114"], 

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8081/api/:path*", 
      },
      {
        // CHANGED: Match the exact folder name from your database
        source: "/bidding_attachments/:path*",
        destination: "http://127.0.0.1:8081/bidding_attachments/:path*", 
      },
      {
        // THIS is the rule you need for that specific URL
        source: "/uploads/:path*",
        destination: "http://127.0.0.1:8081/uploads/:path*", 
      },
      {
        // NEW: Rule for your deliverable item images
        source: "/project_items/:path*",
        destination: "http://127.0.0.1:8081/project_items/:path*", 
      },
      {
        source: "/company_attachments/:path*",
        destination: "http://127.0.0.1:8081/company_attachments/:path*", 
      },
      {
        // NEW: Rule for your Supplier Products!
        source: "/supplier_product/:path*",
        destination: "http://127.0.0.1:8081/supplier_product/:path*", 
      },
    ];
  },
};

export default nextConfig;