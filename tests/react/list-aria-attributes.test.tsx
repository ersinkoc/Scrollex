// VirtualList's listbox/options used aria-rowcount / aria-rowindex, which those roles do not support: a virtualized listbox
// announces its position with aria-setsize (total) and aria-posinset.
import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'


beforeEach(() => {
  Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 200, configurable: true })
  Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 300, configurable: true })
})

const GLOBAL = new Set(['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'aria-live', 'aria-busy', 'aria-current', 'aria-disabled', 'aria-atomic', 'aria-controls', 'aria-details', 'aria-errormessage', 'aria-flowto', 'aria-haspopup', 'aria-invalid', 'aria-keyshortcuts', 'aria-owns', 'aria-relevant', 'aria-roledescription', 'aria-description'])
const ALLOWED: Record<string, string[]> = {
  listbox: ['aria-activedescendant', 'aria-expanded', 'aria-multiselectable', 'aria-orientation', 'aria-readonly', 'aria-required'],
  option: ['aria-checked', 'aria-posinset', 'aria-selected', 'aria-setsize', 'aria-level'],
}
const unsupported = (el: Element, role: string) =>
  el.getAttributeNames().filter((n) => n.startsWith('aria-') && !GLOBAL.has(n) && !ALLOWED[role]!.includes(n))

describe('VirtualList ARIA attributes', () => {
  async function mount() {
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(<VirtualList data={Array.from({ length: 200 }, (_, i) => i)} itemHeight={50} height={200} aria-label="items" renderItem={({ item, style }) => <div style={style}>{item}</div>} />)
    })
    return view
  }

  it('should only carry attributes the listbox and option roles support', async () => {
    const view = await mount()
    const listbox = view.container.querySelector('[role="listbox"]')!
    const options = [...view.container.querySelectorAll('[role="option"]')]
    expect(options.length).toBeGreaterThan(3)
    expect(listbox.getAttribute('aria-label')).toBe('items')
    expect(unsupported(listbox, 'listbox')).toEqual([])
    expect([...new Set(options.flatMap((o) => unsupported(o, 'option')))]).toEqual([])
  })

  it('should give each option its position among all items, not among the rendered ones', async () => {
    const view = await mount()
    const options = [...view.container.querySelectorAll('[role="option"]')]
    expect(options[2]!.getAttribute('aria-setsize')).toBe('200')
    expect(options[2]!.getAttribute('aria-posinset')).toBe('3')
  })
})
