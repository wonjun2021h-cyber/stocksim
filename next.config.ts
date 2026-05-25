import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 같은 Wi-Fi에서 폰으로 접속할 때 dev 리소스 차단 해제
  allowedDevOrigins: ["192.168.0.101", "192.168.0.105"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
