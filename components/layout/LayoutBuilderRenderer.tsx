import { BodyContent } from "@/components/media"
import {
  fetchJsonApi,
  JsonApiDocument,
  JsonApiResource,
  LayoutComponent,
  LayoutTree,
} from "@/lib/drupal"

interface LayoutBuilderRendererProps {
  layout: LayoutTree
  doc: JsonApiDocument<JsonApiResource>
}

/**
 * Minimal Layout Builder renderer for headless sites.
 *
 * MVP support:
 * - field blocks (renders basic attributes like title/body)
 * - inline blocks (fetches referenced block_content via JSON:API when possible)
 *
 * Unknown blocks are currently ignored (but still present in the layout tree).
 */
export async function LayoutBuilderRenderer({ layout, doc }: LayoutBuilderRendererProps) {
  const entity = doc.data
  const included = doc.included

  if (!entity || Array.isArray(entity)) {
    return <div>Invalid entity data</div>
  }

  // Prefetch inline blocks (best-effort).
  const inlineComponents = layout.sections
    .flatMap((section) => section.components)
    .filter(
      (component): component is Extract<LayoutComponent, { type: "inline_block" }> =>
        component.type === "inline_block" &&
        !!component.inline_block?.block?.jsonapi_url
    )

  const inlineDocs = await Promise.all(
    inlineComponents.map((component) => fetchJsonApi(component.inline_block!.block!.jsonapi_url).catch(() => null))
  )

  const inlineDocByComponentUuid = new Map<string, JsonApiDocument<JsonApiResource>>()
  inlineComponents.forEach((component, index) => {
    const doc = inlineDocs[index]
    if (doc) {
      inlineDocByComponentUuid.set(component.uuid, doc as JsonApiDocument<JsonApiResource>)
    }
  })

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      {layout.sections.map((section, sectionIndex) => {
        const regions = groupByRegion(section.components)

        return (
          <section
            key={`${sectionIndex}:${section.layout_id}`}
            className="space-y-6"
            data-layout-id={section.layout_id}
          >
            {Object.entries(regions).map(([region, components]) => (
              <div key={region} className="space-y-6" data-region={region}>
                {components.map((component) => (
                  <div key={component.uuid} data-component={component.plugin_id}>
                    {renderComponent(component, entity, included, inlineDocByComponentUuid)}
                  </div>
                ))}
              </div>
            ))}
          </section>
        )
      })}
    </main>
  )
}

function groupByRegion(components: LayoutComponent[]): Record<string, LayoutComponent[]> {
  const regions: Record<string, LayoutComponent[]> = {}

  for (const component of components) {
    const region = component.region || "content"
    if (!regions[region]) {
      regions[region] = []
    }
    regions[region].push(component)
  }

  for (const region of Object.keys(regions)) {
    regions[region].sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0))
  }

  return regions
}

function renderComponent(
  component: LayoutComponent,
  entity: JsonApiResource,
  included: JsonApiResource[] | undefined,
  inlineDocByComponentUuid: Map<string, JsonApiDocument<JsonApiResource>>
): React.ReactNode {
  if (component.type === "field") {
    const fieldName = component.field?.field_name
    if (!fieldName) return null

    if (fieldName === "title") {
      const title = entity.attributes?.title as string | undefined
      return <h1 className="text-4xl font-bold">{title || "Untitled"}</h1>
    }

    const raw = (entity.attributes as Record<string, unknown> | undefined)?.[fieldName]
    if (!raw) return null

    if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
      return <div className="text-lg">{String(raw)}</div>
    }

    if (isProcessedHtml(raw)) {
      return <BodyContent html={raw.processed} included={included} imagePreset="large" />
    }

    return (
      <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
        {JSON.stringify(raw, null, 2)}
      </pre>
    )
  }

  if (component.type === "inline_block") {
    const blockDoc = inlineDocByComponentUuid.get(component.uuid)
    if (!blockDoc) return null

    const block = blockDoc.data
    if (!block || Array.isArray(block)) return null

    const title =
      (block.attributes?.info as string | undefined) ??
      (block.attributes?.title as string | undefined)

    const body = block.attributes?.body as { processed?: string } | undefined

    return (
      <aside className="border border-gray-200 rounded-lg p-4">
        {title && <h2 className="text-xl font-semibold mb-3">{title}</h2>}
        {body?.processed ? (
          <BodyContent html={body.processed} included={blockDoc.included} imagePreset="large" />
        ) : (
          <pre className="text-sm overflow-auto">{JSON.stringify(block.attributes, null, 2)}</pre>
        )}
      </aside>
    )
  }

  // Unknown/unsupported block plugin.
  return null
}

function isProcessedHtml(value: unknown): value is { processed: string } {
  if (!value || typeof value !== "object") return false
  const processed = (value as { processed?: unknown }).processed
  return typeof processed === "string" && processed !== ""
}

