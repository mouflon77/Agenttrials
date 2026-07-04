import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "agentwallets",
    "@google-cloud/secret-manager",
    "firebase-admin",
    "@turnkey/sdk-server",
    "@turnkey/crypto",
    "@turnkey/solana",
    "hpke-js",
    "@hpke/core",
    "@hpke/common",
    "@hpke/chacha20poly1305",
    "@hpke/dhkem-x25519",
    "@hpke/dhkem-x448",
  ],
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/@hpke/**/*",
      "./node_modules/hpke-js/**/*",
      "./node_modules/@turnkey/**/*",
      "./packages/agentwallets/dist/**/*",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
