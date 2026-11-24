import * as ts from 'typescript'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..', '..')
const BACKSLASH = String.fromCharCode(92)
const norm = (file: string) => file.split(BACKSLASH).join('/')

/**
 * Names of the src types that appear in the signatures of the values exported from the package entry points
 * but cannot be imported from an entry point themselves.
 */
function unreachableSignatureTypes(entryFiles: string[], srcMarker: string): string[] {
  const program = ts.createProgram(entryFiles, {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX, strict: true, skipLibCheck: true, noEmit: true,
  })
  const checker = program.getTypeChecker()
  const resolve = (symbol: ts.Symbol): ts.Symbol => (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol)
  const reachable = new Set<ts.Symbol>()
  const values: ts.Symbol[] = []
  for (const entry of entryFiles) {
    const file = program.getSourceFile(entry)!
    for (const exported of checker.getExportsOfModule(checker.getSymbolAtLocation(file)!)) {
      const target = resolve(exported)
      reachable.add(target)
      if (target.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Variable | ts.SymbolFlags.Class)) values.push(target)
    }
  }

  const inSrc = (symbol: ts.Symbol) => (symbol.declarations ?? []).some((d) => norm(d.getSourceFile().fileName).includes(srcMarker))
  const found = new Set<string>()
  const seen = new Set<ts.Type>()
  const visit = (type: ts.Type | undefined, depth: number): void => {
    if (!type || depth > 5 || seen.has(type)) return
    seen.add(type)
    const symbol = type.aliasSymbol ?? type.symbol
    if (symbol && inSrc(symbol) && symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Class) && !reachable.has(symbol)) {
      found.add(symbol.name)
    }
    if (type.isUnionOrIntersection()) type.types.forEach((t) => visit(t, depth + 1))
    if (type.flags & ts.TypeFlags.Object && (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) {
      checker.getTypeArguments(type as ts.TypeReference).forEach((t) => visit(t, depth + 1))
    }
    for (const signature of type.getCallSignatures()) {
      signature.getParameters().forEach((p) => visit(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? p.declarations![0]!), depth + 1))
      visit(signature.getReturnType(), depth + 1)
    }
    if (type.flags & ts.TypeFlags.Object) {
      for (const property of type.getProperties()) {
        const declaration = property.valueDeclaration ?? property.declarations?.[0]
        if (declaration) visit(checker.getTypeOfSymbolAtLocation(property, declaration), depth + 1)
      }
    }
  }
  for (const value of values) {
    const declaration = value.valueDeclaration ?? value.declarations?.[0]
    if (declaration) visit(checker.getTypeOfSymbolAtLocation(value, declaration), 0)
  }
  return [...found].sort()
}

describe('package entry points', () => {
  it('should find a type that is used in a signature but not exported (harness control)', () => {
    const dir = join(root, 'node_modules', '.cache', 'scrollex-entry-control')
    mkdirSync(dir, { recursive: true })
    const entry = join(dir, 'entry.ts')
    writeFileSync(entry, "export { useMeasure } from '../../../src/react/hooks/use-measure.js'" + String.fromCharCode(10))

    expect(unreachableSignatureTypes([entry], '/src/')).toEqual(['UseMeasureOptions', 'UseMeasureReturn'])
  }, 120000)

  it('should export every type that the signatures of exported values mention', () => {
    const missing = unreachableSignatureTypes([join(root, 'src', 'index.ts'), join(root, 'src', 'plugins', 'index.ts')], '/src/')

    expect(missing).toEqual([])
  }, 120000)
})
