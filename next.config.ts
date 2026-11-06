import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Gambar disimpan di Google Drive dan ditampilkan via endpoint thumbnail.
    // drive.google.com/thumbnail me-redirect ke lh3.googleusercontent.com.
    remotePatterns: [
      { protocol: 'https', hostname: 'drive.google.com', pathname: '/thumbnail' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
    qualities: [70, 80],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400, // 31 hari: file Drive tidak berubah isinya (file baru = id baru)
    maximumRedirects: 3,
  },
  experimental: {
    serverActions: { bodySizeLimit: '1mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
