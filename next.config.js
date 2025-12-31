/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from Drupal
  // IMPORTANT: For production, set DRUPAL_IMAGE_DOMAIN to your Drupal domain
  // e.g., DRUPAL_IMAGE_DOMAIN=cms.example.com
  images: {
    remotePatterns: process.env.DRUPAL_IMAGE_DOMAIN
      ? [
          {
            protocol: "https",
            hostname: process.env.DRUPAL_IMAGE_DOMAIN,
          },
          {
            protocol: "http",
            hostname: process.env.DRUPAL_IMAGE_DOMAIN,
          },
        ]
      : [
          // Development fallback - allows all domains
          // WARNING: Do not use in production without setting DRUPAL_IMAGE_DOMAIN
          {
            protocol: "https",
            hostname: "**",
          },
          {
            protocol: "http",
            hostname: "**",
          },
        ],
  },
}

module.exports = nextConfig
