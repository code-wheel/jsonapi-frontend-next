/**
 * URL utilities for Drupal integration.
 */

/**
 * Get the Drupal base URL from environment.
 */
export function getDrupalBaseUrl(): string {
  const base = process.env.DRUPAL_BASE_URL
  if (!base) {
    throw new Error("Missing DRUPAL_BASE_URL environment variable")
  }
  return base.replace(/\/$/, "") // Remove trailing slash
}

/**
 * Resolve a Drupal file URL to an absolute URL.
 *
 * Handles:
 * - Relative URLs (/sites/default/files/image.jpg)
 * - Protocol-relative URLs (//example.com/image.jpg)
 * - Absolute URLs (https://example.com/image.jpg)
 * - Data URLs (data:image/png;base64,...)
 *
 * @param url - The URL to resolve
 * @param baseUrl - Optional base URL (defaults to DRUPAL_BASE_URL)
 * @returns Absolute URL
 */
export function resolveFileUrl(url: string | null | undefined, baseUrl?: string): string | null {
  if (!url) {
    return null
  }

  // Already absolute
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }

  // Data URL - return as-is
  if (url.startsWith("data:")) {
    return url
  }

  // Protocol-relative URL
  if (url.startsWith("//")) {
    return `https:${url}`
  }

  // Relative URL - prepend Drupal base
  const base = baseUrl || getDrupalBaseUrl()

  // Ensure URL starts with /
  const path = url.startsWith("/") ? url : `/${url}`

  return `${base}${path}`
}

/**
 * Extract file URL from a JSON:API file resource.
 *
 * @param file - The file resource from JSON:API
 * @returns Resolved absolute URL
 */
export function getFileUrl(file: {
  attributes?: {
    uri?: { url?: string; value?: string }
    url?: string
  }
} | null | undefined): string | null {
  if (!file?.attributes) {
    return null
  }

  // Try different URL locations in JSON:API file resources
  const url =
    file.attributes.uri?.url ||
    file.attributes.uri?.value ||
    file.attributes.url

  return resolveFileUrl(url)
}

/**
 * Build a URL with image style derivative.
 *
 * Note: Requires Consumer Image Styles module or similar on Drupal side.
 * This is a helper for when you have image style URLs available.
 *
 * @param originalUrl - Original file URL
 * @param style - Image style machine name
 * @returns URL for the image style derivative
 */
export function getImageStyleUrl(originalUrl: string, style: string): string {
  // Standard Drupal image style URL pattern:
  // /sites/default/files/styles/{style}/public/image.jpg
  //
  // This function assumes the URL follows Drupal's standard pattern.
  // If your setup is different, adjust accordingly.

  const resolved = resolveFileUrl(originalUrl)
  if (!resolved) {
    return originalUrl
  }

  // Check if it's already a styled URL
  if (resolved.includes("/styles/")) {
    // Replace existing style
    return resolved.replace(/\/styles\/[^/]+\//, `/styles/${style}/`)
  }

  // Convert original URL to styled URL
  // /sites/default/files/image.jpg -> /sites/default/files/styles/{style}/public/image.jpg
  const filesMatch = resolved.match(/(.+\/files\/)(.+)$/)
  if (filesMatch) {
    const [, basePath, filePath] = filesMatch
    return `${basePath}styles/${style}/public/${filePath}`
  }

  // Fallback: return original
  return resolved
}
