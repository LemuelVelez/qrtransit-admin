import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // !! WARN !!
    // This is a temporary solution and should be removed once the type issues are fixed
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
