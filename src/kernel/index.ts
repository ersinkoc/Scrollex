// Kernel factory and helpers
export { createKernel, createPlugin } from './kernel.js'

// Kernel components (for advanced usage)
export { EventBus } from './event-bus.js'
export { ScrollEngine, easings } from './scroll-engine.js'
export { ViewportManager } from './viewport.js'
export { RangeCalculator } from './range-calculator.js'
export { MeasurementCache } from './measurement-cache.js'
export { PluginRegistry } from './plugin-registry.js'

// Re-export types
export type { ViewportChangeCallback } from './viewport.js'
export type { ScrollCallback, ScrollStartCallback, ScrollEndCallback } from './scroll-engine.js'
export type { RangeCalculatorOptions } from './range-calculator.js'
