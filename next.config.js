/** @type {import('next').NextConfig} */
function normalizeHost(input) {
  if (!input) return null
  const raw = String(input).trim()
  if (!raw) return null

  if (raw.includes("://")) {
    try {
      return new URL(raw).hostname
    } catch {
      return null
    }
  }

  return raw
}

function getDrupalImageHosts() {
  if (process.env.DRUPAL_IMAGE_DOMAIN) {
    return process.env.DRUPAL_IMAGE_DOMAIN.split(",").map(normalizeHost).filter(Boolean)
  }

  if (process.env.DRUPAL_BASE_URL) {
    try {
      return [new URL(process.env.DRUPAL_BASE_URL).hostname]
    } catch {
      return []
    }
  }

  return []
}

const drupalImageHosts = getDrupalImageHosts()
const isProd = process.env.NODE_ENV === "production"

const nextConfig = {
  // Allow images from Drupal
  // IMPORTANT: For production, restrict images to your Drupal host.
  images: drupalImageHosts.length
    ? {
        remotePatterns: drupalImageHosts.flatMap((hostname) => [
          { protocol: "https", hostname },
          { protocol: "http", hostname },
        ]),
      }
    : isProd
    ? {
        // SECURITY: In production, do not allow wildcard remote images. If no allowlist
        // is configured, disable optimization (avoids SSRF via the image optimizer).
        unoptimized: true,
      }
    : {
        // Development fallback only.
        remotePatterns: [
          { protocol: "https", hostname: "**" },
          { protocol: "http", hostname: "**" },
        ],
      },
}

module.exports = nextConfig
