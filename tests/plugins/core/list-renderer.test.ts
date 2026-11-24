import { createKernel } from '../../../src/kernel/kernel.js'
import { listRendererPlugin, type ListRendererAPI } from '../../../src/plugins/core/list-renderer.js'
import type { Range } from '../../../src/types.js'

function setup() {
  const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 50, overscan: 0, direction: 'vertical' })
  const plugin = listRendererPlugin()
  kernel.register(plugin)
  return { kernel, plugin, api: plugin.api as ListRendererAPI }
}

function range(start: number, end: number): Range {
  return { startIndex: start, endIndex: end, overscanStartIndex: start, overscanEndIndex: end }
}

describe('listRendererPlugin item ownership', () => {
  it('should not mutate items handed out before a rebuild', () => {
    const { plugin, api } = setup()
    plugin.hooks!.onVisibleRangeChange!(range(10, 14), range(0, 0))
    const handedOut = api.getVirtualItems()
    const snapshot = JSON.stringify(handedOut)

    plugin.hooks!.onVisibleRangeChange!(range(50, 52), range(10, 14))

    expect(JSON.stringify(handedOut)).toBe(snapshot)
    expect(api.getVirtualItems().map((item) => item.index)).toEqual([50, 51, 52])
  })

  it('should not mutate handed-out items on uninstall', () => {
    const { kernel, plugin, api } = setup()
    plugin.hooks!.onVisibleRangeChange!(range(20, 22), range(0, 0))
    const handedOut = api.getVirtualItems()
    const snapshot = JSON.stringify(handedOut)

    kernel.unregister('list-renderer')

    expect(JSON.stringify(handedOut)).toBe(snapshot)
    expect(api.getVirtualItems()).toEqual([])
  })
})

describe('listRendererPlugin item count', () => {
  it('should build no items and request no keys for an empty list', () => {
    const keys: number[] = []
    const kernel = createKernel({ itemCount: 0, estimatedItemHeight: 50, overscan: 2 })
    const plugin = listRendererPlugin({ getItemKey: (index) => { keys.push(index); return index } })
    kernel.register(plugin)
    kernel.attach(document.createElement('div'))

    expect((plugin.api as ListRendererAPI).getVirtualItems()).toEqual([])
    expect(keys).toEqual([])
  })

  it('should never build items past the count after the list shrinks', () => {
    const { kernel, api } = setup()
    kernel.attach(document.createElement('div'))
    kernel.configure({ itemCount: 3 })

    const indexes = api.getVirtualItems().map((item) => item.index)
    expect(indexes.length).toBeGreaterThan(0)
    expect(Math.max(...indexes)).toBeLessThan(3)
  })

  it('should not report item 0 of an empty list as visible', () => {
    const kernel = createKernel({ itemCount: 0, estimatedItemHeight: 50, overscan: 0 })
    const plugin = listRendererPlugin()
    kernel.register(plugin)
    kernel.attach(document.createElement('div'))
    expect((plugin.api as ListRendererAPI).isItemVisible(0)).toBe(false)

    kernel.configure({ itemCount: 5 })
    expect((plugin.api as ListRendererAPI).isItemVisible(0)).toBe(true)
    expect((plugin.api as ListRendererAPI).isItemVisible(5)).toBe(false)
  })
})
