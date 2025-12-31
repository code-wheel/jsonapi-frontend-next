import { JsonApiDocument, JsonApiResource } from "@/lib/drupal"
import Link from "next/link"

interface ViewRendererProps {
  doc: JsonApiDocument
  /** Current frontend path for pagination links */
  currentPath?: string
}

/**
 * Renders a view (listing) from jsonapi_views.
 */
export function ViewRenderer({ doc, currentPath }: ViewRendererProps) {
  const items = Array.isArray(doc.data) ? doc.data : [doc.data]

  if (items.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-gray-500">No items found.</p>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <ul className="space-y-6">
        {items.map((item) => (
          <ViewItem key={item.id} item={item} />
        ))}
      </ul>

      <ViewPagination links={doc.links} currentPath={currentPath} />
    </main>
  )
}

function ViewItem({ item }: { item: JsonApiResource }) {
  const title = item.attributes?.title as string | undefined
  const summary = (item.attributes?.body as { summary?: string } | undefined)
    ?.summary
  const path = (item.attributes?.path as { alias?: string } | undefined)?.alias
  const created = item.attributes?.created as string | undefined

  const formattedDate = created
    ? new Date(created).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  const href = path || `/${item.type.replace("--", "/")}/${item.id}`

  return (
    <li className="border-b border-gray-200 pb-6">
      <article>
        <h2 className="text-xl font-semibold mb-1">
          <Link href={href} className="hover:underline">
            {title || "Untitled"}
          </Link>
        </h2>

        {formattedDate && (
          <time className="text-sm text-gray-500 block mb-2">
            {formattedDate}
          </time>
        )}

        {summary && <p className="text-gray-700">{summary}</p>}
      </article>
    </li>
  )
}

/**
 * Extract query string from JSON:API pagination URL.
 */
function extractSearchFromUrl(url: string): string {
  try {
    const urlObj = new URL(url, "http://dummy")
    return urlObj.search
  } catch {
    return ""
  }
}

function ViewPagination({
  links,
  currentPath,
}: {
  links?: JsonApiDocument["links"]
  currentPath?: string
}) {
  if (!links) return null

  const nextUrl = typeof links.next === "string" ? links.next : links.next?.href
  const prevUrl = typeof links.prev === "string" ? links.prev : links.prev?.href

  if (!nextUrl && !prevUrl) return null

  const basePath = currentPath || ""

  const prevSearch = prevUrl ? extractSearchFromUrl(prevUrl) : ""
  const nextSearch = nextUrl ? extractSearchFromUrl(nextUrl) : ""

  const prevHref = prevSearch ? `${basePath}${prevSearch}` : null
  const nextHref = nextSearch ? `${basePath}${nextSearch}` : null

  return (
    <nav
      className="flex justify-between mt-8 pt-4 border-t border-gray-200"
      aria-label="Pagination"
    >
      {prevHref ? (
        <Link href={prevHref} className="text-blue-600 hover:underline">
          Previous
        </Link>
      ) : (
        <span />
      )}

      {nextHref && (
        <Link href={nextHref} className="text-blue-600 hover:underline">
          Next
        </Link>
      )}
    </nav>
  )
}
