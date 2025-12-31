import { JsonApiResource } from "@/lib/drupal"
import { BodyContent } from "@/components/media"

interface NodePageProps {
  entity: JsonApiResource
  included?: JsonApiResource[]
}

/**
 * Renders a basic page node with embedded media support.
 */
export function NodePage({ entity, included }: NodePageProps) {
  const title = entity.attributes?.title as string
  const body = entity.attributes?.body as
    | { processed: string; summary?: string }
    | undefined

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <article>
        <h1 className="text-4xl font-bold mb-6">{title}</h1>

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
