import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = join(__dirname, '..', '..')
const LF = String.fromCharCode(10)
const CR = String.fromCharCode(13)
const BACKTICK = String.fromCharCode(96)
const BACKSLASH = String.fromCharCode(92)
const FENCE = BACKTICK.repeat(3)
const normalize = (text: string) => text.split(CR + LF).join(LF)

interface Member {
  optional: boolean
  /** The text after the name and the optional marker */
  rest: string
}

interface ParsedInterface {
  body: string
  hasExtends: boolean
  file: string
}

/** The members declared at the top level of an interface body. */
function parseMembers(body: string): Map<string, Member> {
  const members = new Map<string, Member>()
  let depth = 0
  for (const line of body.split(LF)) {
    if (depth === 0) {
      const match = /^\s*(?:readonly\s+)?([A-Za-z_]\w*|'[^']+')(\??)\s*([:(<].*)$/.exec(line)
      if (match) {
        const comment = match[3]!.indexOf('//')
        members.set(match[1]!.split("'").join(''), {
          optional: match[2] === '?',
          rest: (comment >= 0 ? match[3]!.slice(0, comment) : match[3]!).trim(),
        })
      }
    }
    depth += (line.match(/[{([]/g) ?? []).length - (line.match(/[})\]]/g) ?? []).length
    if (depth < 0) depth = 0
  }
  return members
}

