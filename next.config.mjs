/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lint isn't set up yet, but type errors must stop a deploy.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
