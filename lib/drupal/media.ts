/**
 * Media utilities for extracting and working with Drupal media entities.
 */

import { JsonApiResource, JsonApiRelationship } from "./types"
import { getFileUrl } from "./url"

/**
 * Extracted image data ready for rendering.
 */
export interface DrupalImageData {
  src: string
  alt: string
  width?: number
  height?: number
  title?: string
}

/**
 * Extracted media data with type information.
 */
export interface DrupalMediaData {
  type: "image" | "video" | "file" | "remote_video" | "audio" | "unknown"
  name: string
  url: string | null
  image?: DrupalImageData
  mimeType?: string
  // For remote video (YouTube, Vimeo)
  embedUrl?: string
  // Original resource for custom handling
  resource: JsonApiResource
}

/**
 * Find a resource by ID in the included array.
 */
export function findIncluded(
  included: JsonApiResource[] | undefined,
  type: string,
  id: string
): JsonApiResource | undefined {
  return included?.find((item) => item.type === type && item.id === id)
}

/**
 * Find a resource by relationship reference.
 */
export function findIncludedByRelationship(
  included: JsonApiResource[] | undefined,
  relationship: JsonApiRelationship | undefined
): JsonApiResource | undefined {
  if (!relationship?.data || Array.isArray(relationship.data)) {
    return undefined
  }
  return findIncluded(included, relationship.data.type, relationship.data.id)
}

/**
 * Find multiple resources by relationship reference.
 */
export function findIncludedByRelationshipMultiple(
  included: JsonApiResource[] | undefined,
  relationship: JsonApiRelationship | undefined
): JsonApiResource[] {
  if (!relationship?.data) {
    return []
  }

  const refs = Array.isArray(relationship.data)
    ? relationship.data
    : [relationship.data]

  return refs
    .map((ref) => findIncluded(included, ref.type, ref.id))
    .filter((item): item is JsonApiResource => item !== undefined)
}

/**
 * Extract image data from an image file resource.
 */
export function extractImageFromFile(
  file: JsonApiResource | undefined
): DrupalImageData | null {
  if (!file) {
    return null
  }

  const url = getFileUrl(file)
  if (!url) {
    return null
  }

  const attrs = file.attributes as Record<string, unknown> | undefined

  return {
    src: url,
    alt: (attrs?.filename as string) || "",
    width: attrs?.image_style_uri
      ? undefined
      : (attrs?.width as number | undefined),
    height: attrs?.image_style_uri
      ? undefined
      : (attrs?.height as number | undefined),
  }
}

