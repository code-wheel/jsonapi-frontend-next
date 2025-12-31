"use client"

import { useMemo } from "react"
import DOMPurify from "isomorphic-dompurify"
import { JsonApiResource } from "@/lib/drupal/types"
import {
  extractMedia,
  extractEmbeddedMediaUuids,
  DrupalMediaData,
} from "@/lib/drupal/media"
import { resolveFileUrl } from "@/lib/drupal/url"
import { DrupalMedia } from "./DrupalMedia"

/**
 * Sanitize HTML to prevent XSS attacks.
 * Allows safe tags and attributes commonly used in rich text.
 */
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "b", "i", "u", "s",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "a", "img",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "figure", "figcaption",
      "div", "span",
      "hr",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "class", "id",
      "target", "rel",
      "width", "height",
      "colspan", "rowspan",
    ],
    // Allow data: URLs for inline images (Drupal may use these)
    ALLOW_DATA_ATTR: false,
    // Add rel="noopener noreferrer" to external links
    ADD_ATTR: ["target"],
  })
}

interface BodyContentProps {
  /**
   * The HTML content to render.
   */
  html: string
  /**
   * The included resources from JSON:API response.
   * Required for embedded media resolution.
   */
  included?: JsonApiResource[]
  /**
   * Additional CSS classes for the container.
   */
  className?: string
  /**
   * Image preset for embedded images.
   */
  imagePreset?: "full" | "thumbnail" | "medium" | "large" | "hero"
}

/**
 * Renders Drupal body content with embedded media support.
 *
 * Features:
 * - Parses <drupal-media> tags and replaces with rendered media
 * - Resolves relative file URLs to absolute
 * - Handles images, videos, audio, and files
 *
 * Usage:
 * ```tsx
 * <BodyContent
 *   html={entity.attributes.body.processed}
 *   included={doc.included}
 * />
 * ```
 *
 * Note: For embedded media to work, you must include the media entities
 * when fetching:
 * ```ts
 * const doc = await fetchJsonApi(url, {
 *   include: ["field_media", "field_media.field_media_image"],
 * })
 * ```
 */
export function BodyContent({
  html,
  included,
  className,
  imagePreset = "large",
}: BodyContentProps) {
  // Process the HTML content
  const processedContent = useMemo(() => {
    if (!html) return null

    // Extract embedded media UUIDs
    const mediaUuids = extractEmbeddedMediaUuids(html)

    // If no embedded media, just process URLs, sanitize, and render
    if (mediaUuids.length === 0) {
      return (
        <div
          className={`prose prose-lg max-w-none ${className || ""}`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(processUrls(html)) }}
        />
      )
    }

    // Build a map of UUID -> media data
    const mediaMap = new Map<string, DrupalMediaData>()

    for (const uuid of mediaUuids) {
      // Find media entity in included
      const mediaResource = included?.find(
        (item) => item.id === uuid && item.type.startsWith("media--")
      )

      if (mediaResource) {
        const mediaData = extractMedia(mediaResource, included)
        if (mediaData) {
          mediaMap.set(uuid, mediaData)
        }
      }
    }

    // If we found no media, sanitize and render with URL processing
    if (mediaMap.size === 0) {
      return (
        <div
          className={`prose prose-lg max-w-none ${className || ""}`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(processUrls(html)) }}
        />
      )
    }

    // Split content by drupal-media tags and render with React components
    return (
      <div className={`prose prose-lg max-w-none ${className || ""}`}>
        {renderWithEmbeddedMedia(html, mediaMap, imagePreset)}
      </div>
    )
  }, [html, included, className, imagePreset])

  return processedContent
}

/**
 * Process URLs in HTML to make them absolute.
 */
function processUrls(html: string): string {
  // Process src attributes
  let processed = html.replace(
    /src=["']([^"']+)["']/g,
    (match, url) => {
      const resolved = resolveFileUrl(url)
      return resolved ? `src="${resolved}"` : match
    }
  )

  // Process href attributes for files (not anchors to pages)
  processed = processed.replace(
    /href=["']([^"']+\/files\/[^"']+)["']/g,
    (match, url) => {
      const resolved = resolveFileUrl(url)
      return resolved ? `href="${resolved}"` : match
    }
  )

  return processed
}

/**
 * Render HTML with embedded media replaced by React components.
 */
function renderWithEmbeddedMedia(
  html: string,
  mediaMap: Map<string, DrupalMediaData>,
  imagePreset: "full" | "thumbnail" | "medium" | "large" | "hero"
): React.ReactNode[] {
  // Split by drupal-media tags
  const parts = html.split(/(<drupal-media[^>]*>[\s\S]*?<\/drupal-media>)/g)

  return parts.map((part, index) => {
    // Check if this part is a drupal-media tag
    const uuidMatch = part.match(/data-entity-uuid=["']([^"']+)["']/)

    if (uuidMatch) {
      const uuid = uuidMatch[1]
      const mediaData = mediaMap.get(uuid)

      if (mediaData) {
        // Extract alignment from the tag
        const alignMatch = part.match(/data-align=["']([^"']+)["']/)
        const align = alignMatch?.[1] || "none"

        const alignClass =
          align === "center"
            ? "mx-auto"
            : align === "left"
            ? "float-left mr-4 mb-2"
            : align === "right"
            ? "float-right ml-4 mb-2"
            : ""

        // Extract caption
        const captionMatch = part.match(/data-caption=["']([^"']+)["']/)
        const caption = captionMatch?.[1]

        return (
          <figure key={index} className={`my-4 ${alignClass}`}>
            <DrupalMedia
              media={mediaData}
              imagePreset={imagePreset}
              className="rounded"
            />
            {caption && (
              <figcaption
                className="text-sm text-gray-600 mt-2 text-center"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(decodeHtmlEntities(caption)) }}
              />
            )}
          </figure>
        )
      }
    }

    // Regular HTML content - sanitize, process URLs, and render
    if (part.trim()) {
      return (
        <span
          key={index}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(processUrls(part)) }}
        />
      )
    }

    return null
  })
}

/**
 * Decode HTML entities in a string.
 */
function decodeHtmlEntities(text: string): string {
  const textarea = typeof document !== "undefined"
    ? document.createElement("textarea")
    : null

  if (textarea) {
    textarea.innerHTML = text
    return textarea.value
  }

  // Server-side fallback
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
