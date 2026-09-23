import idMap from './data/id-map.json'
import type { UpgradeTask } from './types'

export const ENTITY_ICON_LIBRARY_VERSION = 'v1'

export type EntityIconFamily = 'building' | 'trap' | 'troop' | 'spell' | 'siege' | 'hero' | 'pet' | 'builder'

export interface EntityIconSpec {
  family: EntityIconFamily
  variant: string
  seed: number
}

type IconMapKey = keyof typeof idMap

const categoryMapKeys: Record<string, IconMapKey> = {
  buildings: 'th_buildings',
  traps: 'th_buildings',
  units: 'th_troops',
  siege_machines: 'th_troops',
  spells: 'th_troops',
  heroes: 'heroes',
  pets: 'pets',
  buildings2: 'bh_buildings',
  traps2: 'bh_buildings',
  units2: 'bh_troops',
  heroes2: 'bh_buildings',
}

function familyForCategory(category: string): EntityIconFamily {
  if (category === 'traps' || category === 'traps2') return 'trap'
  if (category === 'units' || category === 'units2') return 'troop'
  if (category === 'spells') return 'spell'
  if (category === 'siege_machines') return 'siege'
  if (category === 'heroes' || category === 'heroes2') return 'hero'
  if (category === 'pets') return 'pet'
  if (category === 'buildings2') return 'builder'
  return 'building'
}

function stableSeed(value: string) {
  let result = 17
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) % 997
  }
  return result
}

function variantFor(name: string, family: EntityIconFamily) {
  const normalized = name.toLowerCase()

  if (family === 'trap') {
    if (normalized.includes('bomb')) return 'bomb'
    if (normalized.includes('spring')) return 'spring'
    if (normalized.includes('skeleton')) return 'skull'
    if (normalized.includes('tornado')) return 'vortex'
    return 'trap'
  }
  if (family === 'building' || family === 'builder') {
    if (normalized.includes('cannon')) return 'cannon'
    if (normalized.includes('tesla')) return 'tesla'
    if (normalized.includes('mortar')) return 'mortar'
    if (normalized.includes('tower')) return 'tower'
    if (normalized.includes('storage')) return 'storage'
    if (normalized.includes('laboratory')) return 'laboratory'
    if (normalized.includes('wall')) return 'wall'
    return family === 'builder' ? 'fort' : 'building'
  }
  if (family === 'troop') {
    if (normalized.includes('wizard')) return 'wizard'
    if (normalized.includes('dragon')) return 'dragon'
    if (normalized.includes('archer')) return 'archer'
    if (normalized.includes('giant')) return 'giant'
    return 'troop'
  }
  if (family === 'spell') return 'spell'
  if (family === 'siege') return 'siege'
  if (family === 'hero') return 'hero'
  if (family === 'pet') return 'pet'
  return 'fallback'
}

function familyForMappedEntry(mapKey: IconMapKey, dataId: string, name: string): EntityIconFamily {
  if (mapKey === 'heroes') return 'hero'
  if (mapKey === 'pets') return 'pet'
  if (mapKey === 'bh_troops') return 'troop'
  if (mapKey === 'th_troops') {
    if (dataId.startsWith('260')) return 'spell'
    if (/wrecker|blimp|slammer|siege|launcher|flinger|drill|wagon/i.test(name)) return 'siege'
    return 'troop'
  }
  if (mapKey === 'th_buildings') {
    if (dataId.startsWith('120') || dataId.startsWith('102') || dataId.startsWith('103')) return 'trap'
    if (dataId.startsWith('280')) return 'hero'
    return 'building'
  }
  if (dataId.startsWith('120')) return 'trap'
  if (dataId.startsWith('280')) return 'hero'
  return 'builder'
}

function createKnownManifest() {
  const manifest: Record<string, EntityIconSpec> = {}
  const maps = idMap as Record<IconMapKey, Record<string, string>>

  for (const [mapKey, entries] of Object.entries(maps) as [IconMapKey, Record<string, string>][]) {
    for (const [dataId, name] of Object.entries(entries)) {
      const key = `${mapKey}:${dataId}`
      const family = familyForMappedEntry(mapKey, dataId, name)
      manifest[key] = {
        family,
        variant: variantFor(name, family),
        seed: stableSeed(key),
      }
    }
  }

  return manifest
}

/**
 * Local, versioned v1 manifest for every ID currently covered by id-map.json.
 * It intentionally contains original SVG glyph metadata, not Supercell artwork.
 */
export const ENTITY_ICON_MANIFEST = Object.freeze(createKnownManifest())

export function resolveEntityIcon(task: Pick<UpgradeTask, 'category' | 'dataId' | 'name'>): EntityIconSpec {
  const mapKey = categoryMapKeys[task.category]
  const known = mapKey ? ENTITY_ICON_MANIFEST[`${mapKey}:${task.dataId}`] : undefined
  const family = familyForCategory(task.category)

  if (known) {
    return {
      family,
      variant: variantFor(task.name, family),
      seed: known.seed,
    }
  }

  return {
    family,
    variant: 'fallback',
    seed: stableSeed(`${task.category}:${task.dataId}:${task.name}`),
  }
}
