import { DrupalMediaData } from "@/lib/drupal/media"

interface DrupalVideoProps {
  media: DrupalMediaData
  className?: string
  autoPlay?: boolean
  controls?: boolean
  loop?: boolean
  muted?: boolean
}

/**
 * Renders a Drupal video (local file or remote embed).
 */
export function DrupalVideo({
  media,
  className,
  autoPlay = false,
  controls = true,
  loop = false,
  muted = false,
}: DrupalVideoProps) {
  // Remote video (YouTube, Vimeo)
  if (media.type === "remote_video" && media.embedUrl) {
    return (
      <div className={`relative aspect-video ${className || ""}`}>
        <iframe
          src={media.embedUrl}
          title={media.name}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  // Local video file
  if (media.type === "video" && media.url) {
    return (
      <video
        src={media.url}
        className={className}
        autoPlay={autoPlay}
        controls={controls}
        loop={loop}
        muted={muted}
        playsInline
      >
        <source src={media.url} type={media.mimeType || "video/mp4"} />
        Your browser does not support the video tag.
      </video>
    )
  }

  return null
}
