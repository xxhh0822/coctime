import { describe, expect, it } from 'vitest'
import { ENTITY_ICON_LIBRARY_VERSION, ENTITY_ICON_MANIFEST, resolveEntityIcon } from './entity-icons'

describe('entity icon manifest', () => {
  it('keeps a v1 local icon entry for every currently mapped ID', () => {
    expect(ENTITY_ICON_LIBRARY_VERSION).toBe('v1')
    expect(Object.keys(ENTITY_ICON_MANIFEST)).toHaveLength(205)
  })

  it('uses stable item-specific glyphs for known entries', () => {
    expect(resolveEntityIcon({ category: 'traps', dataId: 12000000, name: 'Bomb' }).variant).toBe('bomb')
    expect(resolveEntityIcon({ category: 'units', dataId: 4000006, name: 'Wizard' }).variant).toBe('wizard')
    expect(resolveEntityIcon({ category: 'buildings2', dataId: 1000043, name: 'Hidden Tesla' }).variant).toBe('tesla')
  })

  it('uses a stable category fallback for unknown future IDs', () => {
    const first = resolveEntityIcon({ category: 'spells', dataId: 999999999, name: 'Future Spell' })
    const second = resolveEntityIcon({ category: 'spells', dataId: 999999999, name: 'Future Spell' })

    expect(first.variant).toBe('fallback')
    expect(first.family).toBe('spell')
    expect(first.seed).toBe(second.seed)
  })
})
