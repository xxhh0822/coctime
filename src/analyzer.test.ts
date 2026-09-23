import { describe, expect, it } from 'vitest'
import { calculateAdjustedFinish, parseSnapshot, resolveItemName } from './analyzer'

const snapshot = {
  tag: '#TEST',
  timestamp: 1790064310,
  helpers: [
    { data: 124000000, lvl: 4, helper_cooldown: 5919 },
    { data: 124000001, lvl: 12, helper_cooldown: 5919 },
  ],
  traps: [
    { data: 12000000, lvl: 13, timer: 499350 },
    { data: 12000000, lvl: 13, timer: 4984, helper_recurrent: true },
    { data: 12000000, lvl: 13, timer: 538296 },
    { data: 12000000, lvl: 13, timer: 357248 },
    { data: 12000000, lvl: 13, timer: 357727 },
    { data: 12000005, lvl: 12, timer: 749757 },
  ],
  units: [{ data: 4000006, lvl: 13, timer: 492324, helper_recurrent: true }],
  pets: [{ data: 73000008, lvl: 13, timer: 500126 }],
  buildings2: [
    { data: 1000041, lvl: 9, timer: 63164 },
    { data: 1000043, lvl: 9, timer: 165956 },
    { data: 1000041, lvl: 9, timer: 416594 },
  ],
}

describe('parseSnapshot', () => {
  it('finds all eleven timed upgrades and resolves category maps', () => {
    const result = parseSnapshot(JSON.stringify(snapshot))

    expect(result.tag).toBe('#TEST')
    expect(result.helpers.builder).toMatchObject({ level: 4, cooldownSeconds: 5919 })
    expect(result.helpers.lab).toMatchObject({ level: 12, cooldownSeconds: 5919 })
    expect(result.tasks).toHaveLength(11)
    expect(result.tasks.map((task) => task.name)).toEqual(expect.arrayContaining([
      'Bomb',
      'Air Bomb',
      'Wizard',
      'Diggy',
      'Double Cannon',
      'Hidden Tesla',
    ]))
  })

  it('separates builder pools from laboratory and pet upgrade queues', () => {
    const result = parseSnapshot(JSON.stringify({
      ...snapshot,
      buildings: [{ data: 1000015, lvl: 8, cnt: 5 }, { data: 1000064, lvl: 1, cnt: 1 }],
    }))

    expect(result.workerPools.home).toMatchObject({ total: 6, busy: 6, idle: 0, source: 'hut-count' })
    expect(result.workerPools.builder).toMatchObject({ total: 3, busy: 3, idle: 0, source: 'builder-base-inference' })
    expect(result.tasks.filter((task) => ['units', 'spells', 'siege_machines'].includes(task.category))).toHaveLength(1)
    expect(result.tasks.filter((task) => task.category === 'pets')).toHaveLength(1)
    expect(result.tasks.filter((task) => task.category === 'units2')).toHaveLength(0)
  })

  it('applies the level twelve lab assistant to Wizard', () => {
    const result = parseSnapshot(JSON.stringify(snapshot))
    const wizard = result.tasks.find((task) => task.dataId === 4000006)

    expect(wizard?.boosts).toHaveLength(4)
    expect(wizard?.savedSeconds).toBe(48 * 60 * 60)
    expect(wizard?.adjustedFinishAtMs).toBe(new Date('2026-09-26T00:50:34.000Z').getTime())
  })

  it('does not apply an apprentice session after the bomb naturally completes', () => {
    const result = parseSnapshot(JSON.stringify(snapshot))
    const bomb = result.tasks.find((task) => task.timerSeconds === 4984)

    expect(bomb?.helperStatus).toBe('no-saving')
    expect(bomb?.savedSeconds).toBe(0)
    expect(bomb?.boosts).toHaveLength(0)
  })

  it('preserves unknown IDs with a readable fallback', () => {
    const payload = { timestamp: 1790064310, spells: [{ data: 999999999, lvl: 1, timer: 60 }] }
    const result = parseSnapshot(JSON.stringify(payload))
    expect(result.tasks[0].name).toBe('未知项目 · 999999999')
  })

  it('accepts millisecond timestamps', () => {
    const payload = { timestamp: 1790064310000, buildings: [{ data: 1000008, lvl: 1, timer: 60 }] }
    expect(parseSnapshot(JSON.stringify(payload)).snapshotAtMs).toBe(1790064310000)
  })

  it('reports invalid JSON and missing timestamps', () => {
    expect(() => parseSnapshot('{broken')).toThrow('JSON 格式不正确')
    expect(() => parseSnapshot('{}')).toThrow('timestamp')
  })

  it('does not calculate two conflicting recurrent tasks for one helper', () => {
    const payload = {
      timestamp: 1790064310,
      helpers: [{ data: 124000001, lvl: 12, helper_cooldown: 10 }],
      units: [
        { data: 4000006, lvl: 13, timer: 5000, helper_recurrent: true },
        { data: 4000007, lvl: 12, timer: 6000, helper_recurrent: true },
      ],
    }
    const result = parseSnapshot(JSON.stringify(payload))
    expect(result.warnings).toHaveLength(1)
    expect(result.tasks.every((task) => task.helperStatus === 'conflict')).toBe(true)
  })
})
describe('calculateAdjustedFinish', () => {
  it('handles a partial helper session', () => {
    const result = calculateAdjustedFinish(0, 30 * 60, {
      kind: 'lab',
      name: '实验室助手',
      level: 2,
      cooldownSeconds: 0,
    })
    expect(result.boosts).toHaveLength(1)
    expect(result.boosts[0].partial).toBe(true)
    expect(result.adjustedFinishAtMs).toBe(10 * 60 * 1000)
  })
})

describe('resolveItemName', () => {
  it('covers every supported map group', () => {
    expect(resolveItemName('th_buildings', 1000008)).toBe('Cannon')
    expect(resolveItemName('th_troops', 26000000)).toBe('Lightning Spell')
    expect(resolveItemName('heroes', 28000000)).toBe('Barbarian King')
    expect(resolveItemName('pets', 73000008)).toBe('Diggy')
    expect(resolveItemName('bh_buildings', 1000041)).toBe('Double Cannon')
    expect(resolveItemName('bh_troops', 4000031)).toBe('Raged Barbarian')
  })
})
