import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualMasonry } from '../../src/react/components/virtual-masonry.js'
import { masonryRenderer } from '../../src/plugins/optional/masonry-renderer.js'
import { createKernel } from '../../src/kernel/kernel.js'

// An item whose height is not a finite number (an image with width 0: height / width * columnWidth) must not
// poison the column heights and the total size of the whole layout.
describe('masonry layout with unusable item heights', () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 300, configurable: true })
  })

  const data = Array.from({ length: 10 }, (_, i) => i)

  async function sizerHeight(height: (index: number) => number) {
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(
        <VirtualMasonry data={data} columns={2} gap={0} height={400}
          getItemHeight={(item) => height(item)}
          renderItem={({ item, style }) => <div style={style}>{item}</div>} />
      )
    })
    await act(async () => {})
    const px = (view.container.firstElementChild!.firstElementChild as HTMLElement).style.height
    view.unmount()
    return px
  }

  it('should lay out normally when every height is usable (control)', async () => {
    expect(await sizerHeight(() => 50)).toBe('250px')
  })

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negative', -40],
  ])('should treat a %s item height as zero in the component', async (_name, bad) => {
    // item 3 has no usable height: it takes no space, the other nine take 50 each over two columns
    expect(await sizerHeight((i) => (i === 3 ? bad : 50))).toBe('250px')
  })

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negative', -40],
  ])('should treat a %s item height as zero in the masonryRenderer plugin', (_name, bad) => {
    const kernel = createKernel({ itemCount: 4 })
    const plugin = masonryRenderer({ columns: 2, getItemHeight: (i) => (i === 1 ? bad : 50) })
    kernel.register(plugin)
    const api = plugin.api as { getTotalHeight(): number }
    // columns: [0: items 0 and 2 = 100], [1: item 1 = 0, item 3 = 50]
    expect(api.getTotalHeight()).toBe(100)
    kernel.destroy()
  })
})
