# jsonapi-frontend-next

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/code-wheel/jsonapi-frontend-next&env=DRUPAL_BASE_URL&envDescription=Drupal%20site%20URL%20(example%3A%20https%3A%2F%2Fwww.example.com)&envLink=https%3A%2F%2Fgithub.com%2Fcode-wheel%2Fjsonapi-frontend-next%2Fblob%2Fmaster%2F.env.example)

Next.js starter template for Drupal JSON:API with [jsonapi_frontend](https://www.drupal.org/project/jsonapi_frontend).

**Zero to rendering Drupal content in under 30 minutes.**

## One-click deploy (free)

### Vercel

Click the button above, set `DRUPAL_BASE_URL`, and deploy.

## Quick Start

### 1. Use this template

Click the green **"Use this template"** button above, or:

```bash
gh repo create my-site --template code-wheel/jsonapi-frontend-next
cd my-site
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Drupal URL

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DRUPAL_BASE_URL=https://your-drupal-site.com
```

### 4. Start developing

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and navigate to any path that exists in Drupal.

## Features

- Next.js 14+ App Router
- TypeScript
- Tailwind CSS
- Automatic path resolution via `jsonapi_frontend`
- Entity and View rendering
- **Full media support** (images, video, audio, files, embedded media)
- **HTML sanitization** (XSS protection)
- SEO-friendly metadata
- Two deployment modes (Split Routing or Next.js First)

## Prerequisites

- Node.js 20+
- A Drupal 10+ site with:
  - `jsonapi_frontend` module enabled
  - JSON:API module enabled (core)
  - `jsonapi_views` module (optional, for Views support)

## How It Works

```
Request: /about-us
    ↓
Resolver: GET /jsonapi/resolve?path=/about-us&_format=json
    ↓
Response: { kind: "entity", jsonapi_url: "/jsonapi/node/page/...", headless: true }
    ↓
Fetch: GET /jsonapi/node/page/...?include=field_image,field_media...
    ↓
Render: <NodePage entity={...} included={...} />
```

## Project Structure

```
├── app/
│   ├── [...slug]/page.tsx    # Catch-all route for all Drupal paths
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Homepage
│   └── not-found.tsx         # 404 page
├── components/
│   ├── entity/               # Entity type components
│   │   ├── EntityRenderer.tsx
│   │   ├── NodePage.tsx
│   │   └── NodeArticle.tsx
│   ├── media/                # Media components
│   │   ├── DrupalImage.tsx
│   │   ├── DrupalVideo.tsx
│   │   ├── DrupalAudio.tsx
│   │   ├── DrupalFile.tsx
│   │   ├── DrupalMedia.tsx
│   │   └── BodyContent.tsx
│   └── view/
│       └── ViewRenderer.tsx
├── lib/drupal/               # Drupal integration utilities
│   ├── resolve.ts            # Path resolver
│   ├── fetch.ts              # JSON:API fetching
│   ├── types.ts              # TypeScript types
│   ├── url.ts                # URL utilities
│   └── media.ts              # Media extraction
└── proxy.ts                  # Proxy (Next.js First mode)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DRUPAL_BASE_URL` | Yes | Your Drupal site URL |
| `DEPLOYMENT_MODE` | No | `split_routing` (default) or `nextjs_first` |
| `DRUPAL_ORIGIN_URL` | Next.js First | Drupal origin for proxying |
| `DRUPAL_PROXY_SECRET` | Next.js First | Shared secret from Drupal admin |
| `REVALIDATION_SECRET` | Production | Secret for cache revalidation webhooks |
| `DRUPAL_IMAGE_DOMAIN` | Recommended | Restrict image sources (defaults to `DRUPAL_BASE_URL` host) |
| `DRUPAL_JWT_TOKEN` | Optional | Server-side JWT token for Drupal auth |
| `DRUPAL_BASIC_USERNAME` | Optional | Server-side Basic auth username |
| `DRUPAL_BASIC_PASSWORD` | Optional | Server-side Basic auth password |

See `.env.example` for detailed documentation.

## Credentials (optional)

If your Drupal JSON:API requires auth, set one of these in `.env.local` (server-side only):

- `DRUPAL_BASIC_USERNAME` + `DRUPAL_BASIC_PASSWORD`
- `DRUPAL_JWT_TOKEN`

When auth is configured, this starter disables Next.js fetch caching to avoid leaking access-controlled content across users.

## Security notes

- In production, do not allow wildcard image domains. Set `DRUPAL_IMAGE_DOMAIN` (or rely on `DRUPAL_BASE_URL` if images come from the same host).
- Non-headless redirects are validated to only go to your configured Drupal origin (avoids open-redirect footguns).

## Deployment Modes

### Split Routing (Default)

Drupal stays on your main domain. Configure your CDN/router to send specific paths to Next.js.

```env
DEPLOYMENT_MODE=split_routing
DRUPAL_BASE_URL=https://www.example.com
```

### Next.js First

Next.js handles all traffic. Non-headless content is proxied to Drupal.

```env
DEPLOYMENT_MODE=nextjs_first
DRUPAL_BASE_URL=https://cms.example.com
DRUPAL_ORIGIN_URL=https://cms.example.com
DRUPAL_PROXY_SECRET=your-secret-from-drupal-admin
```

See the [Migration Guide](https://www.drupal.org/docs/contributed-modules/jsonapi-frontend/migration-guide) for complete setup instructions.

## Media Support

### Supported Media Types

| Type | Component | Description |
|------|-----------|-------------|
| Image | `DrupalImage` | Next.js Image with optimization |
| Video | `DrupalVideo` | Local video files |
| Remote Video | `DrupalVideo` | YouTube, Vimeo embeds |
| Audio | `DrupalAudio` | Audio files with controls |
| File | `DrupalFile` | Downloadable files with icons |

### Using Media in Components

```tsx
import { extractPrimaryImage } from "@/lib/drupal"
import { DrupalImage, BodyContent } from "@/components/media"

function MyComponent({ entity, included }) {
  const heroImage = extractPrimaryImage(entity, included)
  const body = entity.attributes?.body?.processed

  return (
    <div>
      {heroImage && <DrupalImage image={heroImage} preset="hero" priority />}
      {body && <BodyContent html={body} included={included} />}
    </div>
  )
}
```

### Image Presets

| Preset | Size | Use Case |
|--------|------|----------|
| `thumbnail` | 150x150 | Thumbnails, avatars |
| `medium` | 500px wide | In-content images |
| `large` | 1000px wide | Featured images |
| `hero` | 1920x400 | Hero banners |
| `full` | Original | When you need full size |

## Adding New Entity Types

1. Create a component in `components/entity/`:

```tsx
// components/entity/NodeEvent.tsx
import { JsonApiResource, extractPrimaryImage } from "@/lib/drupal"
import { DrupalImage, BodyContent } from "@/components/media"

interface Props {
  entity: JsonApiResource
  included?: JsonApiResource[]
}

export function NodeEvent({ entity, included }: Props) {
  const title = entity.attributes?.title as string
  const body = entity.attributes?.body as { processed: string } | undefined
  const image = extractPrimaryImage(entity, included)

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {image && <DrupalImage image={image} preset="hero" priority />}
      <h1>{title}</h1>
      {body && <BodyContent html={body.processed} included={included} />}
    </main>
  )
}
```

2. Register in `components/entity/EntityRenderer.tsx`:

```tsx
case "node--event":
  return <NodeEvent entity={entity} included={doc.included} />
```

3. Add includes in `app/[...slug]/page.tsx` if needed:

```typescript
const DEFAULT_INCLUDES = [
  // ... existing
  "field_event_image",
  "field_event_image.field_media_image",
]
```

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Set environment variables in Vercel project settings.

### Other Platforms

```bash
npm run build
npm start
```

## Cache Revalidation

This starter includes automatic cache invalidation via webhooks from Drupal.

### How It Works

1. Editor saves content in Drupal
2. Drupal sends POST to `/api/revalidate` with cache tags
3. Next.js invalidates matching cached pages
4. Next request fetches fresh content

### Setup

1. In Drupal admin (`/admin/config/services/jsonapi-frontend`):
   - Enable "Cache revalidation webhooks"
   - Set URL to `https://your-nextjs-site.com/api/revalidate`
   - Copy the generated secret

2. In Next.js `.env.local`:
   ```env
   REVALIDATION_SECRET=your-secret-from-drupal-admin
   ```

### Testing

```bash
# Health check
curl https://your-nextjs-site.com/api/revalidate

# Manual revalidation (for testing)
curl -X POST https://your-nextjs-site.com/api/revalidate \
  -H "Content-Type: application/json" \
  -H "X-Revalidation-Secret: your-secret" \
  -d '{"operation":"update","paths":["/about-us"],"tags":["drupal"]}'
```

## Troubleshooting

### Images not showing

1. Check `DEFAULT_INCLUDES` in `app/[...slug]/page.tsx`
2. Set `DRUPAL_IMAGE_DOMAIN` environment variable
3. Verify files are accessible to anonymous users

### 403 Forbidden errors

1. Check `DRUPAL_PROXY_SECRET` matches Drupal admin
2. Verify CORS is configured in Drupal

### Content shows "not found" but exists in Drupal

1. Check the content type is enabled in Drupal admin at `/admin/config/services/jsonapi-frontend`
2. Verify the path alias exists
3. Check entity access (unpublished content returns not found)

## CORS Configuration

Add to Drupal `settings.php`:

```php
$settings['cors'] = [
  'enabled' => TRUE,
  'allowedOrigins' => ['https://your-nextjs-site.com'],
  'allowedMethods' => ['GET'],
  'allowedHeaders' => ['Content-Type', 'Accept', 'Authorization'],
];
```

## License

GPL-2.0-or-later

## Related

- [jsonapi_frontend](https://www.drupal.org/project/jsonapi_frontend) - The Drupal module
- [JSON:API](https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module) - Drupal core module
- [jsonapi_views](https://www.drupal.org/project/jsonapi_views) - Views as JSON:API endpoints
