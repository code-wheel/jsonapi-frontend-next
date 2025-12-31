"use client"

import Image from "next/image"
import { DrupalImageData } from "@/lib/drupal/media"

interface DrupalImageProps {
  image: DrupalImageData
  /**
   * Image style/size preset.
   * - "full": Original size (requires width/height or fill)
   * - "thumbnail": 150x150
   * - "medium": 500px wide
   * - "large": 1000px wide
   * - "hero": Full width, 400px height
   */
  preset?: "full" | "thumbnail" | "medium" | "large" | "hero"
  /**
   * Additional CSS classes.
   */
  className?: string
  /**
   * Priority loading (for above-fold images).
   */
  priority?: boolean
  /**
   * Custom width (overrides preset).
   */
  width?: number
  /**
   * Custom height (overrides preset).
   */
  height?: number
  /**
   * Fill mode - image will fill parent container.
   */
  fill?: boolean
}

const presets = {
  thumbnail: { width: 150, height: 150 },
  medium: { width: 500, height: 0 }, // height: 0 means auto
  large: { width: 1000, height: 0 },
  hero: { width: 1920, height: 400 },
  full: { width: 0, height: 0 },
}

/**
 * Renders a Drupal image using Next.js Image component.
 *
 * Handles:
 * - Automatic sizing based on presets
 * - Responsive images
 * - Lazy loading
 * - Alt text
 */
export function DrupalImage({
  image,
  preset = "medium",
  className,
  priority = false,
  width: customWidth,
  height: customHeight,
  fill = false,
}: DrupalImageProps) {
  const { src, alt, width: originalWidth, height: originalHeight, title } = image

  if (!src) {
    return null
  }

  // Use fill mode
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt || ""}
        title={title}
        fill
        className={className}
        priority={priority}
        style={{ objectFit: "cover" }}
      />
    )
  }

  // Calculate dimensions
  let width = customWidth
  let height = customHeight

  if (!width || !height) {
    const presetDims = presets[preset]

    if (presetDims.width && presetDims.height) {
      // Fixed dimensions
      width = width || presetDims.width
      height = height || presetDims.height
    } else if (presetDims.width && originalWidth && originalHeight) {
      // Scale proportionally
      width = width || presetDims.width
      height = height || Math.round((presetDims.width / originalWidth) * originalHeight)
    } else if (originalWidth && originalHeight) {
      // Use original dimensions
      width = width || originalWidth
      height = height || originalHeight
    } else {
      // Fallback: use fill mode with fixed container
      return (
        <div className={`relative ${className || ""}`} style={{ width: 500, height: 300 }}>
          <Image
            src={src}
            alt={alt || ""}
            title={title}
            fill
            priority={priority}
            style={{ objectFit: "cover" }}
          />
        </div>
      )
    }
  }

  return (
    <Image
      src={src}
      alt={alt || ""}
      title={title}
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}
