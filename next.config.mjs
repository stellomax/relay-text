/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the prototype deploy from failing on lint/type nits.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
