import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualMasonry } from '../../src/react/components/virtual-masonry.js'
import { VirtualGrid } from '../../src/react/components/virtual-grid.js'
import { getContentWidth } from '../../src/utils/rect.js'

// The inner element is width:100% of the container's content box, so padding on the scroll container is not available to
// the columns: they used to be sized from clientWidth (padding box), and the masonry also flipped between that and
// the ResizeObserver's contentRect.
describe('columns in a container with padding', () => {
  const realRO = globalThis.ResizeObserver
  class DeliveringObserver {
    constructor(private cb: ResizeObserverCallback) {}
    observe(target: Element) {
      const el = target as HTMLElement
      const pad = (parseFloat(el.style.paddingLeft) || 0) + (parseFloat(el.style.paddingRight) || 0)
      this.cb([{ target, contentRect: { width: 332 - pad, height: 400 } as DOMRectReadOnly } as ResizeObserverEntry], this as unknown as ResizeObserver)
    }
    unobserve() {}
    disconnect() {}
  }
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 332, configurable: true })
    globalThis.ResizeObserver = DeliveringObserver as unknown as typeof ResizeObserver
  })
  afterEach(() => { globalThis.ResizeObserver = realRO })

  const data = (n: number) => Array.from({ length: n }, (_, i) => i)
  const widths = (c: HTMLElement) => [...new Set([...c.querySelectorAll('[data-w]')].map((e) => (e as HTMLElement).style.width))]

  const masonry = (n: number, padding: number) => (
    <VirtualMasonry data={data(n)} columns={2} gap={0} height={400} style={{ padding }} getItemHeight={() => 50}
      renderItem={({ style }) => <div style={style} data-w />} />
  )

  async function mountThenGrow(padding: number) {
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(masonry(10, padding)) })
    const atMount = widths(view.container)
    await act(async () => { view.rerender(masonry(20, padding)) })
    const afterGrow = widths(view.container)
    view.unmount()
    return { atMount, afterGrow }
  }

  async function gridWidths(padding: number) {
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(<VirtualGrid data={data(10)} columns={2} gap={0} itemHeight={50} height={400} style={{ padding }} renderItem={({ style }) => <div style={style} data-w />} />)
    })
    const w = widths(view.container)
    view.unmount()
    return w
  }

  it('should use the whole width without padding (control)', async () => {
    expect(await mountThenGrow(0)).toEqual({ atMount: ['166px'], afterGrow: ['166px'] })
    expect(await gridWidths(0)).toEqual(['166px'])
  })

  it('should keep the masonry columns at the content width when the data grows', async () => {
    expect(await mountThenGrow(16)).toEqual({ atMount: ['150px'], afterGrow: ['150px'] })
  })

  it('should size the grid columns from the content width', async () => {
    expect(await gridWidths(16)).toEqual(['150px'])
  })

  it('should compute the content width as clientWidth minus horizontal padding', () => {
    const el = document.createElement('div')
    document.body.appendChild(el) // computed style needs an element in the document
    Object.defineProperty(el, 'clientWidth', { get: () => 332, configurable: true })
    expect(getContentWidth(el)).toBe(332)
    el.style.padding = '16px'
    expect(getContentWidth(el)).toBe(300)
    el.style.padding = '0 40px'
    expect(getContentWidth(el)).toBe(252)
    el.style.padding = '0 400px'
    expect(getContentWidth(el)).toBe(0)
    el.remove()
  })
})