function getRelationshipMetaString(
  relationship: JsonApiRelationship | undefined,
  key: string
): string | undefined {
  const data = relationship?.data
  if (!data || Array.isArray(data)) {
    return undefined
  }

  const meta = (data as { meta?: Record<string, unknown> }).meta
  const value = meta?.[key]

  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

/**
 * Extract media data from a media entity.
 *
 * Supports:
 * - media--image
 * - media--video (local video files)
 * - media--remote_video (YouTube, Vimeo)
 * - media--file (documents)
 * - media--audio
 *
 * @param media - The media entity resource
 * @param included - The included array from the JSON:API response
 * @returns Extracted media data or null
 */
export function extractMedia(
  media: JsonApiResource | undefined,
  included: JsonApiResource[] | undefined
): DrupalMediaData | null {
  if (!media) {
    return null
  }

  const attrs = media.attributes as Record<string, unknown> | undefined
  const relationships = media.relationships as
    | Record<string, JsonApiRelationship>
    | undefined

  const name = (attrs?.name as string) || ""
  const mediaType = media.type.replace("media--", "")

  // Base result
  const result: DrupalMediaData = {
    type: "unknown",
    name,
    url: null,
    resource: media,
  }

  switch (mediaType) {
    case "image": {
      result.type = "image"

      // Get the file from relationships
      const fileRelationship = relationships?.field_media_image
      const file = findIncludedByRelationship(included, fileRelationship)

      if (file) {
        const imageData = extractImageFromFile(file)
        if (imageData) {
          result.url = imageData.src
          const alt = getRelationshipMetaString(fileRelationship, "alt")
          const title = getRelationshipMetaString(fileRelationship, "title")

          result.image = {
            ...imageData,
            alt: alt || imageData.alt || name,
            title: title || imageData.title,
          }
        }
      }
      break
    }

    case "video": {
      result.type = "video"

      const fileRelationship = relationships?.field_media_video_file
      const file = findIncludedByRelationship(included, fileRelationship)

      if (file) {
        result.url = getFileUrl(file)
        result.mimeType =
          (file.attributes?.filemime as string) || "video/mp4"
      }
      break
    }

    case "remote_video": {
      result.type = "remote_video"

      // Remote video URL is typically stored in a field
      const videoUrl = attrs?.field_media_oembed_video as string | undefined
      result.url = videoUrl || null

      // Generate embed URL for common providers
      if (videoUrl) {
        result.embedUrl = getVideoEmbedUrl(videoUrl)
      }
      break
    }

    case "file":
    case "document": {
      result.type = "file"

      const fileRelationship =
        relationships?.field_media_file || relationships?.field_media_document
      const file = findIncludedByRelationship(included, fileRelationship)

      if (file) {
        result.url = getFileUrl(file)
        result.mimeType = file.attributes?.filemime as string | undefined
      }
      break
    }

    case "audio": {
      result.type = "audio"

      const fileRelationship = relationships?.field_media_audio_file
      const file = findIncludedByRelationship(included, fileRelationship)

      if (file) {
        result.url = getFileUrl(file)
        result.mimeType =
          (file.attributes?.filemime as string) || "audio/mpeg"
      }
      break
    }
  }

  return result
}

/**
 * Extract all media from an entity's media field.
 *
 * @param entity - The entity with media relationships
 * @param fieldName - The media field name (e.g., "field_image", "field_media")
 * @param included - The included array from the JSON:API response
 * @returns Array of extracted media data
 */
export function extractMediaField(
  entity: JsonApiResource,
  fieldName: string,
  included: JsonApiResource[] | undefined
): DrupalMediaData[] {
  const relationships = entity.relationships as
    | Record<string, JsonApiRelationship>
    | undefined
  const relationship = relationships?.[fieldName]

  if (!relationship) {
    return []
  }

  const mediaResources = findIncludedByRelationshipMultiple(included, relationship)

  return mediaResources
    .map((media) => extractMedia(media, included))
    .filter((item): item is DrupalMediaData => item !== null)
}

/**
 * Extract the first/primary image from an entity.
 *
 * Tries common field names: field_image, field_media_image, field_media, field_thumbnail
 *
 * @param entity - The entity
 * @param included - The included array
 * @returns Image data or null
 */
export function extractPrimaryImage(
  entity: JsonApiResource,
  included: JsonApiResource[] | undefined
): DrupalImageData | null {
  const commonFields = [
    "field_image",
    "field_media_image",
    "field_media",
    "field_thumbnail",
    "field_hero_image",
  ]

  for (const fieldName of commonFields) {
    const media = extractMediaField(entity, fieldName, included)
    const imageMedia = media.find((m) => m.type === "image")
    if (imageMedia?.image) {
      return imageMedia.image
    }
  }

  return null
}

/**
 * Convert a video URL to an embeddable URL.
 *
 * Supports YouTube and Vimeo.
 */
function getVideoEmbedUrl(url: string): string | undefined {
  // YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
  )
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  return undefined
}

/**
 * Parse a drupal-media UUID from an embedded tag.
 *
 * Drupal CKEditor embeds media as:
 * <drupal-media data-entity-type="media" data-entity-uuid="..." ...></drupal-media>
 */
export function parseDrupalMediaTag(html: string): string | null {
  const match = html.match(/data-entity-uuid=["']([^"']+)["']/)
  return match ? match[1] : null
}

/**
 * Extract all drupal-media UUIDs from HTML content.
 */
export function extractEmbeddedMediaUuids(html: string): string[] {
  const regex = /<drupal-media[^>]*data-entity-uuid=["']([^"']+)["'][^>]*>/g
  const uuids: string[] = []
  let match

  while ((match = regex.exec(html)) !== null) {
    uuids.push(match[1])
  }

  return uuids
}
