import { notFound, redirect } from "next/navigation"
import { resolvePath, fetchJsonApi, fetchView } from "@/lib/drupal"
import { EntityRenderer } from "@/components/entity"
import { ViewRenderer } from "@/components/view"

interface PageProps {
  params: { slug: string[] }
  searchParams?: Record<string, string | string[] | undefined>
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
  const path = "/" + params.slug.join("/")

  try {
    const query = searchParamsToString(searchParams)

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
      redirect(resolved.drupal_url)
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
  } catch (error) {
    // Log error for debugging (server-side only, won't leak to client)
    console.error(`[jsonapi_frontend] Error rendering ${path}:`, error instanceof Error ? error.message : "Unknown error")

    // Return a user-friendly error page
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-8">
            We couldn&apos;t load this page. Please try again later.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Home
          </a>
        </div>
      </div>
    )
  }
}

/**
 * Generate metadata for SEO.
 */
export async function generateMetadata({ params }: PageProps) {
  const path = "/" + params.slug.join("/")

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
