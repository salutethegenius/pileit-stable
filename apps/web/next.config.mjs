/** @type {import('next').NextConfig} */
const apiOrigin = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  /** Browser calls same-origin `/pileit-data/*` so prod works without NEXT_PUBLIC_API_URL at build time. */
  async rewrites() {
    if (!apiOrigin) return [];
    return [{ source: "/pileit-data/:path*", destination: `${apiOrigin}/:path*` }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
