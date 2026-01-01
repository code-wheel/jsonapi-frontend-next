import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Proxy file for Next.js First deployment mode.
 *
 * This proxy:
 * 1. Resolves each path via the jsonapi_frontend resolver
 * 2. For headless content: passes through to Next.js pages
 * 3. For non-headless content: proxies to Drupal origin
 *
 * Configuration:
 * - DEPLOYMENT_MODE=nextjs_first (enables proxy)
 * - DRUPAL_BASE_URL (for resolver calls)
 * - DRUPAL_ORIGIN_URL (proxy destination, defaults to DRUPAL_BASE_URL)
 * - DRUPAL_PROXY_SECRET (required for production - origin protection)
 *
 * Default: split_routing (proxy disabled, safest for getting started)
 */

// Paths that should always go to Drupal (never handled by Next.js)
const DRUPAL_ONLY_PATHS = [
  // Drupal asset paths (required when proxying Drupal HTML)
  "/core",
  "/modules",
  "/themes",
  "/sites",
  "/libraries",

  "/admin",
  "/user",
  "/node/add",
  "/node/*/edit",
  "/node/*/delete",
  "/media/add",
  "/taxonomy/term/*/edit",
  "/batch",
  "/system",
  "/devel",
]

// Paths that should never be proxied (Next.js static/internal)
const NEXTJS_ONLY_PATHS = ["/_next", "/api", "/favicon.ico", "/robots.txt", "/sitemap.xml"]

// Headers to forward from client to Drupal origin
const FORWARD_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "cookie",
  "x-requested-with",
  "x-csrf-token",
  "cache-control",
]

// Headers to forward from Drupal origin to client
const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "cache-control",
  "set-cookie",
  "location",
  "vary",
  "x-drupal-cache",
  "x-drupal-dynamic-cache",
]

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip Next.js internal paths
  if (NEXTJS_ONLY_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next()
  }

  // Check deployment mode - only proxy in nextjs_first mode
  const deploymentMode = process.env.DEPLOYMENT_MODE || "split_routing"
  if (deploymentMode !== "nextjs_first") {
    return NextResponse.next()
  }

  // Always proxy Drupal admin paths directly (no resolver needed)
  if (isDrupalOnlyPath(path)) {
    return proxyToDrupal(request, path)
  }

  // Resolve the path to determine if it's headless
  try {
    const resolved = await resolvePath(path)

    // Not found - let Next.js handle 404
    if (!resolved.resolved) {
      return NextResponse.next()
    }

    // Headless content - let Next.js page handle it
    if (resolved.headless) {
      return NextResponse.next()
    }

    // Non-headless content - proxy to Drupal
    return proxyToDrupal(request, path)
  } catch (error) {
    // SECURITY: Don't log full error - might contain origin URL
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[jsonapi_frontend] Resolver error:", message)
    // On error, let Next.js handle it (will likely 404 or show error page)
    return NextResponse.next()
  }
}

/**
 * Check if path should always go to Drupal.
 */
function isDrupalOnlyPath(path: string): boolean {
  return DRUPAL_ONLY_PATHS.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, "[^/]+") + "(/|$)")
      return regex.test(path)
    }
    return path === pattern || path.startsWith(pattern + "/")
  })
}

/**
 * Resolve a path via the jsonapi_frontend resolver.
 */
