import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker imajı için yalnızca gereken dosyaları içeren bağımsız çıktı (.next/standalone).
  output: "standalone",
  // Ham veri önbelleği, modeller ve çalışma verisi izlemeye girmesin (yerelde 2 GB'a şişiyordu).
  outputFileTracingExcludes: {
    "*": ["./data-src/**", "./assets-src/**", "./data/**", "./public/models/**", "./public/logos/**"],
  },
};

export default nextConfig;
