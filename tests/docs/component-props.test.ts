import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..', '..')
const LF = String.fromCharCode(10)
const BACKSLASH = String.fromCharCode(92)
// inside the repo (not the OS temp dir) so that 'react' resolves from node_modules
const cache = join(root, 'node_modules', '.cache')
mkdirSync(cache, { recursive: true })
const scratch = mkdtempSync(join(cache, 'scrollex-component-props-'))
const srcEntry = join(root, 'src', 'index.js').split(BACKSLASH).join('/')

/** Compile a JSX snippet against the real component types; returns the compiler errors. */
function typeCheck(name: string, body: string): string {
  const file = join(scratch, name)
  writeFileSync(file, `import React from 'react'${LF}import { VirtualList, VirtualGrid, VirtualMasonry, useVirtualGrid, useVirtualList } from '${srcEntry}'${LF}${body}${LF}export {}${LF}`)
  try {
    execFileSync(process.execPath, [
      join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      '--noEmit', '--strict', '--target', 'es2020', '--module', 'esnext', '--moduleResolution', 'bundler',
      '--skipLibCheck', '--lib', 'es2021,dom', '--jsx', 'react-jsx', file,
    ], { cwd: root, stdio: 'pipe' })
    return ''
  } catch (e) {
    return String((e as { stdout?: Buffer }).stdout ?? e)
  }
}

const grid = (props: string) => `const g = <VirtualGrid data={[1]} columns={2} itemHeight={50} renderItem={() => null} ${props} />`
const masonry = (props: string) => `const m = <VirtualMasonry data={[1]} columns={2} getItemHeight={() => 50} renderItem={() => null} ${props} />`

describe('component prop types', () => {
  it('should accept the shared props on VirtualList, VirtualGrid and VirtualMasonry', () => {
    const shared = 'overscan={3} getItemKey={(i) => i} onLoadMore={() => {}} hasMore isLoading threshold={100} plugins={[]} className="a" height={100} width={100}'
    expect(typeCheck('shared-grid.tsx', grid(shared))).toBe('')
    expect(typeCheck('shared-masonry.tsx', masonry(shared))).toBe('')
    expect(typeCheck('shared-list.tsx', `const l = <VirtualList data={[1]} itemHeight={50} direction="horizontal" renderItem={() => null} ${shared} />`)).toBe('')
  }, 60000)

  it.each([
    ['direction="horizontal"', "'direction' does not exist"],
    ['estimatedItemHeight={80}', "'estimatedItemHeight' does not exist"],
  ])('should reject %s on VirtualGrid and VirtualMasonry, which ignore it', (prop, message) => {
    expect(typeCheck('ignored-grid.tsx', grid(prop))).toContain(message)
    expect(typeCheck('ignored-masonry.tsx', masonry(prop))).toContain(message)
  }, 60000)
})

describe('hook option types', () => {
  const gridHook = (extra: string) =>
    `function G() { const ref = React.useRef<HTMLDivElement>(null); useVirtualGrid({ count: 10, columns: 2, rowHeight: 50, containerRef: ref, ${extra} }) }`
  const listHook = (extra: string) =>
    `function L() { const ref = React.useRef<HTMLDivElement>(null); useVirtualList({ count: 10, containerRef: ref, ${extra} }) }`

  it('should accept the options useVirtualGrid reads, and the list options on useVirtualList (control)', () => {
    expect(typeCheck('hook-grid-control.tsx', gridHook('overscan: 3, initialOffset: 10, gap: 4, minColumnWidth: 80'))).toBe('')
    expect(typeCheck('hook-list-control.tsx', listHook('horizontal: true, estimatedItemHeight: 50, paddingStart: 4, paddingEnd: 4, scrollMargin: 2'))).toBe('')
  }, 60000)

  it.each([
    'estimatedItemHeight: 80',
    'horizontal: true',
    'paddingStart: 8',
    'paddingEnd: 8',
    'scrollMargin: 4',
  ])('should reject %s on useVirtualGrid, which ignores it', (option) => {
    const name = option.split(':')[0]
    expect(typeCheck(`hook-grid-${name}.tsx`, gridHook(option))).toContain(`'${name}' does not exist`)
  }, 60000)
})

describe('kernel event subscription types', () => {
  const kernelSnippet = (body: string) =>
    `import { createKernel } from '${srcEntry}'${LF}import type { ScrollEvent } from '${srcEntry}'${LF}const kernel = createKernel({ itemCount: 10 })${LF}${body}`

  it('should hand each handler the payload of the event it subscribed to', () => {
    const body = [
      "kernel.on('scroll', (e) => { console.log(e.scrollTop, e.deltaY, e.direction) })",
      "kernel.on('scroll-start', (e) => { console.log(e.scrollLeft) })",
      "kernel.on('scroll-end', (e) => { console.log(e.timestamp) })",
      "kernel.on('visible-range-change', (e) => { console.log(e.range.endIndex, e.previousRange) })",
      "kernel.on('item-measured', (e) => { console.log(e.index, e.height, e.previousHeight) })",
      "kernel.on('items-change', (e) => { console.log(e.count, e.previousCount) })",
    ].join(LF)
    expect(typeCheck('kernel-on.ts', kernelSnippet(body))).toBe('')
  }, 60000)

  it('should reject a field of another event and keep the explicit type argument working', () => {
    expect(typeCheck('kernel-on-wrong.ts', kernelSnippet("kernel.on('scroll', (e) => { console.log(e.count) })"))).toContain("'count' does not exist")
    const compat = [
      "kernel.on<ScrollEvent>('scroll', (e) => { console.log(e.scrollTop) })",
      "const handler = (e: ScrollEvent) => { console.log(e.scrollTop) }",
      "kernel.on('scroll', handler)()",
      "kernel.off('scroll', handler)",
    ].join(LF)
    expect(typeCheck('kernel-on-compat.ts', kernelSnippet(compat))).toBe('')
  }, 60000)
})
