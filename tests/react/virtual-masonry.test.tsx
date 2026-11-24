import React, { Profiler, useRef } from 'react'
import { render, renderHook, act } from '@testing-library/react'
import { VirtualMasonry } from '../../src/react/components/virtual-masonry.js'
import { useVirtualMasonry } from '../../src/react/hooks/use-virtual-masonry.js'

type Item = { id: number; h: number }

const makeItems = (count: number, h: number): Item[] =>
  Array.from({ length: count }, (_, i) => ({ id: i, h }))

describe('VirtualMasonry render stability', () => {
  // Bounded so a layout loop fails the test instead of exhausting the worker's memory
  const CALL_BUDGET = 5000
  let calls = 0
  let savedWidth: PropertyDescriptor
  let savedHeight: PropertyDescriptor

  beforeEach(() => {
    calls = 0
    savedWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')!
    savedHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 600, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(Element.prototype, 'clientWidth', savedWidth)
    Object.defineProperty(Element.prototype, 'clientHeight', savedHeight)
  })

  function Masonry({ data, onCommit = () => {} }: { data: Item[]; onCommit?: () => void }) {
    return (
      <Profiler id="masonry" onRender={onCommit}>
        <VirtualMasonry
          data={data}
          columns={2}
          height={600}
          getItemHeight={(item: Item) => {
            if (++calls > CALL_BUDGET) throw new Error('runaway layout loop')
            return item.h
          }}
          renderItem={({ item, style }) => (
            <div data-testid={`item-${item.id}`} style={style}>
              {item.id}
            </div>
          )}
        />
      </Profiler>
    )
  }

  it('should settle after mount despite an inline getItemHeight', () => {
    let commits = 0
    act(() => {
      render(<Masonry data={makeItems(10, 100)} onCommit={() => { commits++ }} />)
    })

    expect(commits).toBeLessThanOrEqual(10)
  })

  it('should re-layout when data changes without changing length', () => {
    const { getByTestId, rerender } = render(<Masonry data={makeItems(4, 100)} />)
    expect(getByTestId('item-0').style.height).toBe('100px')

    act(() => {
      rerender(<Masonry data={makeItems(4, 250)} />)
    })

    expect(getByTestId('item-0').style.height).toBe('250px')
    expect(getByTestId('item-2').style.transform).toBe('translate(0px, 250px)')
  })

  it('should settle when the hook receives an inline getItemHeight', () => {
    const container = document.createElement('div')
    let renders = 0

    const { result } = renderHook(() => {
      renders++
      const containerRef = useRef<HTMLElement>(container)
      return useVirtualMasonry({
        count: 10,
        columns: 3,
        containerRef,
        getItemHeight: () => {
          if (++calls > CALL_BUDGET) throw new Error('runaway layout loop')
          return 100
        },
      })
    })

    expect(renders).toBeLessThanOrEqual(10)
    expect(result.current.virtualItems).toHaveLength(10)
  })
})
