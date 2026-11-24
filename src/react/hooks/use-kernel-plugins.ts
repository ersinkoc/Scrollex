import { useEffect, useRef } from 'react'
import type { Kernel, Plugin } from '../../types.js'

/**
 * Keep a component's `plugins` prop registered on its kernel.
 * Re-syncs only when the list actually changes, so inline arrays are safe.
 *
 * @param kernel - Kernel the plugins are installed on
 * @param plugins - Plugins to keep registered
 */
export function useKernelPlugins(kernel: Kernel, plugins: Plugin[]): void {
  const registeredRef = useRef<Plugin[]>([])

  useEffect(() => {
    const previous = registeredRef.current
    if (previous.length === plugins.length && previous.every((plugin, i) => plugin === plugins[i])) {
      return
    }

    for (const plugin of previous) {
      kernel.unregister(plugin.name)
    }
    for (const plugin of plugins) {
      kernel.register(plugin)
    }
    registeredRef.current = plugins
  })

  useEffect(() => () => {
    for (const plugin of registeredRef.current) {
      kernel.unregister(plugin.name)
    }
    registeredRef.current = []
  }, [kernel])
}
