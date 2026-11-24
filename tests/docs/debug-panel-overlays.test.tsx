import React from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import { debugPanel } from '../../src/plugins/optional/debug-panel/debug-panel.js'
import { DebugPanelOverlay } from '../../src/plugins/optional/debug-panel/components.js'
import type { DebugPanelAPI } from '../../src/plugins/optional/debug-panel/types.js'

// The debug panel's "viewport overlay" and "item boundaries" switches only flip a flag: nothing draws an overlay or
// boundaries on the list. The docs must say they are not implemented (like the other declared-but-unused options).
describe('debug panel viewport overlay and item boundaries', () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 300, configurable: true })
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 300, configurable: true })
  })

  it('should leave the list untouched when they are switched on', async () => {
    const plugin = debugPanel({ enabled: true })
    const api = plugin.api as DebugPanelAPI
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(
        <>
          <div data-testid="list-host">
            <VirtualList data={Array.from({ length: 20 }, (_, i) => i)} itemHeight={50} height={300} plugins={[plugin]} renderItem={({ item, style }) => <div style={style}>{item}</div>} />
          </div>
          <DebugPanelOverlay plugin={plugin} />
        </>
      )
    })
    const host = view.getByTestId('list-host')
    const before = host.innerHTML
    await act(async () => { api.toggleViewportOverlay(); api.toggleItemBoundaries() })
    expect(host.innerHTML).toBe(before)
    view.unmount()
  })

  it('should be documented as not implemented in LLMS.md', () => {
    const llms = readFileSync(join(__dirname, '..', '..', 'LLMS.md'), 'utf8').split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10))
    for (const option of ['showViewportOverlay', 'showItemBoundaries']) {
      const line = llms.split(String.fromCharCode(10)).find((l) => l.includes(`${option}?: boolean`))
      expect(line).toMatch(/[Dd]eclared, not (implemented|used)/)
    }
  })
})
