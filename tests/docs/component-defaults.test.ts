import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..', '..')
const LF = String.fromCharCode(10)
const CR = String.fromCharCode(13)
const BACKTICK = String.fromCharCode(96)
const BACKSLASH = String.fromCharCode(92)
const read = (file: string) => readFileSync(join(root, file), 'utf8').split(CR + LF).join(LF)

function sourceDefaults(file: string): Record<string, string> {
  const text = read(file)
  const start = text.indexOf('const {', text.indexOf('Inner<T>('))
  const end = text.indexOf('} = props', start)
  const defaults: Record<string, string> = {}
  for (const line of text.slice(start, end).split(LF)) {
    const m = /^\s+(\w+) = (.+?),?$/.exec(line)
    if (m) defaults[m[1]!] = m[2]!.replace(/'/g, '')
  }
  return defaults
}

function tableDefaults(heading: string): Record<string, string> {
  const text = read('LLMS.md')
  const from = text.indexOf(heading)
  const tableStart = text.indexOf('| Prop |', from)
  const tableEnd = text.indexOf(LF + LF, tableStart)
  const defaults: Record<string, string> = {}
  for (const row of text.slice(tableStart, tableEnd).split(LF).slice(2)) {
    const cells = row.split(' | ').map((c) => c.replace(/^\|\s*|\s*\|$/g, '').trim())
    const prop = cells[0]!.split(BACKTICK).join('')
    const def = (cells[3] ?? '').split(BACKTICK).join('').split(BACKSLASH).join('')
    if (def && def !== '-') defaults[prop] = def.replace(/'/g, '')
  }
  return defaults
}

function mismatches(source: Record<string, string>, documented: Record<string, string>): string[] {
  return Object.keys(source).filter((p) => p in documented && source[p] !== documented[p]).map((p) => `${p}: code ${source[p]} / docs ${documented[p]}`)
}


describe('LLMS.md component defaults', () => {
  const list = tableDefaults('#### ' + BACKTICK + 'VirtualList<T>' + BACKTICK)
  const grid = { ...list, ...tableDefaults('#### ' + BACKTICK + 'VirtualGrid<T>' + BACKTICK) }
  const masonry = { ...grid, ...tableDefaults('#### ' + BACKTICK + 'VirtualMasonry<T>' + BACKTICK) }

  it('should read the documented defaults and the component defaults', () => {
    expect(Object.keys(list).length).toBeGreaterThan(8)
    expect(sourceDefaults('src/react/components/virtual-grid.tsx')['overscan']).toBe('2')
    expect(mismatches({ overscan: '2' }, { overscan: '5' })).toEqual(['overscan: code 2 / docs 5'])
  })

  it.each([
    ['VirtualList', 'src/react/components/virtual-list.tsx', list],
    ['VirtualGrid', 'src/react/components/virtual-grid.tsx', grid],
    ['VirtualMasonry', 'src/react/components/virtual-masonry.tsx', masonry],
  ] as const)('should document the defaults of %s as the component has them', (_name, file, documented) => {
    expect(mismatches(sourceDefaults(file), documented)).toEqual([])
  })
})