async function resolvePath(path: string): Promise<{
  resolved: boolean
  headless: boolean
  drupal_url: string | null
}> {
  const drupalBase = process.env.DRUPAL_BASE_URL
  if (!drupalBase) {
    throw new Error("DRUPAL_BASE_URL environment variable not set")
  }

  const url = new URL("/jsonapi/resolve", drupalBase)
  url.searchParams.set("path", path)
  url.searchParams.set("_format", "json")

  const headers: HeadersInit = {
    Accept: "application/vnd.api+json",
  }

  // Include proxy secret if configured
  const proxySecret = process.env.DRUPAL_PROXY_SECRET
  if (proxySecret) {
    headers["X-Proxy-Secret"] = proxySecret
  }

  const response = await fetch(url.toString(), {
    headers,
    // Short cache for resolver responses
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error(`Resolver returned ${response.status}`)
  }

  return response.json()
}

/**
 * Proxy a request to Drupal origin.
 */
async function proxyToDrupal(request: NextRequest, path: string): Promise<NextResponse> {
  const drupalOrigin = process.env.DRUPAL_ORIGIN_URL || process.env.DRUPAL_BASE_URL
  if (!drupalOrigin) {
    console.error("[jsonapi_frontend] DRUPAL_ORIGIN_URL not set, cannot proxy")
    return NextResponse.next()
  }

  // Build the proxied URL safely.
  // SECURITY: `path` is user-controlled. Ensure we never let it affect the origin (SSRF prevention).
  const drupalOriginUrl = new URL(drupalOrigin)
  if (drupalOriginUrl.protocol !== "http:" && drupalOriginUrl.protocol !== "https:") {
    console.error("[jsonapi_frontend] DRUPAL_ORIGIN_URL must be http(s)")
    return NextResponse.next()
  }

  if (!path.startsWith("/")) {
    return NextResponse.next()
  }

  const targetUrl = new URL(drupalOriginUrl.origin)
  targetUrl.pathname = path
  targetUrl.search = request.nextUrl.search

  if (targetUrl.origin !== drupalOriginUrl.origin) {
    console.error("[jsonapi_frontend] Refusing to proxy to unexpected origin")
    return NextResponse.next()
  }

  // Build headers to forward
  const headers = new Headers()

  for (const headerName of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(headerName)
    if (value) {
      headers.set(headerName, value)
    }
  }

  // Add proxy identification headers
  headers.set(
    "X-Forwarded-For",
    request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("cf-connecting-ip") ||
      "unknown"
  )
  headers.set("X-Forwarded-Proto", request.nextUrl.protocol.replace(":", ""))
  headers.set("X-Forwarded-Host", request.nextUrl.host)

  // Add proxy secret for origin protection
  const proxySecret = process.env.DRUPAL_PROXY_SECRET
  if (proxySecret) {
    headers.set("X-Proxy-Secret", proxySecret)
  }

  try {
    // Fetch from Drupal origin
    // SECURITY: targetUrl contains origin URL - never expose in client responses
    const drupalResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      // @ts-expect-error - duplex is needed for streaming body
      duplex: "half",
      redirect: "manual", // Handle redirects ourselves
    })

    // Build response headers
    const responseHeaders = new Headers()

    for (const headerName of FORWARD_RESPONSE_HEADERS) {
      const value = drupalResponse.headers.get(headerName)
      if (value) {
        // Handle multiple Set-Cookie headers
        if (headerName === "set-cookie") {
          drupalResponse.headers.forEach((v, k) => {
            if (k.toLowerCase() === "set-cookie") {
              responseHeaders.append("set-cookie", v)
            }
          })
        } else {
          responseHeaders.set(headerName, value)
        }
      }
    }

    // Handle redirects from Drupal
    if (drupalResponse.status >= 300 && drupalResponse.status < 400) {
      const location = drupalResponse.headers.get("location")
      if (location) {
        // Rewrite origin URLs to frontend URLs
        const rewrittenLocation = rewriteLocationHeader(location, drupalOrigin, request.nextUrl.origin)
        return NextResponse.redirect(rewrittenLocation, drupalResponse.status)
      }
    }

    // Return proxied response
    return new NextResponse(drupalResponse.body, {
      status: drupalResponse.status,
      statusText: drupalResponse.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    // SECURITY: Don't log full error - might contain origin URL
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[jsonapi_frontend] Proxy error:", message)
    return new NextResponse("Bad Gateway", { status: 502 })
  }
}

/**
 * Rewrite Location header to use frontend origin instead of Drupal origin.
 */
function rewriteLocationHeader(location: string, drupalOrigin: string, frontendOrigin: string): string {
  try {
    const url = new URL(location)
    const drupalUrl = new URL(drupalOrigin)

    // If the redirect is to Drupal, rewrite to frontend
    if (url.host === drupalUrl.host) {
      url.protocol = new URL(frontendOrigin).protocol
      url.host = new URL(frontendOrigin).host
    }

    return url.toString()
  } catch {
    // Relative URL, return as-is
    return location
  }
}

/**
 * Configure which paths the proxy runs on.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
