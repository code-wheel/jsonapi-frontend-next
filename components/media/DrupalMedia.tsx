import { DrupalMediaData } from "@/lib/drupal/media"
import { DrupalImage } from "./DrupalImage"
import { DrupalVideo } from "./DrupalVideo"
import { DrupalAudio } from "./DrupalAudio"
import { DrupalFile } from "./DrupalFile"

interface DrupalMediaProps {
  media: DrupalMediaData
  className?: string
  imagePreset?: "full" | "thumbnail" | "medium" | "large" | "hero"
}

/**
 * Universal media renderer that handles all Drupal media types.
 */
export function DrupalMedia({
  media,
  className,
  imagePreset = "medium",
}: DrupalMediaProps) {
  switch (media.type) {
    case "image":
      if (media.image) {
        return (
          <DrupalImage
            image={media.image}
            preset={imagePreset}
            className={className}
          />
        )
      }
      return null

    case "video":
    case "remote_video":
      return <DrupalVideo media={media} className={className} />

    case "audio":
      return <DrupalAudio media={media} className={className} />

    case "file":
      return <DrupalFile media={media} className={className} />

    default:
      // Unknown media type - render as link if URL available
      if (media.url) {
        return (
          <a
            href={media.url}
            className={className}
            target="_blank"
            rel="noopener noreferrer"
          >
            {media.name || "Download"}
          </a>
        )
      }
      return null
  }
}
