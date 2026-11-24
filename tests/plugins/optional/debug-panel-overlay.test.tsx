import React, { useLayoutEffect } from 'react'
import { render, act } from '@testing-library/react'
import { debugPanel } from '../../../src/plugins/optional/debug-panel/debug-panel.js'
import { DebugPanelOverlay } from '../../../src/plugins/optional/debug-panel/components.js'
import type { DebugPanelAPI } from '../../../src/plugins/optional/debug-panel/types.js'

describe('DebugPanelOverlay state', () => {
  const api = (plugin: ReturnType<typeof debugPanel>) => plugin.api as DebugPanelAPI
  const isShown = (view: ReturnType<typeof render>) => view.container.textContent !== ''

  it('should follow the plugin it is given', () => {
    const plugin = debugPanel({ enabled: false })
    let view!: ReturnType<typeof render>
    act(() => { view = render(<DebugPanelOverlay plugin={plugin} />) })
    expect(isShown(view)).toBe(false)

    act(() => { api(plugin).show() })
    expect(isShown(view)).toBe(true)

    act(() => { api(plugin).hide() })
    expect(isShown(view)).toBe(false)
    view.unmount()
  })

  it('should show the state of another plugin when it is given one', () => {
    const hidden = debugPanel({ enabled: false })
    const visible = debugPanel({ enabled: true })
    let view!: ReturnType<typeof render>
    act(() => { view = render(<DebugPanelOverlay plugin={hidden} />) })

    act(() => { view.rerender(<DebugPanelOverlay plugin={visible} />) })
    expect(isShown(view)).toBe(true)

    act(() => { view.rerender(<DebugPanelOverlay plugin={hidden} />) })
    expect(isShown(view)).toBe(false)
    view.unmount()
  })

  it('should pick up a change that happens between its render and its subscription', () => {
    const plugin = debugPanel({ enabled: true })
    function Hider() {
      useLayoutEffect(() => { api(plugin).hide() }, [])
      return null
    }
    let view!: ReturnType<typeof render>
    act(() => { view = render(<><DebugPanelOverlay plugin={plugin} /><Hider /></>) })

    expect(isShown(view)).toBe(false)
    view.unmount()
  })

  it('should stop listening to a plugin it is no longer given', () => {
    const first = debugPanel({ enabled: true })
    const second = debugPanel({ enabled: false })
    let view!: ReturnType<typeof render>
    act(() => { view = render(<DebugPanelOverlay plugin={first} />) })
    act(() => { view.rerender(<DebugPanelOverlay plugin={second} />) })

    act(() => { api(first).hide() })
    act(() => { api(first).show() })

    expect(isShown(view)).toBe(false) // second is hidden and unaffected by first
    view.unmount()
  })
})
