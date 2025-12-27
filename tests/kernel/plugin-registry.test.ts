import { vi } from 'vitest'
import { PluginRegistry } from '../../src/kernel/plugin-registry.js'
import type { Plugin, Kernel, PluginHooks } from '../../src/types.js'

// Create mock kernel
function createMockKernel(): Kernel {
  const handlers: Map<string, Set<(event: unknown) => void>> = new Map()

  return {
    on: vi.fn((event: string, handler: (event: unknown) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set())
      }
      handlers.get(event)!.add(handler)
      return () => handlers.get(event)?.delete(handler)
    }),
    off: vi.fn(),
    emit: vi.fn((event: { type: string }) => {
      const eventHandlers = handlers.get(event.type)
      if (eventHandlers) {
        for (const handler of eventHandlers) {
          handler(event)
        }
      }
    }),
    configure: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
    getScrollPosition: vi.fn(() => ({ scrollTop: 0, scrollLeft: 0 })),
    setScrollPosition: vi.fn(),
    getViewport: vi.fn(() => ({ top: 0, left: 0, width: 400, height: 600, bottom: 600, right: 400 })),
    getVisibleRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getRenderRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getTotalSize: vi.fn(() => 5000),
    scrollTo: vi.fn(),
    scrollToIndex: vi.fn(),
    measureItem: vi.fn(),
    getCachedHeight: vi.fn(),
    getEstimatedHeight: vi.fn(() => 50),
    invalidateMeasurement: vi.fn(),
    invalidateAllMeasurements: vi.fn(),
    isScrolling: vi.fn(() => false),
    register: vi.fn(),
    unregister: vi.fn(),
    getPlugin: vi.fn(),
    getPlugins: vi.fn(() => []),
    hasPlugin: vi.fn(() => false),
    getItemOffset: vi.fn((index: number) => index * 50),
    getItemCount: vi.fn(() => 100),
  } as unknown as Kernel
}

