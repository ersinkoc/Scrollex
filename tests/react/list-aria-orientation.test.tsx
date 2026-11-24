// A horizontal list scrolls sideways: a listbox is vertical unless aria-orientation says otherwise.
import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'


beforeEach(() => {
  Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 200, configurable: true })
  Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 300, configurable: true })
})
const data = Array.from({ length: 20 }, (_, i) => i)

async function orientation(direction: 'vertical' | 'horizontal', extra: Record<string, string> = {}) {
  let view!: ReturnType<typeof render>
  await act(async () => {
    view = render(<VirtualList data={data} itemHeight={50} height={200} width={300} direction={direction} {...extra} renderItem={({ item, style }) => <div style={style}>{item}</div>} />)
  })
  const value = (view.container.firstElementChild as HTMLElement).getAttribute('aria-orientation')
  view.unmount()
  return value
}


describe('VirtualList aria-orientation', () => {
  it('should expose the direction the list scrolls in', async () => {
    expect(await orientation('vertical')).toBe('vertical')
    expect(await orientation('horizontal')).toBe('horizontal')
  })

  it('should let an explicit aria-orientation win', async () => {
    expect(await orientation('horizontal', { 'aria-orientation': 'vertical' })).toBe('vertical')
  })
})
