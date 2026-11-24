// The website Layout is not rendered by the package tests; scan its source: every button and link needs an accessible
// name (aria-label or visible text). Icon-only controls (mobile menu, GitHub icons) used to have none.
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const file = join(__dirname, '..', '..', 'website', 'src', 'components', 'Layout.tsx')
const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

const tagName = (n: ts.JsxElement) => n.openingElement.tagName.getText(sf)
const hasAttr = (n: ts.JsxElement, name: string) =>
  n.openingElement.attributes.properties.some((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === name)
const isJsxLike = (n: ts.Node): boolean => ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)
function hasText(node: ts.Node): boolean {
  let found = false
  const visit = (n: ts.Node) => {
    if (found) return
    if (ts.isJsxText(n) && n.text.trim() !== '') { found = true; return }
    if (ts.isJsxExpression(n) && n.expression) {
      const e = n.expression
      const iconOnly = (x: ts.Expression): boolean =>
        isJsxLike(x) || (ts.isConditionalExpression(x) && iconOnly(x.whenTrue) && iconOnly(x.whenFalse)) || (ts.isParenthesizedExpression(x) && iconOnly(x.expression))
      if (!iconOnly(e) && !ts.isJsxExpression(e)) {
        // {' '} spacer or a string/identifier/property = text-like
        if (!(ts.isStringLiteral(e) && e.text.trim() === '')) { found = true; return }
      }
    }
    ts.forEachChild(n, visit)
  }
  if (ts.isJsxElement(node)) node.children.forEach(visit)
  return found
}

it('should give every button and link in the website Layout an accessible name', () => {
  const unnamed: string[] = []
  const named: string[] = []
  const visit = (n: ts.Node) => {
    if (ts.isJsxElement(n) && ['button', 'a', 'Link'].includes(tagName(n))) {
      const label = `${tagName(n)}@line${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`
      ;(hasAttr(n, 'aria-label') || hasText(n) ? named : unnamed).push(label)
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  expect(named.length).toBeGreaterThanOrEqual(4) // control: nav links and the desktop GitHub link are named
  expect(unnamed).toEqual([])
})
