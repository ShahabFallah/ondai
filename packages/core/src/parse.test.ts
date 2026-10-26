import { describe, expect, it } from 'vitest'
import { matchEnum, matchEnumList, parseDate, parseMoney, parseNumber, similarity } from './parse'

describe('matchEnum', () => {
  const cats = ['groceries', 'transport', 'dining', 'utilities', 'entertainment'] as const
  it('exact, prefix, contains, fuzzy and aliases', () => {
    expect(matchEnum('Groceries', cats)?.via).toBe('exact')
    expect(matchEnum('grocer', cats)?.value).toBe('groceries')
    expect(matchEnum('dinning out', cats)?.value).toBe('dining')
    expect(matchEnum('food', cats, { aliases: { groceries: ['food', 'supermarket'] } })?.value).toBe('groceries')
    expect(matchEnum('spaceship', cats)).toBeNull()
    expect(matchEnum('', cats)).toBeNull()
  })
  it('symbol-only options survive normalization', () => {
    const prices = ['$', '$$', '$$$'] as const
    expect(matchEnum('$', prices)?.value).toBe('$')
    expect(matchEnum('$$$', prices)?.value).toBe('$$$')
    expect(matchEnum('cheap', prices, { aliases: { $: ['cheap', 'budget'] } })?.value).toBe('$')
  })
  it('lists', () => {
    expect(matchEnumList('Transport, dining; nonsense', cats)).toEqual(['transport', 'dining'])
  })
  it('similarity is symmetric and bounded', () => {
    expect(similarity('night', 'nacht')).toBeCloseTo(similarity('nacht', 'night'))
    expect(similarity('a', 'b')).toBeLessThanOrEqual(1)
  })
})

describe('parseNumber / parseMoney', () => {
  it('numbers', () => {
    expect(parseNumber('1,200')).toBe(1200)
    expect(parseNumber('1.200,50')).toBe(1200.5)
    expect(parseNumber('12.50')).toBe(12.5)
    expect(parseNumber('3.5k')).toBe(3500)
    expect(parseNumber('twenty five')).toBe(25)
    expect(parseNumber('a dozen')).toBe(12)
    expect(parseNumber('none')).toBeNull()
  })
  it('money', () => {
    expect(parseMoney('€12.50')).toEqual({ amount: 12.5, currency: 'EUR' })
    expect(parseMoney('$1,200')).toEqual({ amount: 1200, currency: 'USD' })
    expect(parseMoney('12,50 €')).toEqual({ amount: 12.5, currency: 'EUR' })
    expect(parseMoney('USD 30')).toEqual({ amount: 30, currency: 'USD' })
    expect(parseMoney('30 bucks')).toEqual({ amount: 30, currency: 'USD' })
    expect(parseMoney('lunch')).toBeNull()
  })
})

describe('parseDate', () => {
  const now = new Date(2026, 9, 26, 10, 0) // Monday 26 Oct 2026, 10:00
  const d = (s: string) => parseDate(s, { now })
  it('relative days', () => {
    expect(d('tomorrow')!.date.getDate()).toBe(27)
    expect(d('day after tomorrow')!.date.getDate()).toBe(28)
    expect(d('in 3 days')!.date.getDate()).toBe(29)
    expect(d('2 weeks from now')!.date.getDate()).toBe(9)
  })
  it('weekdays go forward', () => {
    expect(d('friday')!.date.getDate()).toBe(30)
    expect(d('next friday')!.date.getDate()).toBe(30)
    expect(d('monday')!.date.getDate()).toBe(2)
    expect(d('this monday')!.date.getDate()).toBe(26)
  })
  it('times', () => {
    const r = d('next friday after lunch')!
    expect(r.date.getDate()).toBe(30)
    expect(r.date.getHours()).toBe(12)
    expect(r.precision).toBe('minute')
    expect(d('tomorrow at 5pm')!.date.getHours()).toBe(17)
    expect(d('at 9:30')!.date.getMinutes()).toBe(30)
    expect(d('tonight')!.date.getHours()).toBe(19)
  })
  it('absolute', () => {
    expect(d('2026-12-01')!.date.getMonth()).toBe(11)
    expect(d('Dec 1')!.date.getMonth()).toBe(11)
    expect(d('1st of march')!.date.getFullYear()).toBe(2027)
    expect(d('10/31')!.date.getDate()).toBe(31)
    expect(d('nothing here')).toBeNull()
  })
})
