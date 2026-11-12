import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El build falla si hay errores de tipos o de lint. Es a propósito:
  // preferimos enterarnos en el Pull Request y no en producción.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  experimental: {
    serverActions: { bodySizeLimit: 4 * 1024 * 1024 },
  },
};

export default nextConfig;
