import summarize from './summarize/fixtures.json'
import smartInput from './smart-input/fixtures.json'
import autoTag from './auto-tag/fixtures.json'
import naturalFilter from './natural-filter/fixtures.json'
import smartReply from './smart-reply/fixtures.json'
import commandBar from './command-bar/fixtures.json'
import scanToData from './scan-to-data/fixtures.json'
import rewrite from './rewrite/fixtures.json'

export const fixtureSets = {
  summarize,
  'smart-input': smartInput,
  'auto-tag': autoTag,
  'natural-filter': naturalFilter,
  'smart-reply': smartReply,
  'command-bar': commandBar,
  'scan-to-data': scanToData,
  rewrite,
} as const

export type FixtureComponent = keyof typeof fixtureSets
