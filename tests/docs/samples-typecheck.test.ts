import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..', '..')
const LF = String.fromCharCode(10)
const CR = String.fromCharCode(13)
const BACKTICK = String.fromCharCode(96)
const BACKSLASH = String.fromCharCode(92)
// inside the repo (not the OS temp dir) so that 'react' resolves from node_modules
const out = join(root, 'node_modules', '.cache', 'scrollex-docs-samples')
const read = (file: string) => readFileSync(join(root, file), 'utf8').split(CR + LF).join(LF)

/** The code={`...`} samples embedded in a website page. */
function websiteSamples(file: string): string[] {
  const text = read(file)
  const samples: string[] = []
  for (let from = 0; ;) {
    const begin = text.indexOf('code={' + BACKTICK, from)
    if (begin < 0) break
    const start = begin + 'code={'.length + 1
    const end = text.indexOf(BACKTICK + '}', start)
    samples.push(text.slice(start, end).split(BACKSLASH + BACKTICK).join(BACKTICK).split(BACKSLASH + '$').join('$'))
    from = end
  }
  return samples
}

/** The ts / tsx fenced blocks of a markdown file. */
function fencedSamples(file: string): string[] {
  const text = read(file)
  const fence = BACKTICK.repeat(3)
  const samples: string[] = []
  for (let from = 0; ;) {
    const begin = text.indexOf(fence, from)
    if (begin < 0) break
    const eol = text.indexOf(LF, begin)
    const lang = text.slice(begin + 3, eol).trim()
    const end = text.indexOf(LF + fence, eol)
    if (end < 0) break
    if (lang === 'tsx' || lang === 'ts' || lang === 'typescript') samples.push(text.slice(eol + 1, end))
    from = end + 1 + fence.length
  }
  return samples
}

// Samples are fragments: unresolved names, implicit any and unknown data are expected, wrong API use is not
const FRAGMENT_NOISE = /TS2304|TS2552|TS2503|TS2582|TS2584|TS2686|TS6133|TS7006|TS7031|TS2451|TS2300|TS2393|TS2307|TS18004|TS7005|TS2448|TS2454|TS7034|TS18046/

function runTsc(names: string[]): string {
  try {
    execFileSync(process.execPath, [
      join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      '--noEmit', '--strict', '--target', 'es2020', '--module', 'esnext', '--moduleResolution', 'bundler',
      '--skipLibCheck', '--lib', 'es2021,dom', '--jsx', 'react-jsx', ...names.map((name) => join(out, name)),
    ], { cwd: root, stdio: 'pipe' })
    return ''
  } catch (e) {
    return String((e as { stdout?: Buffer }).stdout ?? e).split(CR).join('')
  }
}

/** Type errors (beyond fragment noise) of samples that import the package; samples that don't parse are skipped. */
function problemsIn(samples: Array<[string, string]>): { problems: string[]; skipped: number } {
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  const labels = new Map<string, string>()
  samples.forEach(([label, code], i) => {
    if (!code.includes('@oxog/scrollex')) return
    const name = `sample${i}.tsx`
    labels.set(name, label)
    const body = code.split("'@oxog/scrollex/plugins'").join("'../../../src/plugins/index.js'").split("'@oxog/scrollex'").join("'../../../src/index.js'")
    writeFileSync(join(out, name), `import React from "react"${LF}${body}${LF}export {}${LF}`)
  })
  const fileOf = (line: string) => line.slice(line.lastIndexOf('/', line.indexOf('(')) + 1, line.indexOf('('))
  // tsc reports only syntax errors while any file has one: find those files first, then check the rest
  const unparsable = new Set(runTsc([...labels.keys()]).split(LF).filter((line) => /error TS1[0-9][0-9][0-9]:/.test(line)).map(fileOf))
  const output = runTsc([...labels.keys()].filter((name) => !unparsable.has(name)))
  const problems = output.split(LF).filter((line) => line.includes('error TS') && !FRAGMENT_NOISE.test(line))
    .map((line) => `${labels.get(fileOf(line))}: ${line.slice(line.indexOf('error ') + 6, line.indexOf('error ') + 150)}`)
  return { problems, skipped: unparsable.size }
}

