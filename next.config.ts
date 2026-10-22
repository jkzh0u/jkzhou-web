
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.jkzhou.ca",
        pathname: "/**",
      },
    ],
  },
};

module.exports = {
  allowedDevOrigins: ['10.2.131.173'],
}

export default nextConfig;
