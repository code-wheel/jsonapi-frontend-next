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
      kind: "route"
      canonical: string
      entity: null
      redirect: { to: string; status?: number } | null
      jsonapi_url: null
      data_url: null
      headless: false
      /** URL to Drupal frontend (for Drupal-rendered routes). */
      drupal_url: string
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
      resolved: true
      kind: "redirect"
      canonical: string
      entity: null
      redirect: { to: string; status?: number }
      jsonapi_url: null
      data_url: null
      headless: false
      drupal_url: null
    }

export interface LayoutTree {
  source: string
  view_mode: string
  sections: LayoutSection[]
}

export interface LayoutSection {
  layout_id: string
  layout_settings: Record<string, unknown>
  components: LayoutComponent[]
}

export type LayoutComponent =
  | {
      type: "field"
      uuid: string
      region: string
      weight: number
      plugin_id: string
      field: { entity_type_id: string; bundle: string; field_name: string } | null
      settings?: Record<string, unknown>
    }
  | {
      type: "inline_block"
      uuid: string
      region: string
      weight: number
      plugin_id: string
      inline_block: {
        view_mode: string | null
        block_revision_id: number | null
        block: { type: string; id: string; jsonapi_url: string } | null
      } | null
      settings?: Record<string, unknown>
    }
  | {
      type: "block"
      uuid: string
      region: string
      weight: number
      plugin_id: string
      settings?: Record<string, unknown>
    }

/**
 * Response from the jsonapi_frontend_layout resolve endpoint.
 */
export type LayoutResolveResponse =
  | (Extract<ResolveResponse, { kind: "entity"; resolved: true }> & { layout?: LayoutTree })
  | Exclude<ResolveResponse, { kind: "entity"; resolved: true }>
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
