import type { EventType, KernelEvent, EventHandler, Unsubscribe } from '../types.js'

/**
 * Central event bus for kernel communication.
 * Handles event subscription, unsubscription, and emission.
 */
export class EventBus {
  private handlers: Map<EventType, Set<EventHandler>> = new Map()
  private onceHandlers: Map<EventType, Set<EventHandler>> = new Map()
  private emitting = false
  private pendingEvents: KernelEvent[] = []

  /**
   * Subscribe to an event type.
   *
   * @param eventType - Type of event to subscribe to
   * @param handler - Handler function to call when event is emitted
   * @returns Unsubscribe function
   */
  on<T extends KernelEvent>(
    eventType: T['type'],
    handler: EventHandler<T>
  ): Unsubscribe {
    let handlers = this.handlers.get(eventType)

    if (!handlers) {
      handlers = new Set()
      this.handlers.set(eventType, handlers)
    }

    handlers.add(handler as EventHandler)

    return () => {
      this.off(eventType, handler)
    }
  }

  /**
   * Unsubscribe from an event type.
   *
   * @param eventType - Type of event to unsubscribe from
   * @param handler - Handler function to remove
   */
  off<T extends KernelEvent>(
    eventType: T['type'],
    handler: EventHandler<T>
  ): void {
    const handlers = this.handlers.get(eventType)

    if (handlers) {
      handlers.delete(handler as EventHandler)

      if (handlers.size === 0) {
        this.handlers.delete(eventType)
      }
    }

    // Also remove from once handlers
    const onceHandlers = this.onceHandlers.get(eventType)
    if (onceHandlers) {
      onceHandlers.delete(handler as EventHandler)

      if (onceHandlers.size === 0) {
        this.onceHandlers.delete(eventType)
      }
    }
  }

  /**
   * Subscribe to an event type, but only fire once.
   *
   * @param eventType - Type of event to subscribe to
   * @param handler - Handler function to call when event is emitted
   * @returns Unsubscribe function
   */
  once<T extends KernelEvent>(
    eventType: T['type'],
    handler: EventHandler<T>
  ): Unsubscribe {
    let onceHandlers = this.onceHandlers.get(eventType)

    if (!onceHandlers) {
      onceHandlers = new Set()
      this.onceHandlers.set(eventType, onceHandlers)
    }

    onceHandlers.add(handler as EventHandler)

    return () => {
      this.off(eventType, handler)
    }
  }

  /**
   * Emit an event to all subscribers.
   *
   * @param event - Event to emit
   */
  emit(event: KernelEvent): void {
    // If currently emitting, queue the event to prevent recursion
    if (this.emitting) {
      this.pendingEvents.push(event)
      return
    }

    this.emitting = true

    try {
      this.dispatchEvent(event)

      // Process any events that were queued during emission
      while (this.pendingEvents.length > 0) {
        const pendingEvent = this.pendingEvents.shift()
        if (pendingEvent) {
          this.dispatchEvent(pendingEvent)
        }
      }
    } finally {
      this.emitting = false
    }
  }

  /**
   * Dispatch a single event to handlers.
   */
  private dispatchEvent(event: KernelEvent): void {
    const eventType = event.type as EventType

    // Regular handlers
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event)
        } catch (error) {
          console.error(`[Scrollex] Error in event handler for "${eventType}":`, error)
        }
      }
    }

    // Once handlers - remove after calling
    const onceHandlers = this.onceHandlers.get(eventType)
    if (onceHandlers) {
      const handlersToCall = Array.from(onceHandlers)
      onceHandlers.clear()

      for (const handler of handlersToCall) {
        try {
          handler(event)
        } catch (error) {
          console.error(`[Scrollex] Error in once handler for "${eventType}":`, error)
        }
      }

      if (onceHandlers.size === 0) {
        this.onceHandlers.delete(eventType)
      }
    }
  }

  /**
   * Check if there are any handlers for an event type.
   *
   * @param eventType - Type of event to check
   * @returns Whether there are handlers
   */
  hasHandlers(eventType: EventType): boolean {
    const handlers = this.handlers.get(eventType)
    const onceHandlers = this.onceHandlers.get(eventType)

    return (handlers?.size ?? 0) > 0 || (onceHandlers?.size ?? 0) > 0
  }

  /**
   * Get the number of handlers for an event type.
   *
   * @param eventType - Type of event to check
   * @returns Number of handlers
   */
  handlerCount(eventType: EventType): number {
    const handlers = this.handlers.get(eventType)
    const onceHandlers = this.onceHandlers.get(eventType)

    return (handlers?.size ?? 0) + (onceHandlers?.size ?? 0)
  }

  /**
   * Remove all handlers.
   */
  clear(): void {
    this.handlers.clear()
    this.onceHandlers.clear()
    this.pendingEvents = []
    this.emitting = false
  }

  /**
   * Remove all handlers for a specific event type.
   *
   * @param eventType - Type of event to clear handlers for
   */
  clearEvent(eventType: EventType): void {
    this.handlers.delete(eventType)
    this.onceHandlers.delete(eventType)
  }
}
