import { JsonApiDocument } from "./types"
import { getDrupalAuthHeaders } from "./auth"

/**
 * Extract cache tags from a JSON:API path.
 *
 * @param jsonapiPath - The JSON:API path (e.g., "/jsonapi/node/page/uuid")
 * @returns Array of cache tags for this resource
 */
function extractCacheTags(jsonapiPath: string): string[] {
  const tags: string[] = ["drupal"] // Global tag for all Drupal content

  // Parse the path: /jsonapi/{entity_type}/{bundle}/{uuid}
  const match = jsonapiPath.match(/\/jsonapi\/([^/]+)\/([^/]+)(?:\/([^/?]+))?/)

  if (match) {
    const [, entityType, bundle, uuid] = match

    // Add type tag (e.g., "type:node--page")
    tags.push(`type:${entityType}--${bundle}`)

    // Add bundle tag (e.g., "bundle:page")
    tags.push(`bundle:${bundle}`)

    // Add entity-specific tag if UUID present (e.g., "node:uuid")
    if (uuid) {
      tags.push(`${entityType}:${uuid}`)
      tags.push(`uuid:${uuid}`)
    }
  }

  return tags
}

/**
 * Extract cache tags from a view path.
 *
 * @param dataUrl - The view data URL (e.g., "/jsonapi/views/blog/page_1")
 * @returns Array of cache tags for this view
 */
function extractViewCacheTags(dataUrl: string): string[] {
  const tags: string[] = ["drupal", "views"]

  // Parse the path: /jsonapi/views/{view_id}/{display_id}
  const match = dataUrl.match(/\/jsonapi\/views\/([^/]+)\/([^/?]+)/)

  if (match) {
    const [, viewId, displayId] = match
    tags.push(`view:${viewId}`)
    tags.push(`view:${viewId}--${displayId}`)
  }

  return tags
}

/**
 * Fetch a JSON:API resource from Drupal.
 *
 * Includes automatic cache tagging for on-demand revalidation.
 * When Drupal content changes, the revalidation webhook invalidates
 * matching cache tags, causing this fetch to return fresh data.
 *
 * @param jsonapiPath - The JSON:API path (e.g., "/jsonapi/node/page/{uuid}")
 * @param options - Optional fetch options
 * @returns The JSON:API document
 */
export async function fetchJsonApi<T = JsonApiDocument>(
  jsonapiPath: string,
  options?: {
    include?: string[]
    fields?: Record<string, string[]>
    revalidate?: number
    /** Additional cache tags to include */
    tags?: string[]
  }
): Promise<T> {
  const base = process.env.DRUPAL_BASE_URL
  if (!base) {
    throw new Error("Missing DRUPAL_BASE_URL environment variable")
  }

  const url = new URL(jsonapiPath, base)

  // Add include parameter for relationships
  if (options?.include?.length) {
    url.searchParams.set("include", options.include.join(","))
  }

  // Add sparse fieldsets
  if (options?.fields) {
    for (const [type, fields] of Object.entries(options.fields)) {
      url.searchParams.set(`fields[${type}]`, fields.join(","))
    }
  }

  // Build cache tags
  const tags = [
    ...extractCacheTags(jsonapiPath),
    ...(options?.tags || []),
  ]

  const authHeaders = getDrupalAuthHeaders()
  const headers: Record<string, string> = {
    Accept: "application/vnd.api+json",
    ...(authHeaders ?? {}),
  }

  const proxySecret = process.env.DRUPAL_PROXY_SECRET
  if (proxySecret && proxySecret.trim() !== "") {
    headers["X-Proxy-Secret"] = proxySecret.trim()
  }

  const res = await fetch(
    url.toString(),
    authHeaders
      ? { cache: "no-store", headers }
      : {
          next: {
            revalidate: options?.revalidate ?? 60,
            tags,
          },
          headers,
        }
  )

  if (!res.ok) {
    throw new Error(`JSON:API fetch failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as T
}

/**
 * Fetch a view from jsonapi_views.
 *
 * Includes automatic cache tagging for on-demand revalidation.
 *
 * @param dataUrl - The data URL from the resolver (e.g., "/jsonapi/views/blog/page_1")
 * @param options - Optional fetch options
 * @returns The JSON:API document with view results
 */
export async function fetchView<T = JsonApiDocument>(
  dataUrl: string,
  options?: {
    /**
     * JSON:API pagination parameters.
     *
     * - number: sets page[offset]
     * - object: sets page[offset] and/or page[limit]
     */
    page?: number | { offset?: number; limit?: number }
    revalidate?: number
    /** Additional cache tags to include */
    tags?: string[]
  }
): Promise<T> {
  const base = process.env.DRUPAL_BASE_URL
  if (!base) {
    throw new Error("Missing DRUPAL_BASE_URL environment variable")
  }

  const url = new URL(dataUrl, base)

  // Add pagination if specified.
  if (options?.page !== undefined) {
    if (typeof options.page === "number") {
      url.searchParams.set("page[offset]", String(options.page))
    } else {
      if (options.page.offset !== undefined) {
        url.searchParams.set("page[offset]", String(options.page.offset))
      }
      if (options.page.limit !== undefined) {
        url.searchParams.set("page[limit]", String(options.page.limit))
      }
    }
  }

  // Build cache tags
  const tags = [
    ...extractViewCacheTags(dataUrl),
    ...(options?.tags || []),
  ]

  const authHeaders = getDrupalAuthHeaders()
  const headers: Record<string, string> = {
    Accept: "application/vnd.api+json",
    ...(authHeaders ?? {}),
  }

  const proxySecret = process.env.DRUPAL_PROXY_SECRET
  if (proxySecret && proxySecret.trim() !== "") {
    headers["X-Proxy-Secret"] = proxySecret.trim()
  }

  const res = await fetch(
    url.toString(),
    authHeaders
      ? { cache: "no-store", headers }
      : {
          next: {
            revalidate: options?.revalidate ?? 60,
            tags,
          },
          headers,
        }
  )

  if (!res.ok) {
    throw new Error(`View fetch failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as T
}
