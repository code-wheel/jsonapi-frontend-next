import { timingSafeEqual } from "crypto"
import { revalidatePath, revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

/**
 * Revalidation webhook endpoint.
 *
 * Receives POST requests from Drupal when headless content changes.
 * Invalidates Next.js cache using paths and/or cache tags.
 *
 * Security:
 * - Requires X-Revalidation-Secret header matching REVALIDATION_SECRET env var
 * - Uses timing-safe comparison to prevent timing attacks
 */

interface RevalidatePayload {
  operation: "insert" | "update" | "delete"
  paths: string[]
  tags: string[]
  entity?: {
    type: string
    bundle: string
    uuid: string
  }
  timestamp: number
}

const MAX_REVALIDATE_ITEMS = 50

function serializeError(error: unknown): { message: string; name?: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  return { message: String(error) }
}

function normalizeRevalidatePath(value: unknown): string | null {
  if (typeof value !== "string") return null

  const path = value.trim()
  if (path === "" || path.length > 2048) return null
  if (!path.startsWith("/") || path.startsWith("//")) return null
  if (path.includes("?") || path.includes("#")) return null
  if (path.includes("\0") || path.includes("\\") || path.includes("..")) return null

  return path
}

function normalizeRevalidateTag(value: unknown): string | null {
  if (typeof value !== "string") return null

  const tag = value.trim()
  if (tag === "" || tag.length > 200) return null
  if (!/^[a-zA-Z0-9:_-]+$/.test(tag)) return null

  return tag
}

/**
 * Securely compare two strings using timing-safe comparison.
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function POST(request: NextRequest) {
  // Verify secret
  const secret = request.headers.get("x-revalidation-secret")
  const expectedSecret = process.env.REVALIDATION_SECRET

  if (!expectedSecret) {
    console.error("[Revalidate] REVALIDATION_SECRET environment variable not set")
    return NextResponse.json(
      { error: "Revalidation not configured" },
      { status: 500 }
    )
  }

  if (!secret || !secureCompare(secret, expectedSecret)) {
    return NextResponse.json(
      { error: "Invalid or missing secret" },
      { status: 401 }
    )
  }

  // Parse payload
  let payload: RevalidatePayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    )
  }

  const operation = payload.operation
  const entity = payload.entity
  const rawPaths = Array.isArray(payload.paths) ? payload.paths : []
  const rawTags = Array.isArray(payload.tags) ? payload.tags : []

  if (rawPaths.length === 0 && rawTags.length === 0) {
    return NextResponse.json(
      { error: "No paths or tags provided" },
      { status: 400 }
    )
  }

  // Track what was revalidated
  const revalidated = {
    paths: [] as string[],
    tags: [] as string[],
  }

  // Revalidate by cache tags (more efficient, surgical invalidation)
  for (const rawTag of rawTags.slice(0, MAX_REVALIDATE_ITEMS)) {
    const tag = normalizeRevalidateTag(rawTag)
    if (!tag) continue

    try {
      revalidateTag(tag, "max")
      revalidated.tags.push(tag)
    } catch (error) {
      console.error({
        message: "[Revalidate] Failed to revalidate tag",
        tag,
        error: serializeError(error),
      })
    }
  }

  // Revalidate by paths (fallback, less efficient but more direct)
  for (const rawPath of rawPaths.slice(0, MAX_REVALIDATE_ITEMS)) {
    const path = normalizeRevalidatePath(rawPath)
    if (!path) continue

    try {
      revalidatePath(path)
      revalidated.paths.push(path)
    } catch (error) {
      console.error({
        message: "[Revalidate] Failed to revalidate path",
        path,
        error: serializeError(error),
      })
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn({
      message: "[Revalidate] Revalidated",
      operation,
      tags: revalidated.tags.length,
      paths: revalidated.paths.length,
      entity: entity ? `${entity.type}/${entity.bundle}/${entity.uuid}` : undefined,
    })
  }

  return NextResponse.json({
    revalidated: true,
    operation,
    paths: revalidated.paths,
    tags: revalidated.tags,
    timestamp: Date.now(),
  })
}

/**
 * Health check endpoint.
 * Returns 200 if the revalidation endpoint is configured and ready.
 */
export async function GET() {
  const hasSecret = !!process.env.REVALIDATION_SECRET

  return NextResponse.json({
    status: hasSecret ? "ready" : "not_configured",
    message: hasSecret
      ? "Revalidation endpoint is ready"
      : "REVALIDATION_SECRET environment variable not set",
  })
}
