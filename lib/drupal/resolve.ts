import { ResolveResponse } from "./types"

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
  const base = process.env.DRUPAL_BASE_URL
  if (!base) {
    throw new Error("Missing DRUPAL_BASE_URL environment variable")
  }

  const url = new URL("/jsonapi/resolve", base)
  url.searchParams.set("path", path)
  url.searchParams.set("_format", "json")
  if (langcode) {
    url.searchParams.set("langcode", langcode)
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
    headers: {
      Accept: "application/vnd.api+json",
    },
  })

  if (!res.ok) {
    throw new Error(`Resolver failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as ResolveResponse
}
