import React, { useRef } from 'react'
import { render, act } from '@testing-library/react'
import { useVirtualMasonry } from '../../src/react/hooks/use-virtual-masonry.js'

// The hook's column heights end with each column's last item (no gap after it), like the total size.
describe('useVirtualMasonry columnHeights', () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 320, configurable: true })
  })

  async function heightsFor(count: number) {
    let result: { columnHeights: number[]; totalSize: number } = { columnHeights: [], totalSize: -1 }
    function Probe() {
      const ref = useRef<HTMLDivElement>(null)
      const m = useVirtualMasonry({ count, columns: 3, gap: 10, getItemHeight: () => 100, containerRef: ref })
      result = { columnHeights: m.columnHeights, totalSize: m.totalSize }
      return <div ref={ref} style={{ height: 400, overflow: 'auto' }} />
    }
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(<Probe />) })
    await act(async () => {})
    view.unmount()
    return result
  }

  it('should end each column at its last item', async () => {
    expect(await heightsFor(9)).toEqual({ columnHeights: [320, 320, 320], totalSize: 320 })
  })

  it('should report an empty column as 0', async () => {
    expect(await heightsFor(2)).toEqual({ columnHeights: [100, 100, 0], totalSize: 100 })
  })
})
