import { DrupalMediaData } from "@/lib/drupal/media"

interface DrupalAudioProps {
  media: DrupalMediaData
  className?: string
  autoPlay?: boolean
  controls?: boolean
  loop?: boolean
}

/**
 * Renders a Drupal audio file.
 */
export function DrupalAudio({
  media,
  className,
  autoPlay = false,
  controls = true,
  loop = false,
}: DrupalAudioProps) {
  if (media.type !== "audio" || !media.url) {
    return null
  }

  return (
    <audio
      src={media.url}
      className={className}
      autoPlay={autoPlay}
      controls={controls}
      loop={loop}
    >
      <source src={media.url} type={media.mimeType || "audio/mpeg"} />
      Your browser does not support the audio tag.
    </audio>
  )
}
