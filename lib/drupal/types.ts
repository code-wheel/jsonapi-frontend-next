/**
 * Response from the jsonapi_frontend resolve endpoint.
 */
export type ResolveResponse =
  | {
      resolved: true
      kind: "entity"
      canonical: string
      entity: {
        type: string
        id: string
        langcode: string
      }
      redirect: { to: string; status?: number } | null
      jsonapi_url: string
      data_url: null
      /** Whether this entity type is enabled for headless rendering. */
      headless: boolean
      /** URL to Drupal frontend (for non-headless content). */
      drupal_url: string | null
    }
  | {
      resolved: true
      kind: "view"
      canonical: string
      entity: null
      redirect: { to: string; status?: number } | null
      jsonapi_url: null
      data_url: string
      /** Whether this View is enabled for headless rendering. */
      headless: boolean
      /** URL to Drupal frontend (for non-headless Views). */
      drupal_url: string | null
    }
  | {
      resolved: false
      kind: null
      canonical: null
      entity: null
      redirect: { to: string; status?: number } | null
      jsonapi_url: null
      data_url: null
      headless: false
      drupal_url: null
    }

/**
 * JSON:API document structure.
 */
export interface JsonApiDocument<T = JsonApiResource> {
  data: T | T[]
  included?: JsonApiResource[]
  links?: JsonApiLinks
  meta?: Record<string, unknown>
}

export interface JsonApiResource {
  type: string
  id: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, JsonApiRelationship>
  links?: JsonApiLinks
}

export interface JsonApiRelationship {
  data: { type: string; id: string } | { type: string; id: string }[] | null
  links?: JsonApiLinks
}

export interface JsonApiLinks {
  self?: string | { href: string }
  related?: string | { href: string }
  next?: string | { href: string }
  prev?: string | { href: string }
}

/**
 * Common node attributes.
 */
export interface NodeAttributes {
  drupal_internal__nid: number
  title: string
  created: string
  changed: string
  status: boolean
  path?: {
    alias: string | null
    pid: number | null
    langcode: string
  }
  body?: {
    value: string
    format: string
    processed: string
    summary: string
  }
}
