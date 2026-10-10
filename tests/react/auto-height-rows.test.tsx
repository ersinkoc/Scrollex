import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import type { Plugin } from '../../src/types.js'

// jsdom has no layout: a small CSS stand-in. A box is as high as its style.height says when that is a length, otherwise as
// high as its content (data-content); data-border is the border box measured by getBoundingClientRect
describe('rows with itemHeight="auto"', () => {
  const observers: Array<{ cb: ResizeObserverCallback; targets: Set<Element> }> = []
  const realRO = globalThis.ResizeObserver
  const realRect = Element.prototype.getBoundingClientRect

  const lengthOf = (el: HTMLElement) => (el.style.height.endsWith('px') ? parseFloat(el.style.height) : null)

  beforeEach(() => {
    observers.length = 0
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 300, configurable: true })
    Element.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const h = lengthOf(this) ?? Number(this.getAttribute('data-border') ?? this.getAttribute('data-content') ?? 0)
      const w = Number(this.getAttribute('data-border-width') ?? 300)
      return { width: w, height: h, top: 0, left: 0, right: w, bottom: h, x: 0, y: 0, toJSON() {} } as DOMRect
    }
    globalThis.ResizeObserver = class {
      entry: { cb: ResizeObserverCallback; targets: Set<Element> }
      constructor(cb: ResizeObserverCallback) { this.entry = { cb, targets: new Set() }; observers.push(this.entry) }
      observe(t: Element) { this.entry.targets.add(t) }
      unobserve(t: Element) { this.entry.targets.delete(t) }
      disconnect() { this.entry.targets.clear() }
    } as unknown as typeof ResizeObserver
  })

  afterEach(() => {
    globalThis.ResizeObserver = realRO
    Element.prototype.getBoundingClientRect = realRect
  })

  const fire = (entryFor: (el: HTMLElement) => Partial<ResizeObserverEntry>) => {
    for (const o of observers) {
      for (const t of o.targets) o.cb([{ target: t, ...entryFor(t as HTMLElement) } as ResizeObserverEntry], {} as ResizeObserver)
    }
  }
  const innerHeight = (view: ReturnType<typeof render>) => parseFloat((view.container.firstElementChild!.firstElementChild as HTMLElement).style.height)

  it('should let a row take the height of its content when it uses the style it is given', async () => {
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(
        <VirtualList data={Array.from({ length: 10 }, (_, i) => i)} itemHeight="auto" estimatedItemHeight={50} height={400} overscan={0}
          renderItem={({ item, style, measureRef }) => <div ref={measureRef} data-content={120} style={style}>{item}</div>} />
      )
    })
    for (let i = 0; i < 3; i++) {
      await act(async () => { fire((el) => ({ contentRect: { width: 300, height: lengthOf(el) ?? 120 } as DOMRectReadOnly })) })
    }

    expect(innerHeight(view)).toBe(1200)
    view.unmount()
  })

  it('should leave the height of fixed-height rows to the style', async () => {
    let seen: React.CSSProperties | undefined
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(
        <VirtualList data={[1, 2, 3]} itemHeight={60} height={400}
          renderItem={({ item, style }) => { seen ??= style; return <div style={style}>{item}</div> }} />
      )
    })

    expect(seen?.height).toBe(60)
    view.unmount()
  })

  it('should measure a padded row with its border box every time', async () => {
    const seen: number[] = []
    const spy: Plugin = {
      name: 'spy', version: '1', type: 'optional', uninstall() {},
      install(kernel) {
        const original = kernel.measureItem.bind(kernel)
        kernel.measureItem = (index, size) => { if (index === 0) seen.push(size); original(index, size) }
      },
    }
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(
        <VirtualList data={Array.from({ length: 10 }, (_, i) => i)} itemHeight="auto" estimatedItemHeight={50} height={400} overscan={0} plugins={[spy]}
          renderItem={({ item, style, measureRef }) => <div ref={measureRef} data-border={72} style={style}>{item}</div>} />
      )
    })
    await act(async () => {
      fire(() => ({ contentRect: { width: 300, height: 40 } as DOMRectReadOnly, borderBoxSize: [{ inlineSize: 300, blockSize: 72 }] }))
    })

    expect([...new Set(seen)]).toEqual([72])
    view.unmount()
  })

  it('should fall back to the element box, then to contentRect, when the entry has no border box', async () => {
    const seen: number[] = []
    const spy: Plugin = {
      name: 'spy', version: '1', type: 'optional', uninstall() {},
      install(kernel) {
        const original = kernel.measureItem.bind(kernel)
        kernel.measureItem = (index, size) => { if (index === 0) seen.push(size); original(index, size) }
      },
    }
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(
        <VirtualList data={[1, 2, 3]} itemHeight="auto" estimatedItemHeight={50} height={400} overscan={0} plugins={[spy]}
          renderItem={({ item, style, measureRef }) => <div ref={measureRef} data-border={72} style={style}>{item}</div>} />
      )
    })
    seen.length = 0
    await act(async () => { fire(() => ({ contentRect: { width: 300, height: 40 } as DOMRectReadOnly })) })

    expect([...new Set(seen)]).toEqual([72])
    view.unmount()
  })
})
