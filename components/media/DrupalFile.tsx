import { DrupalMediaData } from "@/lib/drupal/media"

interface DrupalFileProps {
  media: DrupalMediaData
  className?: string
  showIcon?: boolean
}

/**
 * Get file icon based on MIME type.
 */
function getFileIcon(mimeType?: string): string {
  if (!mimeType) return "📄"

  if (mimeType.startsWith("application/pdf")) return "📕"
  if (mimeType.includes("word") || mimeType.includes("document")) return "📘"
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📗"
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📙"
  if (mimeType.startsWith("text/")) return "📝"
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "🗜️"

  return "📄"
}

/**
 * Get human-readable file size.
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return ""

  const units = ["B", "KB", "MB", "GB"]
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Renders a downloadable file link.
 */
export function DrupalFile({
  media,
  className,
  showIcon = true,
}: DrupalFileProps) {
  if (media.type !== "file" || !media.url) {
    return null
  }

  const icon = getFileIcon(media.mimeType)
  const fileSize = formatFileSize(
    (media.resource.attributes?.filesize as number) || undefined
  )

  return (
    <a
      href={media.url}
      download
      className={`inline-flex items-center gap-2 text-blue-600 hover:underline ${className || ""}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {showIcon && <span>{icon}</span>}
      <span>{media.name}</span>
      {fileSize && <span className="text-gray-500 text-sm">({fileSize})</span>}
    </a>
  )
}
