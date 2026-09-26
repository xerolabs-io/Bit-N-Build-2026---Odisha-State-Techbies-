/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  // Transpile Leaflet so Next.js can handle its CSS and ESM correctly
  transpilePackages: ["leaflet", "react-leaflet", "@react-leaflet/core"],

  // Increase body size limit for image upload payloads
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // Allow remote avatar and image upload domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
