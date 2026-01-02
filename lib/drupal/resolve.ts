import { LayoutResolveResponse, ResolveResponse } from "./types"
import { getDrupalAuthHeaders } from "./auth"

async function fetchResolver(
  endpointPath: string,
  path: string,
  langcode?: string
): Promise<Response> {
  const base = process.env.DRUPAL_BASE_URL
  if (!base) {
    throw new Error("Missing DRUPAL_BASE_URL environment variable")
  }

  const url = new URL(endpointPath, base)
  url.searchParams.set("path", path)
  url.searchParams.set("_format", "json")
  if (langcode) {
    url.searchParams.set("langcode", langcode)
  }

  const authHeaders = getDrupalAuthHeaders()
  const headers: Record<string, string> = {
    Accept: "application/vnd.api+json",
    ...(authHeaders ?? {}),
  }

  const proxySecret = process.env.DRUPAL_PROXY_SECRET
  if (proxySecret && proxySecret.trim() !== "") {
    headers["X-Proxy-Secret"] = proxySecret.trim()
  }

  return await fetch(
    url.toString(),
    authHeaders
      ? { cache: "no-store", headers }
      : { next: { revalidate: 60 }, headers }
  )
}

/**
 * Resolve a frontend path to a Drupal resource.
 *
 * @param path - The path to resolve (e.g., "/about-us")
 * @param langcode - Optional language code (e.g., "en", "es")
 * @returns The resolved resource information
 */
export async function resolvePath(
  path: string,
  langcode?: string
): Promise<ResolveResponse> {
  const res = await fetchResolver("/jsonapi/resolve", path, langcode)

  if (!res.ok) {
    throw new Error(`Resolver failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as ResolveResponse
}

/**
 * Resolve a frontend path and include a Layout Builder tree when available.
 *
 * Falls back to `/jsonapi/resolve` if the add-on module is not installed.
 */
export async function resolvePathWithLayout(
  path: string,
  langcode?: string
): Promise<LayoutResolveResponse> {
  const res = await fetchResolver("/jsonapi/layout/resolve", path, langcode)

  if (res.status === 404) {
    return await resolvePath(path, langcode)
  }

  if (!res.ok) {
    throw new Error(`Layout resolver failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as LayoutResolveResponse
}
