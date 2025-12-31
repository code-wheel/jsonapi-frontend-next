import DOMPurify from "isomorphic-dompurify"
import { JsonApiDocument, JsonApiResource } from "@/lib/drupal"
import { NodePage } from "./NodePage"
import { NodeArticle } from "./NodeArticle"

interface EntityRendererProps {
  doc: JsonApiDocument<JsonApiResource>
}

/**
 * Renders an entity based on its type.
 *
 * Add new entity type components here as needed.
 *
 * For media support, ensure you include relationships when fetching:
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
export function EntityRenderer({ doc }: EntityRendererProps) {
  const entity = doc.data

  if (!entity || Array.isArray(entity)) {
    return <div>Invalid entity data</div>
  }

  const type = entity.type

  // Route to appropriate component based on entity type
  switch (type) {
    case "node--page":
      return <NodePage entity={entity} included={doc.included} />

    case "node--article":
      return <NodeArticle entity={entity} included={doc.included} />

    default:
      return <DefaultEntity entity={entity} included={doc.included} />
  }
}

/**
 * Fallback renderer for unknown entity types.
 */
function DefaultEntity({
  entity,
  included: _included,
}: {
  entity: JsonApiResource
  /** Included resources for relationship resolution (available for customization) */
  included?: JsonApiResource[]
}) {
  const title = entity.attributes?.title as string | undefined
  const body = entity.attributes?.body as
    | { processed: string }
    | undefined

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{title || "Untitled"}</h1>
      <p className="text-gray-500 mb-4">Entity type: {entity.type}</p>

      {body?.processed ? (
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body.processed) }}
        />
      ) : (
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(entity.attributes, null, 2)}
        </pre>
      )}
    </main>
  )
}