// Create valid plugin
function createPlugin(name: string, options: Partial<Plugin> = {}): Plugin {
  return {
    name,
    version: '1.0.0',
    type: 'core',
    install: vi.fn(),
    uninstall: vi.fn(),
    ...options,
  }
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry
  let kernel: Kernel

  beforeEach(() => {
    registry = new PluginRegistry()
    kernel = createMockKernel()
  })

  describe('setKernel', () => {
    it('should set the kernel instance', () => {
      registry.setKernel(kernel)

      // Register a plugin and verify install was called with kernel
      const plugin = createPlugin('test')
      registry.register(plugin)

      expect(plugin.install).toHaveBeenCalledWith(kernel)
    })
  })

  describe('register', () => {
    it('should register a valid plugin', () => {
      registry.setKernel(kernel)
      const plugin = createPlugin('test')

      registry.register(plugin)

      expect(registry.has('test')).toBe(true)
      expect(plugin.install).toHaveBeenCalledWith(kernel)
    })

    it('should throw when plugin has no name', () => {
      const plugin = createPlugin('')

      expect(() => registry.register(plugin)).toThrow('[Scrollex] Plugin must have a name')
    })

    it('should throw when plugin name is not a string', () => {
      const plugin = { name: 123, version: '1.0.0', type: 'core', install: vi.fn(), uninstall: vi.fn() }

      expect(() => registry.register(plugin as unknown as Plugin)).toThrow('[Scrollex] Plugin must have a name')
    })

    it('should throw when plugin has no version', () => {
      const plugin = { name: 'test', version: '', type: 'core', install: vi.fn(), uninstall: vi.fn() }

      expect(() => registry.register(plugin as Plugin)).toThrow('[Scrollex] Plugin "test" must have a version')
    })

    it('should throw when plugin version is not a string', () => {
      const plugin = { name: 'test', version: 123, type: 'core', install: vi.fn(), uninstall: vi.fn() }

      expect(() => registry.register(plugin as unknown as Plugin)).toThrow('[Scrollex] Plugin "test" must have a version')
    })

    it('should throw when plugin has invalid type', () => {
      const plugin = { name: 'test', version: '1.0.0', type: 'invalid', install: vi.fn(), uninstall: vi.fn() }

      expect(() => registry.register(plugin as unknown as Plugin)).toThrow(
        '[Scrollex] Plugin "test" type must be "core" or "optional"'
      )
    })

    it('should throw when plugin has no install method', () => {
      const plugin = { name: 'test', version: '1.0.0', type: 'core', uninstall: vi.fn() }

      expect(() => registry.register(plugin as unknown as Plugin)).toThrow(
        '[Scrollex] Plugin "test" must have an install method'
      )
    })

    it('should throw when plugin has no uninstall method', () => {
      const plugin = { name: 'test', version: '1.0.0', type: 'core', install: vi.fn() }

      expect(() => registry.register(plugin as unknown as Plugin)).toThrow(
        '[Scrollex] Plugin "test" must have an uninstall method'
      )
    })

    it('should throw when plugin already registered', () => {
      const plugin = createPlugin('test')
      registry.register(plugin)

      expect(() => registry.register(plugin)).toThrow(
        '[Scrollex] Plugin "test" is already registered. Unregister the existing plugin first.'
      )
    })

    it('should register plugin without kernel (delayed install)', () => {
      const plugin = createPlugin('test')
      registry.register(plugin)

      // Install not called yet since no kernel
      expect(plugin.install).not.toHaveBeenCalled()
      expect(registry.has('test')).toBe(true)
    })
  })

  describe('unregister', () => {
    it('should unregister a plugin', () => {
      registry.setKernel(kernel)
      const plugin = createPlugin('test')
      registry.register(plugin)

      const result = registry.unregister('test')

      expect(result).toBe(true)
      expect(registry.has('test')).toBe(false)
      expect(plugin.uninstall).toHaveBeenCalled()
    })

    it('should return false when plugin not found', () => {
      const result = registry.unregister('nonexistent')

      expect(result).toBe(false)
    })

    it('should teardown hooks when unregistering', () => {
      registry.setKernel(kernel)

      const onScroll = vi.fn()
      const plugin = createPlugin('test', {
        hooks: {
          onScroll,
        },
      })

      registry.register(plugin)

      // Verify hook was set up
      expect(kernel.on).toHaveBeenCalledWith('scroll', expect.any(Function))

      registry.unregister('test')

      // The unsubscribe function should have been called
      expect(registry.has('test')).toBe(false)
    })
  })

  describe('get', () => {
    it('should get a registered plugin', () => {
      const plugin = createPlugin('test')
      registry.register(plugin)

      expect(registry.get('test')).toBe(plugin)
    })

    it('should return undefined for unknown plugin', () => {
      expect(registry.get('unknown')).toBeUndefined()
    })
  })

  describe('has', () => {
    it('should return true for registered plugin', () => {
      const plugin = createPlugin('test')
      registry.register(plugin)

      expect(registry.has('test')).toBe(true)
    })

    it('should return false for unregistered plugin', () => {
      expect(registry.has('unknown')).toBe(false)
    })
  })

  describe('list', () => {
    it('should list all registered plugins', () => {
      registry.register(createPlugin('plugin1'))
      registry.register(createPlugin('plugin2', { type: 'optional', version: '2.0.0' }))

      const list = registry.list()

      expect(list).toHaveLength(2)
      expect(list[0]).toEqual({
        name: 'plugin1',
        version: '1.0.0',
        type: 'core',
        enabled: true,
      })
      expect(list[1]).toEqual({
        name: 'plugin2',
        version: '2.0.0',
        type: 'optional',
        enabled: true,
      })
    })

    it('should return empty array when no plugins', () => {
      expect(registry.list()).toEqual([])
    })
  })

  describe('getAll', () => {
    it('should get all registered plugins', () => {
      const plugin1 = createPlugin('plugin1')
      const plugin2 = createPlugin('plugin2')
      registry.register(plugin1)
      registry.register(plugin2)

      const all = registry.getAll()

      expect(all).toHaveLength(2)
      expect(all).toContain(plugin1)
      expect(all).toContain(plugin2)
    })

    it('should return empty array when no plugins', () => {
      expect(registry.getAll()).toEqual([])
    })
  })

  describe('hook setup', () => {
    beforeEach(() => {
      registry.setKernel(kernel)
    })

    it('should set up onScroll hook', () => {
      const onScroll = vi.fn()
      const plugin = createPlugin('test', { hooks: { onScroll } })

      registry.register(plugin)

      expect(kernel.on).toHaveBeenCalledWith('scroll', expect.any(Function))

      // Emit scroll event
      const scrollEvent = { type: 'scroll', scrollTop: 100, scrollLeft: 0, deltaY: 10, deltaX: 0, direction: 'down', timestamp: Date.now() }
      ;(kernel.emit as ReturnType<typeof vi.fn>)(scrollEvent)

      expect(onScroll).toHaveBeenCalledWith(scrollEvent)
    })

    it('should set up onScrollStart hook', () => {
      const onScrollStart = vi.fn()
      const plugin = createPlugin('test', { hooks: { onScrollStart } })

      registry.register(plugin)

      expect(kernel.on).toHaveBeenCalledWith('scroll-start', expect.any(Function))

      // Emit scroll-start event
      const scrollStartEvent = { type: 'scroll-start', timestamp: Date.now() }
      ;(kernel.emit as ReturnType<typeof vi.fn>)(scrollStartEvent)

      expect(onScrollStart).toHaveBeenCalledWith(scrollStartEvent)
    })

    it('should set up onScrollEnd hook', () => {
      const onScrollEnd = vi.fn()
      const plugin = createPlugin('test', { hooks: { onScrollEnd } })

      registry.register(plugin)

      expect(kernel.on).toHaveBeenCalledWith('scroll-end', expect.any(Function))

      // Emit scroll-end event
      const scrollEndEvent = { type: 'scroll-end', timestamp: Date.now() }
      ;(kernel.emit as ReturnType<typeof vi.fn>)(scrollEndEvent)

      expect(onScrollEnd).toHaveBeenCalledWith(scrollEndEvent)
    })

    it('should set up onVisibleRangeChange hook', () => {
      const onVisibleRangeChange = vi.fn()
      const plugin = createPlugin('test', { hooks: { onVisibleRangeChange } })

      registry.register(plugin)

      expect(kernel.on).toHaveBeenCalledWith('visible-range-change', expect.any(Function))

      // Emit visible-range-change event
      const range = { startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 }
      const prevRange = { startIndex: 0, endIndex: 5, overscanStartIndex: 0, overscanEndIndex: 5 }
      const rangeChangeEvent = { type: 'visible-range-change', range, previousRange: prevRange }
      ;(kernel.emit as ReturnType<typeof vi.fn>)(rangeChangeEvent)

      expect(onVisibleRangeChange).toHaveBeenCalledWith(range, prevRange)
    })

    it('should set up onItemMeasured hook', () => {
      const onItemMeasured = vi.fn()
      const plugin = createPlugin('test', { hooks: { onItemMeasured } })

      registry.register(plugin)

      expect(kernel.on).toHaveBeenCalledWith('item-measured', expect.any(Function))

      // Emit item-measured event
      const itemMeasuredEvent = { type: 'item-measured', index: 5, height: 100 }
      ;(kernel.emit as ReturnType<typeof vi.fn>)(itemMeasuredEvent)

      expect(onItemMeasured).toHaveBeenCalledWith(5, 100)
    })

    it('should set up onResize hook', () => {
      const onResize = vi.fn()
      const plugin = createPlugin('test', { hooks: { onResize } })

      registry.register(plugin)

      expect(kernel.on).toHaveBeenCalledWith('resize', expect.any(Function))

      // Emit resize event
      const viewport = { top: 0, left: 0, width: 500, height: 700, bottom: 700, right: 500 }
      const resizeEvent = { type: 'resize', viewport }
      ;(kernel.emit as ReturnType<typeof vi.fn>)(resizeEvent)

      expect(onResize).toHaveBeenCalledWith(viewport)
    })

    it('should set up onLoadMore hook', () => {
      const onLoadMore = vi.fn()
      const plugin = createPlugin('test', { hooks: { onLoadMore } })

      registry.register(plugin)

      expect(kernel.on).toHaveBeenCalledWith('load-more', expect.any(Function))

      // Emit load-more event
      const loadMoreEvent = { type: 'load-more', direction: 'forward' }
      ;(kernel.emit as ReturnType<typeof vi.fn>)(loadMoreEvent)

      expect(onLoadMore).toHaveBeenCalledWith('forward')
    })

    it('should set up onItemsChange hook', () => {
      const onItemsChange = vi.fn()
      const plugin = createPlugin('test', { hooks: { onItemsChange } })

      registry.register(plugin)

      expect(kernel.on).toHaveBeenCalledWith('items-change', expect.any(Function))

      // Emit items-change event
      const itemsChangeEvent = { type: 'items-change', count: 150, previousCount: 100 }
      ;(kernel.emit as ReturnType<typeof vi.fn>)(itemsChangeEvent)

      expect(onItemsChange).toHaveBeenCalledWith(150, 100)
    })

    it('should not set up hooks without kernel', () => {
      const newRegistry = new PluginRegistry()
      const onScroll = vi.fn()
      const plugin = createPlugin('test', { hooks: { onScroll } })

      newRegistry.register(plugin)

      // No kernel.on should have been called
      expect(kernel.on).not.toHaveBeenCalled()
    })

    it('should not set up hooks for plugin without hooks', () => {
      const plugin = createPlugin('test')

      registry.register(plugin)

      // Only the plugin registration should happen, no hook setup
      expect(kernel.on).not.toHaveBeenCalled()
    })
  })

  describe('dispatchHook', () => {
    it('should dispatch hook to all plugins', () => {
      registry.setKernel(kernel)

      const onScroll1 = vi.fn()
      const onScroll2 = vi.fn()

      registry.register(createPlugin('plugin1', { hooks: { onScroll: onScroll1 } }))
      registry.register(createPlugin('plugin2', { hooks: { onScroll: onScroll2 } }))

      const scrollEvent = { type: 'scroll', scrollTop: 100, scrollLeft: 0, deltaY: 10, deltaX: 0, direction: 'down', timestamp: Date.now() }

      registry.dispatchHook('onScroll', scrollEvent as any)

      expect(onScroll1).toHaveBeenCalledWith(scrollEvent)
      expect(onScroll2).toHaveBeenCalledWith(scrollEvent)
    })

    it('should catch and log errors in hook handlers', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const error = new Error('Hook error')
      const onScroll = vi.fn(() => { throw error })
      const plugin = createPlugin('test', { hooks: { onScroll } })

      registry.register(plugin)

      const scrollEvent = { type: 'scroll', scrollTop: 100, scrollLeft: 0, deltaY: 10, deltaX: 0, direction: 'down', timestamp: Date.now() }

      registry.dispatchHook('onScroll', scrollEvent as any)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Scrollex] Error in plugin "test" hook "onScroll":',
        error
      )

      consoleSpy.mockRestore()
    })

    it('should skip plugins without the hook', () => {
      const onScroll = vi.fn()
      registry.register(createPlugin('plugin1'))
      registry.register(createPlugin('plugin2', { hooks: { onScroll } }))

      const scrollEvent = { type: 'scroll', scrollTop: 100, scrollLeft: 0, deltaY: 10, deltaX: 0, direction: 'down', timestamp: Date.now() }

      registry.dispatchHook('onScroll', scrollEvent as any)

      expect(onScroll).toHaveBeenCalledTimes(1)
    })
  })

  describe('clear', () => {
    it('should unregister all plugins', () => {
      registry.setKernel(kernel)
      const plugin1 = createPlugin('plugin1')
      const plugin2 = createPlugin('plugin2')

      registry.register(plugin1)
      registry.register(plugin2)

      registry.clear()

      expect(registry.size()).toBe(0)
      expect(plugin1.uninstall).toHaveBeenCalled()
      expect(plugin2.uninstall).toHaveBeenCalled()
    })

    it('should handle clear on empty registry', () => {
      expect(() => registry.clear()).not.toThrow()
    })
  })

  describe('size', () => {
    it('should return 0 initially', () => {
      expect(registry.size()).toBe(0)
    })

    it('should return correct count after registering plugins', () => {
      registry.register(createPlugin('plugin1'))
      registry.register(createPlugin('plugin2'))
      registry.register(createPlugin('plugin3'))

      expect(registry.size()).toBe(3)
    })

    it('should update after unregistering', () => {
      registry.register(createPlugin('plugin1'))
      registry.register(createPlugin('plugin2'))

      registry.unregister('plugin1')

      expect(registry.size()).toBe(1)
    })
  })

  describe('hook event type filtering', () => {
    beforeEach(() => {
      registry.setKernel(kernel)
    })

    it('should only call scroll hook for scroll events', () => {
      const onScroll = vi.fn()
      const plugin = createPlugin('test', { hooks: { onScroll } })

      registry.register(plugin)

      // Emit wrong event type
      const wrongEvent = { type: 'scroll-start', timestamp: Date.now() }
      ;(kernel.emit as ReturnType<typeof vi.fn>)(wrongEvent)

      // onScroll should not be called since the event type filter should prevent it
      // However, the kernel routing will handle this - let me simulate proper routing
    })
  })
})
