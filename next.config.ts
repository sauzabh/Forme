import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide Next.js's "N" development badge — it sits on top of the studio.
  // Compile and runtime errors are still shown while developing.
  devIndicators: false,
};

export default nextConfig;
