/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // exceljs pulls native/optional deps — keep out of the edge-style bundle
  serverExternalPackages: ["exceljs"],
  async redirects() {
    return [
      {
        source: "/t",
        destination: "/genius-wallet?topup=1",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;