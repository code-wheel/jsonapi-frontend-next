import { JsonApiResource, extractPrimaryImage } from "@/lib/drupal"
import { DrupalImage } from "@/components/media"
import { BodyContent } from "@/components/media"

interface NodeArticleProps {
  entity: JsonApiResource
  included?: JsonApiResource[]
}

/**
 * Renders an article node with media support.
 *
 * Features:
 * - Hero/featured image from field_image or field_media
 * - Body content with embedded media
 * - Date and metadata
 *
 * To include media when fetching:
 * ```ts
 * const doc = await fetchJsonApi(url, {
 *   include: [
 *     "field_image",
 *     "field_image.field_media_image",
 *     "field_media",
 *     "field_media.field_media_image",
 *   ],
 * })
 * ```
 */
export function NodeArticle({ entity, included }: NodeArticleProps) {
  const title = entity.attributes?.title as string
  const body = entity.attributes?.body as
    | { processed: string; summary?: string }
    | undefined
  const created = entity.attributes?.created as string | undefined

  // Extract hero image
  const heroImage = extractPrimaryImage(entity, included)

  // Format date if available
  const formattedDate = created
    ? new Date(created).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <article>
        {/* Hero Image */}
        {heroImage && (
          <div className="mb-8 -mx-4 sm:mx-0 sm:rounded-lg overflow-hidden">
            <DrupalImage
              image={heroImage}
              preset="hero"
              priority
              className="w-full"
            />
          </div>
        )}

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{title}</h1>
          {formattedDate && (
            <time className="text-gray-500">{formattedDate}</time>
          )}
        </header>

        {/* Body with embedded media support */}
        {body?.processed && (
          <BodyContent
            html={body.processed}
            included={included}
            imagePreset="large"
          />
        )}
      </article>
    </main>
  )
}
