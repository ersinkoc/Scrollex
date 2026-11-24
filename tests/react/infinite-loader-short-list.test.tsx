// A list whose rows all fit its viewport gets no scroll event: the infinite loader plugin looks at the list when it is installed.
import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import { infiniteLoaderPlugin } from '../../src/plugins/core/infinite-loader.js'


beforeEach(() => {
  Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
  Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 300, configurable: true })
})
const row = ({ item, style }: { item: number; style: React.CSSProperties }) => <div style={style}>{item}</div>
const items = (n: number) => Array.from({ length: n }, (_, i) => i)

async function pluginLoads(n: number) {
  const calls: string[] = []
  const plugin = infiniteLoaderPlugin({ threshold: 200, onLoadMore: (d) => { calls.push(d) } })
  let view!: ReturnType<typeof render>
  await act(async () => { view = render(<VirtualList data={items(n)} itemHeight={50} height={400} plugins={[plugin]} renderItem={row} />) })
  await act(async () => { await Promise.resolve() })
  view.unmount()
  return calls
}


describe('infiniteLoaderPlugin on a list that fits its viewport', () => {
  it('should load forward for a short list', async () => {
    expect(await pluginLoads(6)).toEqual(['forward'])
  })

  it('should not load for a list that overflows (control)', async () => {
    expect(await pluginLoads(500)).toEqual([])
  })

  it('should load once for a plugin created inline on every render', async () => {
    const calls: string[] = []
    const element = (tick: number) => (
      <VirtualList data={items(6)} itemHeight={50} height={400} aria-label={`t${tick}`}
        plugins={[infiniteLoaderPlugin({ threshold: 200, onLoadMore: (d) => { calls.push(d) } })]} renderItem={row} />
    )
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(element(0)) })
    await act(async () => { view.rerender(element(1)) })
    await act(async () => { view.rerender(element(2)) })
    expect(calls).toEqual(['forward'])
    view.unmount()
  })

  it('should not load backward for a bidirectional loader at install', async () => {
    const calls: string[] = []
    const plugin = infiniteLoaderPlugin({ direction: 'both', threshold: 200, onLoadMore: (d) => { calls.push(d) } })
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(<VirtualList data={items(500)} itemHeight={50} height={400} plugins={[plugin]} renderItem={row} />) })
    expect(calls).toEqual([])
    view.unmount()
  })
})
