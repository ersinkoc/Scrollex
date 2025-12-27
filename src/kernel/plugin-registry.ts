import type {
  Plugin,
  PluginInfo,
  PluginHooks,
  Kernel,
  KernelEvent,
  EventHandler,
  ScrollEvent,
  ScrollStartEvent,
  ScrollEndEvent,
  VisibleRangeChangeEvent,
  ItemMeasuredEvent,
  ResizeEvent,
  LoadMoreEvent,
  ItemsChangeEvent,
} from '../types.js'

/**
 * Manages plugin registration and lifecycle.
 */
export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map()
  private kernel: Kernel | null = null
  private hookSubscriptions: Map<string, Array<() => void>> = new Map()

  /**
   * Set the kernel instance.
   *
   * @param kernel - Kernel instance
   */
  setKernel(kernel: Kernel): void {
    this.kernel = kernel
  }

  /**
   * Register a plugin.
   *
   * @param plugin - Plugin to register
   * @throws Error if plugin with same name already registered
   */
  register(plugin: Plugin): void {
    this.validatePlugin(plugin)

    if (this.plugins.has(plugin.name)) {
      throw new Error(
        `[Scrollex] Plugin "${plugin.name}" is already registered. ` +
        `Unregister the existing plugin first.`
      )
    }

    this.plugins.set(plugin.name, plugin)

    // Install the plugin
    if (this.kernel && plugin.install) {
      plugin.install(this.kernel)
      this.setupHooks(plugin)
    }
  }

  /**
   * Unregister a plugin by name.
   *
   * @param name - Plugin name to unregister
   * @returns Whether a plugin was unregistered
   */
  unregister(name: string): boolean {
    const plugin = this.plugins.get(name)

    if (!plugin) {
      return false
    }

    // Teardown hooks first
    this.teardownHooks(plugin)

    // Uninstall the plugin
    plugin.uninstall?.()

    this.plugins.delete(name)

    return true
  }

  /**
   * Get a plugin by name.
   *
   * @param name - Plugin name
   * @returns Plugin instance, or undefined if not found
   */
  get<T extends Plugin>(name: string): T | undefined {
    return this.plugins.get(name) as T | undefined
  }

  /**
   * Check if a plugin is registered.
   *
   * @param name - Plugin name
   * @returns Whether plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name)
  }

  /**
   * List all registered plugins.
   *
   * @returns Array of plugin info
   */
  list(): PluginInfo[] {
    return Array.from(this.plugins.values()).map((plugin) => ({
      name: plugin.name,
      version: plugin.version,
      type: plugin.type,
      enabled: true,
    }))
  }

  /**
   * Get all registered plugins.
   *
   * @returns Array of plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Validate a plugin before registration.
   */
  private validatePlugin(plugin: Plugin): void {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('[Scrollex] Plugin must have a name')
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error(`[Scrollex] Plugin "${plugin.name}" must have a version`)
    }

    if (plugin.type !== 'core' && plugin.type !== 'optional') {
      throw new Error(
        `[Scrollex] Plugin "${plugin.name}" type must be "core" or "optional"`
      )
    }

    if (typeof plugin.install !== 'function') {
      throw new Error(`[Scrollex] Plugin "${plugin.name}" must have an install method`)
    }

    if (typeof plugin.uninstall !== 'function') {
      throw new Error(`[Scrollex] Plugin "${plugin.name}" must have an uninstall method`)
    }
  }

  /**
   * Set up hooks for a plugin.
   */
  private setupHooks(plugin: Plugin): void {
    if (!plugin.hooks || !this.kernel) return

    const subscriptions: Array<() => void> = []
    const hooks = plugin.hooks
    const k = this.kernel

    if (hooks.onScroll) {
      const handler = hooks.onScroll
      const unsub = k.on('scroll', ((event: KernelEvent) => {
        if (event.type === 'scroll') handler(event as ScrollEvent)
      }) as EventHandler)
      subscriptions.push(unsub)
    }

    if (hooks.onScrollStart) {
      const handler = hooks.onScrollStart
      const unsub = k.on('scroll-start', ((event: KernelEvent) => {
        if (event.type === 'scroll-start') handler(event as ScrollStartEvent)
      }) as EventHandler)
      subscriptions.push(unsub)
    }

    if (hooks.onScrollEnd) {
      const handler = hooks.onScrollEnd
      const unsub = k.on('scroll-end', ((event: KernelEvent) => {
        if (event.type === 'scroll-end') handler(event as ScrollEndEvent)
      }) as EventHandler)
      subscriptions.push(unsub)
    }

    if (hooks.onVisibleRangeChange) {
      const handler = hooks.onVisibleRangeChange
      const unsub = k.on('visible-range-change', ((event: KernelEvent) => {
        if (event.type === 'visible-range-change') {
          const e = event as VisibleRangeChangeEvent
          handler(e.range, e.previousRange)
        }
      }) as EventHandler)
      subscriptions.push(unsub)
    }

    if (hooks.onItemMeasured) {
      const handler = hooks.onItemMeasured
      const unsub = k.on('item-measured', ((event: KernelEvent) => {
        if (event.type === 'item-measured') {
          const e = event as ItemMeasuredEvent
          handler(e.index, e.height)
        }
      }) as EventHandler)
      subscriptions.push(unsub)
    }

    if (hooks.onResize) {
      const handler = hooks.onResize
      const unsub = k.on('resize', ((event: KernelEvent) => {
        if (event.type === 'resize') {
          const e = event as ResizeEvent
          handler(e.viewport)
        }
      }) as EventHandler)
      subscriptions.push(unsub)
    }

    if (hooks.onLoadMore) {
      const handler = hooks.onLoadMore
      const unsub = k.on('load-more', ((event: KernelEvent) => {
        if (event.type === 'load-more') {
          const e = event as LoadMoreEvent
          handler(e.direction)
        }
      }) as EventHandler)
      subscriptions.push(unsub)
    }

    if (hooks.onItemsChange) {
      const handler = hooks.onItemsChange
      const unsub = k.on('items-change', ((event: KernelEvent) => {
        if (event.type === 'items-change') {
          const e = event as ItemsChangeEvent
          handler(e.count, e.previousCount)
        }
      }) as EventHandler)
      subscriptions.push(unsub)
    }

    if (subscriptions.length > 0) {
      this.hookSubscriptions.set(plugin.name, subscriptions)
    }
  }

  /**
   * Tear down hooks for a plugin.
   */
  private teardownHooks(plugin: Plugin): void {
    const subscriptions = this.hookSubscriptions.get(plugin.name)

    if (subscriptions) {
      for (const unsub of subscriptions) {
        unsub()
      }
      this.hookSubscriptions.delete(plugin.name)
    }
  }

  /**
   * Dispatch a hook to all plugins that implement it.
   *
   * @param hookName - Name of the hook
   * @param args - Arguments to pass to the hook
   */
  dispatchHook<K extends keyof PluginHooks>(
    hookName: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): void {
    for (const plugin of this.plugins.values()) {
      const hook = plugin.hooks?.[hookName]
      if (hook) {
        try {
          ;(hook as (...args: unknown[]) => void)(...args)
        } catch (error) {
          console.error(
            `[Scrollex] Error in plugin "${plugin.name}" hook "${String(hookName)}":`,
            error
          )
        }
      }
    }
  }

  /**
   * Unregister all plugins.
   */
  clear(): void {
    // Unregister in reverse order
    const names = Array.from(this.plugins.keys()).reverse()

    for (const name of names) {
      this.unregister(name)
    }
  }

  /**
   * Get the number of registered plugins.
   *
   * @returns Number of plugins
   */
  size(): number {
    return this.plugins.size
  }
}
