import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // 프로필 사진(5MB)과 나머지 폼 값이 함께 들어간다. 기본값은 1MB다
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
