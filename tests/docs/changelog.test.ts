import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as main from '../../src/index.js'
import * as plugins from '../../src/plugins/index.js'

const log = readFileSync(join(__dirname, '..', '..', 'CHANGELOG.md'), 'utf8')

describe('CHANGELOG', () => {
  const listed = [...log.matchAll(/^- `([A-Za-z][A-Za-z0-9]*)` - /gm)].map((m) => m[1]!)

  it('should list the exports it names (harness control)', () => {
    expect(listed.length).toBeGreaterThan(10)
    expect(listed.filter((name) => name in main || name in plugins).length).toBeGreaterThan(10)
  })

  it('should only list names that the package exports', () => {
    expect(listed.filter((name) => !(name in main) && !(name in plugins))).toEqual([])
  })

  it('should not claim object pooling, which the package does not do', () => {
    expect(log).not.toMatch(/object pooling/i)
  })
})
