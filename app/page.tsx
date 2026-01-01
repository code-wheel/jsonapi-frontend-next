import { resolvePath, fetchJsonApi } from "@/lib/drupal"
import { EntityRenderer } from "@/components/entity"

/**
 * Homepage - resolves the root path "/" from Drupal.
 *
 * If Drupal has a front page configured, it will be rendered here.
 * Otherwise, you can customize this page directly.
 */
export default async function HomePage() {
  if (!process.env.DRUPAL_BASE_URL) {
    return <WelcomePage />
  }

  const resolved = await resolvePath("/")

  if (!resolved.resolved) {
    // No front page configured in Drupal - show a welcome message
    return <WelcomePage />
  }

  if (resolved.kind === "entity" && resolved.jsonapi_url) {
    const doc = await fetchJsonApi(resolved.jsonapi_url)
    return <EntityRenderer doc={doc} />
  }

  // For views or other types on the homepage, customize as needed
  return <WelcomePage />
}

function WelcomePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">
        Drupal + Next.js
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Powered by <code className="bg-gray-100 px-2 py-1 rounded">jsonapi_frontend</code>
      </p>

      <div className="space-y-4 text-gray-700">
        <p>
          This starter is ready to render content from your Drupal site via JSON:API.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Getting Started</h2>

        <ol className="list-decimal list-inside space-y-2">
          <li>
            Set <code className="bg-gray-100 px-1 rounded">DRUPAL_BASE_URL</code> in your{" "}
            <code className="bg-gray-100 px-1 rounded">.env.local</code> file
          </li>
          <li>
            Install and enable the{" "}
            <code className="bg-gray-100 px-1 rounded">jsonapi_frontend</code> module in Drupal
          </li>
          <li>Create some content in Drupal</li>
          <li>Visit any path that exists in Drupal</li>
        </ol>

        <h2 className="text-2xl font-semibold mt-8 mb-4">How It Works</h2>

        <ul className="list-disc list-inside space-y-2">
          <li>
            The catch-all route <code className="bg-gray-100 px-1 rounded">[...slug]</code>{" "}
            handles all paths
          </li>
          <li>
            It calls the Drupal resolver endpoint to map paths to JSON:API resources
          </li>
          <li>The appropriate component renders the content</li>
        </ul>
      </div>
    </main>
  )
}
