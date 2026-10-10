import * as ts from 'typescript'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..', '..')

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) sources(full, out)
    else if (/\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

const jsDocOf = (node: ts.Node): ts.JSDoc[] => (node as unknown as { jsDoc?: ts.JSDoc[] }).jsDoc ?? []

/** Exported functions without a JSDoc block of their own whose description sits on the statement just before them. */
function misattachedDocs(fileName: string, text: string): string[] {
  const file = ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX)
  const found: string[] = []
  file.statements.forEach((statement, i) => {
    const exported = ts.isFunctionDeclaration(statement) && statement.name && statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    if (!exported || jsDocOf(statement).length > 0) return
    const previous = file.statements[i - 1]
    if (previous && jsDocOf(previous).some((doc) => /@param|@returns|@example/.test(doc.getText()))) {
      found.push((statement as ts.FunctionDeclaration).name!.text)
    }
  })
  return found
}

describe('JSDoc blocks', () => {
  it('should detect a description that ended up above a helper (harness control)', () => {
    const text = [
      '/**', ' * Creates a thing.', ' * @param options - Options', ' */',
      '/** Helper state. */', 'const state = new WeakSet<object>()', '', 'export function thing(options: object) { return options }',
      '/** Documented. */', 'export function other() {}',
    ].join('\n')

    expect(misattachedDocs('control.ts', text)).toEqual(['thing'])
  })

  it('should keep the description of every exported function directly above it', () => {
    const problems = sources(join(root, 'src'))
      .flatMap((file) => misattachedDocs(file, readFileSync(file, 'utf8')).map((name) => `${file.slice(root.length + 1)}: ${name}`))

    expect(problems).toEqual([])
  })
})