/** The fenced @example blocks of the JSDoc comments in src, as complete fragments (JSX wrapped, common names imported). */
function jsdocSamples(): Array<[string, string]> {
  const samples: Array<[string, string]> = []
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full, out)
      else if (/\.tsx?$/.test(entry)) out.push(full)
    }
    return out
  }
  const fence = BACKTICK.repeat(3)
  for (const file of walk(join(root, 'src'))) {
    const text = readFileSync(file, 'utf8').split(CR + LF).join(LF)
    for (let from = 0; ;) {
      const example = text.indexOf('@example', from)
      if (example < 0) break
      const begin = text.indexOf(fence, example)
      if (begin < 0 || begin > text.indexOf('*/', example)) { from = example + 8; continue }
      const eol = text.indexOf(LF, begin)
      const end = text.indexOf(fence, eol + 1)
      const lines = text.slice(eol + 1, end).split(LF).map((line) => line.replace(/^\s*\* ?/, ''))
      const firstJsx = lines.findIndex((line) => line.startsWith('<'))
      const placeholder = 'renderItem={...}'
      const body = firstJsx < 0
        ? lines.join(LF)
        : lines.slice(0, firstJsx).join(LF) + LF + 'const element = (' + LF + lines.slice(firstJsx).join(LF) + LF + ')' + LF + 'void element'
      const prelude = "import { useState, useMemo, useRef } from 'react'" + LF + "import { VirtualList, VirtualGrid, VirtualMasonry } from '@oxog/scrollex'" + LF
      samples.push([`${file.slice(root.length + 1).split(String.fromCharCode(92)).join('/')}:${text.slice(0, example).split(LF).length}`, prelude + body.split(placeholder).join('renderItem={() => null}')])
      from = end
    }
  }
  return samples
}

describe('documentation samples', () => {
  it('should report API that the package does not have (harness control)', () => {
    const { problems } = problemsIn([
      ['bad.md', "import { easings, VirtualList } from '@oxog/scrollex'" + LF +
        'easings.easeInQuart' + LF +
        'const list = <VirtualList data={[1]} itemHeight={(i) => 50} renderItem={() => null} />'],
      ['good.md', "import { easings } from '@oxog/scrollex'" + LF + 'easings.easeInCubic'],
    ])
    expect(problems.some((p) => p.startsWith('bad.md') && p.includes('easeInQuart'))).toBe(true)
    expect(problems.some((p) => p.startsWith('bad.md') && p.includes("'number | \"auto\"'"))).toBe(true)
    expect(problems.filter((p) => p.startsWith('good.md'))).toEqual([])
  }, 120000)

  it('should only use API the package has in README, LLMS and the website pages', () => {
    const samples: Array<[string, string]> = []
    for (const page of readdirSync(join(root, 'website', 'src', 'pages'))) {
      websiteSamples(`website/src/pages/${page}`).forEach((code, i) => samples.push([`website/src/pages/${page} #${i}`, code]))
    }
    for (const file of ['README.md', 'LLMS.md']) {
      fencedSamples(file).forEach((code, i) => samples.push([`${file} #${i}`, code]))
    }

    const { problems, skipped } = problemsIn(samples)
    expect(samples.length).toBeGreaterThan(40) // the extraction itself still works
    expect(skipped).toBeLessThan(10)
    expect(problems).toEqual([])
  }, 300000)

  it('should report a JSDoc example that uses props the component does not have (harness control)', () => {
    const { problems } = problemsIn([
      ['old-drag-example.ts:1', "import { useState } from 'react'" + LF + "import { VirtualList } from '@oxog/scrollex'" + LF +
        'const element = (' + LF +
        '<VirtualList data={[1]} plugins={[]} renderItem={({ item, index, dragHandleProps }) => <div {...dragHandleProps}>{item}</div>} />' + LF + ')' + LF + 'void element'],
    ])
    expect(problems.some((p) => p.includes("'dragHandleProps' does not exist"))).toBe(true)
    expect(problems.some((p) => p.includes("'itemHeight' is missing"))).toBe(true)
  }, 120000)

  it('should only use API the package has in the @example blocks of the source comments', () => {
    const samples = jsdocSamples()
    const { problems, skipped } = problemsIn(samples)
    expect(samples.length).toBeGreaterThan(10) // the extraction itself still works
    expect(skipped).toBe(0)
    expect(problems).toEqual([])
  }, 300000)
})
