/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Puppeteer + Mongoose should not be bundled by Next for the server runtime.
  serverExternalPackages: ["puppeteer", "mongoose", "bcryptjs"],
  experimental: {
    // Server Actions body size limit (PDFs / logos can be large).
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
