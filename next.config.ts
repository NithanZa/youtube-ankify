import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/ankificator",
  async redirects() {
    return [{ source: "/", destination: "/ankificator", permanent: false, basePath: false }];
  },
};

export default nextConfig;