/** Every `interface Name { ... }` in a text, by name (the first declaration wins). */
function interfacesIn(text: string, file: string): Map<string, ParsedInterface> {
  const found = new Map<string, ParsedInterface>()
  const pattern = /interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+[^{]+)?\s*\{/g
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    let depth = 1
    let i = pattern.lastIndex
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') depth--
      i++
    }
    if (!found.has(match[1]!)) {
      found.set(match[1]!, { body: text.slice(pattern.lastIndex, i - 1), hasExtends: /extends/.test(match[0]), file })
    }
  }
  return found
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) sourceFiles(full, out)
    else if (/\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

function markdownBlocks(markdown: string): string[] {
  const blocks: string[] = []
  for (let from = 0; ;) {
    const begin = markdown.indexOf(FENCE, from)
    if (begin < 0) break
    const eol = markdown.indexOf(LF, begin)
    const end = markdown.indexOf(LF + FENCE, eol)
    if (end < 0) break
    blocks.push(markdown.slice(eol + 1, end))
    from = end + 1 + FENCE.length
  }
  return blocks
}

/** The code={`...`} samples embedded in a website page. */
function pageBlocks(page: string): string[] {
  const text = normalize(page)
  const blocks: string[] = []
  for (let from = 0; ;) {
    const begin = text.indexOf('code={' + BACKTICK, from)
    if (begin < 0) break
    const start = begin + 'code={'.length + 1
    const end = text.indexOf(BACKTICK + '}', start)
    blocks.push(text.slice(start, end).split(BACKSLASH + BACKTICK).join(BACKTICK))
    from = end
  }
  return blocks
}

function collect(blocks: string[], file: string): Map<string, ParsedInterface> {
  const all = new Map<string, ParsedInterface>()
  for (const block of blocks) {
    for (const [name, parsed] of interfacesIn(block, file)) if (!all.has(name)) all.set(name, parsed)
  }
  return all
}

const sourceInterfaces = new Map<string, ParsedInterface>()
const aliases = new Map<string, string>()
for (const file of sourceFiles(join(root, 'src'))) {
  const text = normalize(readFileSync(file, 'utf8'))
  for (const [name, parsed] of interfacesIn(text, relative(root, file))) {
    if (!sourceInterfaces.has(name)) sourceInterfaces.set(name, parsed)
  }
  for (const match of text.matchAll(/export type (\w+)\s*=\s*((?:[^\n]*\n\s*\|[^\n]*)*[^\n]*)/g)) {
    if (!aliases.has(match[1]!)) aliases.set(match[1]!, match[2]!)
  }
}

/** The sorted values of a type made only of string literals (an alias is resolved), else null. */
function literalValues(type: string): string | null {
  let text = type.replace(/^[:?]\s*/, '').trim()
  if (/^[A-Za-z]\w*$/.test(text) && aliases.has(text)) text = aliases.get(text)!
  const values = [...text.matchAll(/'([^']+)'/g)].map((match) => match[1]!)
  const rest = text.replace(/'[^']+'/g, '').replace(/[|\s]/g, '')
  return rest === '' && values.length ? values.sort().join('|') : null
}

/**
 * Differences between documented interfaces and the source ones: documented members that do not exist,
 * different optionality, different string values and, when `complete`, real members that are not documented.
 */
function differences(documented: Map<string, ParsedInterface>, source: Map<string, ParsedInterface>, complete: boolean): string[] {
  const report: string[] = []
  for (const [name, doc] of documented) {
    const src = source.get(name)
    if (!src) {
      report.push(`${name}: documented but not in src`)
      continue
    }
    const docMembers = parseMembers(doc.body)
    const srcMembers = parseMembers(src.body)
    for (const [member, documentedMember] of docMembers) {
      const real = srcMembers.get(member)
      if (!real) {
        report.push(`${name}.${member}: documented but not in src`)
        continue
      }
      if (documentedMember.optional !== real.optional) {
        report.push(`${name}.${member}: documented ${documentedMember.optional ? 'optional' : 'required'}, src ${real.optional ? 'optional' : 'required'}`)
      }
      const documentedValues = documentedMember.rest.startsWith(':') ? literalValues(documentedMember.rest) : null
      const realValues = real.rest.startsWith(':') ? literalValues(real.rest) : null
      if (documentedValues && realValues && documentedValues !== realValues) {
        report.push(`${name}.${member}: documented values ${documentedValues}, src ${realValues}`)
      }
    }
    if (complete && !src.hasExtends) {
      const undocumented = [...srcMembers.keys()].filter((member) => !docMembers.has(member))
      if (undocumented.length) report.push(`${name} (${src.file}): undocumented ${JSON.stringify(undocumented)}`)
    }
  }
  return report
}

describe('documented interfaces', () => {
  it('should report documented members, optionality and values that differ from src (harness control)', () => {
    const documented = interfacesIn([
      'interface ListRendererAPI {',
      '  getVirtualItems(): VirtualItem[]',
      '  getItemAtOffset(offset: number): VirtualItem | null',
      '}',
      'interface Plugin {',
      '  name: string',
      "  type?: 'renderer' | 'utility'",
      '  install?: (kernel: Kernel) => void',
      '}',
    ].join(LF), 'synthetic')
    const report = differences(documented, sourceInterfaces, true)
    expect(report).toContain('ListRendererAPI.getItemAtOffset: documented but not in src')
    expect(report.some((line) => line.startsWith('ListRendererAPI (') && line.includes('"getTotalHeight"'))).toBe(true)
    expect(report).toContain('Plugin.type: documented optional, src required')
    expect(report).toContain('Plugin.type: documented values renderer|utility, src core|optional')
    expect(report).toContain('Plugin.install: documented optional, src required')
    expect(differences(interfacesIn('interface Nope {\n  a: number\n}', 'synthetic'), sourceInterfaces, true)).toEqual(['Nope: documented but not in src'])
  })

  it('should document every interface member of LLMS.md that exists, and only those', () => {
    const documented = collect(markdownBlocks(normalize(readFileSync(join(root, 'LLMS.md'), 'utf8'))), 'LLMS.md')

    expect(documented.size).toBeGreaterThan(40) // the extraction itself still works
    expect(differences(documented, sourceInterfaces, true)).toEqual([])
  })

  it('should only document members of the website pages the way src declares them', () => {
    const pagesDir = join(root, 'website', 'src', 'pages')
    let compared = 0
    const report: string[] = []
    for (const page of readdirSync(pagesDir)) {
      const documented = collect(pageBlocks(readFileSync(join(pagesDir, page), 'utf8')), page)
      compared += documented.size
      report.push(...differences(documented, sourceInterfaces, false).map((line) => `${page}: ${line}`))
    }

    expect(compared).toBeGreaterThan(8) // the extraction itself still works
    expect(report).toEqual([])
  })
})
