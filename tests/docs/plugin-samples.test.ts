import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = join(__dirname, '..', '..')
const CR = String.fromCharCode(13)
const LF = String.fromCharCode(10)
const BACKTICK = String.fromCharCode(96)
const read = (file: string) => readFileSync(join(root, file), 'utf8').split(CR + LF).join(LF)
const scratch = mkdtempSync(join(tmpdir(), 'scrollex-doc-samples-'))
const BACKSLASH = String.fromCharCode(92)
const srcEntry = join(root, 'src', 'index.js').split(BACKSLASH).join('/')

const DECLS = [
  'declare function trackScrollDepth(depth: number): void',
  'declare function trackVisibleItems(start: number, end: number): void',
  'declare function trackEvent(name: string): void',
  '',
].join(LF)

/** Type-check a documentation sample against the real source types. */
function typeCheck(name: string, code: string): string {
  const file = join(scratch, name)
  writeFileSync(file, DECLS + code.split("'@oxog/scrollex'").join(`'${srcEntry}'`) + LF + 'export {}' + LF)
  try {
    execFileSync(process.execPath, [
      join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      '--noEmit', '--strict', '--target', 'es2020', '--module', 'esnext', '--moduleResolution', 'bundler',
      '--skipLibCheck', '--lib', 'es2021,dom', '--jsx', 'react-jsx', file,
    ], { cwd: root, stdio: 'pipe' })
    return ''
  } catch (e) {
    return String((e as { stdout?: Buffer }).stdout ?? e).split(CR).join('')
      .split(LF).filter((line) => line.includes('error TS')).map((line) => line.slice(line.indexOf('error ') + 6)).join(' | ')
  }
}

/** The createPlugin samples embedded as code={`...`} in the website pages. */
function websiteSamples(file: string): string[] {
  const start = 'code={' + BACKTICK + 'import { createPlugin }'
  const text = read(file)
  const samples: string[] = []
  for (let from = 0; ;) {
    const begin = text.indexOf(start, from)
    if (begin < 0) break
    const bodyStart = begin + 'code={'.length + 1
    const end = text.indexOf(BACKTICK + '}', bodyStart)
    samples.push(text.slice(bodyStart, end).split(BACKSLASH + BACKTICK).join(BACKTICK))
    from = end
  }
  return samples
}

function llmsPluginSample(): string {
  const llms = read('LLMS.md')
  const fence = BACKTICK.repeat(3) + 'typescript' + LF
  const open = llms.indexOf(fence, llms.indexOf('## Creating Custom Plugins')) + fence.length
  return llms.slice(open, llms.indexOf('// Usage', open))
}

describe('custom plugin documentation samples', () => {
  it('should type-check the LLMS.md sample (harness control)', () => {
    expect(typeCheck('llms.ts', llmsPluginSample())).toBe('')
  }, 60000)

  it('should report a sample that uses fields the Plugin API does not have', () => {
    const wrongType = [
      "import { createPlugin } from '@oxog/scrollex'",
      "createPlugin({ name: 'x', version: '1.0.0', type: 'utility', install() {},",
      '  hooks: { onVisibleRangeChange(event) { trackVisibleItems(event.range.startIndex, 1) } } })',
    ].join(LF)
    const wrongTypeErrors = typeCheck('bad-type.ts', wrongType)
    expect(wrongTypeErrors).toContain('"utility"')
    expect(wrongTypeErrors).toContain("Property 'range' does not exist")

    const wrongLifecycle = [
      "import { createPlugin } from '@oxog/scrollex'",
      "createPlugin({ name: 'x', version: '1.0.0', type: 'optional', install() {}, destroy() {} })",
    ].join(LF)
    expect(typeCheck('bad-lifecycle.ts', wrongLifecycle)).toContain("'destroy' does not exist")
  }, 60000)

  it.each(['website/src/pages/Plugins.tsx', 'website/src/pages/ApiReference.tsx'])('should type-check the createPlugin sample in %s', (file) => {
    const samples = websiteSamples(file)
    expect(samples).toHaveLength(1)
    expect(typeCheck(file.split('/').pop()!.replace('.tsx', '.ts'), samples[0]!)).toBe('')
  }, 60000)
})
