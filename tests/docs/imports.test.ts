import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import * as main from '../../src/index.js'
import * as plugins from '../../src/plugins/index.js'

const root = join(__dirname, '..', '..')
const LINE_COMMENT = /\/\/[^\r\n]*/g
const IMPORT = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'(@oxog\/scrollex(?:\/plugins)?)'/g

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(md|tsx?)$/.test(entry)) out.push(full)
  }
  return out
}
const names = (list: string) => list.replace(LINE_COMMENT, '').split(',')
  .map((raw) => raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]!.trim()).filter(Boolean)
function typeNames(file: string): Set<string> {
  const found = new Set<string>()
  for (const m of readFileSync(join(root, file), 'utf8').matchAll(/export type \{([^}]*)\}/g)) names(m[1]!).forEach((n) => found.add(n))
  return found
}
const mainTypes = typeNames('src/index.ts')
const pluginTypes = typeNames('src/plugins/index.ts')

function missingImports(text: string, label: string): string[] {
  const missing: string[] = []
  for (const m of text.matchAll(IMPORT)) {
    const entry = m[2] === '@oxog/scrollex' ? main : plugins
    const types = m[2] === '@oxog/scrollex' ? mainTypes : pluginTypes
    for (const name of names(m[1]!)) if (!(name in entry) && !types.has(name)) missing.push(`${label}: ${name}`)
  }
  return missing
}

const docFiles = [join(root, 'README.md'), join(root, 'LLMS.md'), ...walk(join(root, 'website', 'src'))]

it('should only import names the package exports in README, LLMS and website samples', () => {
  const missing = docFiles.flatMap((f) => missingImports(readFileSync(f, 'utf8'), relative(root, f)))
  expect(missing).toEqual([])
})

it('should report an invented name and ignore a real one', () => {
  const doc = "import { VirtualList, madeUpPlugin } from '@oxog/scrollex'\nimport { debugPanel } from '@oxog/scrollex/plugins'"
  expect(missingImports(doc, 'synthetic')).toEqual(['synthetic: madeUpPlugin'])
})

it('should only call plugin factories that exist in README and website samples', () => {
  const known = new Set([...Object.keys(main), ...Object.keys(plugins)])
  const called: string[] = []
  for (const f of docFiles.filter((p) => /README\.md$|website[\\/]src[\\/]pages/.test(p))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\b([a-z][A-Za-z]*Plugin)\(/g)) {
      if (!known.has(m[1]!)) called.push(`${relative(root, f)}: ${m[1]}`)
    }
  }
  expect(called).toEqual([])
})
