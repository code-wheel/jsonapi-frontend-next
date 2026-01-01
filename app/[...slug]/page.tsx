import { notFound, redirect } from "next/navigation"
import { resolvePath, fetchJsonApi, fetchView } from "@/lib/drupal"
import { EntityRenderer } from "@/components/entity"
import { ViewRenderer } from "@/components/view"

interface PageProps {
  // Next.js 16+ passes `params` / `searchParams` as Promises.
  // `await` works for both Promise and non-Promise values, so this stays compatible.
  params: Promise<{ slug?: string[] }> | { slug?: string[] }
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

/**
 * Default includes for media support.
 *
 * Customize this based on your Drupal content model.
 * The pattern is: field_name, field_name.file_field
 */
const DEFAULT_INCLUDES = [
  // Common image fields
  "field_image",
  "field_image.field_media_image",
  // Generic media field
  "field_media",
  "field_media.field_media_image",
  "field_media.field_media_video_file",
  "field_media.field_media_file",
  // Hero/banner images
  "field_hero_image",
  "field_hero_image.field_media_image",
  // Thumbnail
  "field_thumbnail",
  "field_thumbnail.field_media_image",
]

/**
 * Catch-all route that renders any Drupal path.
 *
 * 1. Resolves the path via jsonapi_frontend
 * 2. Checks if content type is headless-enabled
 * 3. Redirects to Drupal if not headless
 * 4. Fetches the resource via JSON:API with media includes
 * 5. Renders with the appropriate component
 */
export default async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await params
  const path = slugToPath(resolvedParams?.slug)
  const drupalBaseUrl = process.env.DRUPAL_BASE_URL
  if (!drupalBaseUrl) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Drupal + Next.js</h1>
        <p className="text-gray-700">
          Set <code className="bg-gray-100 px-1 rounded">DRUPAL_BASE_URL</code> in{" "}
          <code className="bg-gray-100 px-1 rounded">.env.local</code> to connect this
          starter to your Drupal site.
        </p>
      </main>
    )
  }

  const query = searchParamsToString(await searchParams)

  // Resolve the path to a Drupal resource
  const resolved = await resolvePath(path)

  // Handle not found
  if (!resolved.resolved) {
    notFound()
  }

  // Handle redirects (reserved for future use)
  if (resolved.redirect) {
    redirect(resolved.redirect.to)
  }

  // Handle non-headless content (entities or views): redirect to Drupal
  if (!resolved.headless && resolved.drupal_url) {
    const safe = getSafeDrupalRedirectUrl(resolved.drupal_url, drupalBaseUrl)
    if (safe) {
      redirect(safe)
    }
    notFound()
  }

  // Handle views (headless)
  if (resolved.kind === "view" && resolved.data_url) {
    const dataUrl = query ? `${resolved.data_url}?${query}` : resolved.data_url
    const doc = await fetchView(dataUrl)
    return <ViewRenderer doc={doc} currentPath={path} />
  }

  // Handle entities
  if (resolved.kind === "entity" && resolved.jsonapi_url) {
    const doc = await fetchJsonApi(resolved.jsonapi_url, {
      // Include media relationships for embedded content
      include: DEFAULT_INCLUDES,
    })
    return <EntityRenderer doc={doc} />
  }

  // Fallback - should not reach here
  notFound()
}

/**
 * Generate metadata for SEO.
 */
export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params
  const path = slugToPath(resolvedParams?.slug)

  try {
    const resolved = await resolvePath(path)

    if (!resolved.resolved || resolved.kind !== "entity" || !resolved.jsonapi_url) {
      return {}
    }

    // Don't generate metadata for non-headless content
    if (!resolved.headless) {
      return {}
    }

    const doc = await fetchJsonApi(resolved.jsonapi_url)
    const data = doc.data as { attributes?: { title?: string; body?: { summary?: string } } }
    const title = data?.attributes?.title
    const description = data?.attributes?.body?.summary

    return {
      title: title || "Page",
      description: description || undefined,
    }
  } catch {
    return {}
  }
}

function searchParamsToString(
  searchParams: Record<string, string | string[] | undefined> | undefined
): string {
  if (!searchParams) {
    return ""
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value)
      continue
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        params.append(key, v)
      }
    }
  }

  return params.toString()
}

function slugToPath(slug: string[] | string | undefined): string {
  if (Array.isArray(slug)) {
    return "/" + slug.join("/")
  }
  if (typeof slug === "string" && slug !== "") {
    return "/" + slug
  }
  return "/"
}

function getSafeDrupalRedirectUrl(drupalUrl: string, drupalBaseUrl: string): string | null {
  let allowedOrigin: string
  try {
    allowedOrigin = new URL(drupalBaseUrl).origin
  } catch {
    return null
  }

  try {
    const target = new URL(drupalUrl, allowedOrigin)
    return target.origin === allowedOrigin ? target.toString() : null
  } catch {
    return null
  }
}
