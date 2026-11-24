import React from 'react'
import { render, act } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import { stickyHeaders } from '../../src/plugins/optional/sticky-headers.js'
import type { StickyHeadersAPI } from '../../src/plugins/optional/sticky-headers.js'

const root = join(__dirname, '..', '..')
const read = (file: string) => readFileSync(join(root, file), 'utf8')

// What the documentation says a plugin does has to be what it does
describe('stickyHeaders', () => {
  const tops = new WeakMap<object, number>()
  let queue: Array<FrameRequestCallback | null> = []
  const realRaf = globalThis.requestAnimationFrame
  const realCancel = globalThis.cancelAnimationFrame

  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 300, configurable: true })
    Object.defineProperty(Element.prototype, 'scrollTop', { get() { return tops.get(this) ?? 0 }, set(v: number) { tops.set(this, v) }, configurable: true })
    queue = []
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { queue.push(cb); return queue.length }) as typeof requestAnimationFrame
    globalThis.cancelAnimationFrame = ((id: number) => { queue[id - 1] = null }) as typeof cancelAnimationFrame
  })

  afterEach(() => {
    globalThis.requestAnimationFrame = realRaf
    globalThis.cancelAnimationFrame = realCancel
  })

  const flush = () => { for (let i = 0; i < 3; i++) { const q = queue; queue = []; q.forEach((cb) => cb?.(performance.now())) } }
  const items = Array.from({ length: 200 }, (_, i) => ({ type: i % 20 === 0 ? 'header' : 'item', group: String(Math.floor(i / 20)), i }))

  it('should track the current header but leave pinning to the application', async () => {
    const plugin = stickyHeaders({ headerHeight: 40, isHeader: (i) => items[i]!.type === 'header', getGroupId: (i) => items[i]!.group })
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(
        <VirtualList data={items} itemHeight={40} height={400} plugins={[plugin]}
          renderItem={({ item, style }) => <div style={style} data-row={item.i}>{item.i}</div>} />
      )
    })
    const list = view.container.querySelector('[role="listbox"]') as HTMLElement

    await act(async () => { tops.set(list, 3000); list.dispatchEvent(new Event('scroll')); flush() })
    await act(async () => { flush() })

    expect((plugin.api as StickyHeadersAPI).getCurrentStickyHeader()).toBe(60)
    expect(view.container.querySelector('[data-row="60"]')).toBeNull() // nothing keeps the header row on screen
    view.unmount()
  })

  it('should not be documented as pinning headers on its own', () => {
    const pages = ['LLMS.md', 'README.md', 'website/src/pages/Plugins.tsx', 'website/src/pages/Home.tsx', 'website/src/pages/GettingStarted.tsx']
    const claim = /(headers?[^.\n]{0,60}(remain|stay|stick|kept?) (visible|on scroll|pinned))|(keep group headers visible)|(sticky group headers that remain)/i

    expect(pages.filter((page) => claim.test(read(page)))).toEqual([])
  })
})

describe('bidirectional', () => {
  it('should not be described as horizontal scrolling on the home page', () => {
    const line = read('website/src/pages/Home.tsx').split('\n').find((l) => l.includes("name: 'Bidirectional'")) ?? ''

    expect(line).not.toBe('')
    expect(line).not.toMatch(/horizontal/i)
  })
})

describe('bidirectional prepend', () => {
  it('should not be documented as keeping the position when items are prepended', () => {
    const pages = ['LLMS.md', 'README.md', 'website/src/pages/Plugins.tsx', 'website/src/pages/Home.tsx', 'website/src/pages/GettingStarted.tsx']
    const claim = /(keeps?|maintains?) (the )?(scroll )?position (when|on) (items are )?prepend/i

    expect(pages.filter((page) => claim.test(read(page)))).toEqual([])
  })

  it('should leave the reader where the scroll offset is until adjustForPrepend is called', () => {
    // documents the behaviour the docs describe: the option is declared, not implemented
    const source = read('src/plugins/optional/bidirectional.ts')
    expect(source).toMatch(/Declared, not implemented yet/)
  })
})
