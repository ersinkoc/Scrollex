import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Plugin } from '../../../types.js'
import type {
  DebugPanelAPI,
  DebugPanelState,
  DebugPanelOptions,
  DebugPanelTab,
  PerformanceStats,
  EventLogEntry,
} from './types.js'

/**
 * Extended debug panel API with internal methods.
 */
interface ExtendedDebugPanelAPI extends DebugPanelAPI {
  subscribe(listener: () => void): () => void
  getState(): DebugPanelState
  getOptions(): Required<DebugPanelOptions>
}

/**
 * Hook to use debug panel state.
 */
function useDebugPanelState(plugin: Plugin): DebugPanelState {
  const api = plugin.api as ExtendedDebugPanelAPI
  const [state, setState] = useState<DebugPanelState>(api.getState())

  useEffect(() => {
    return api.subscribe(() => {
      setState({ ...api.getState() })
    })
  }, [api])

  return state
}

/**
 * Props for DebugPanelOverlay component.
 */
export interface DebugPanelOverlayProps {
  /** Debug panel plugin instance */
  plugin: Plugin
  /** Additional class name */
  className?: string
  /** Custom styles */
  style?: React.CSSProperties
}

/**
 * Debug panel overlay component.
 * Renders a floating debug panel with stats and tools.
 */
export function DebugPanelOverlay({
  plugin,
  className = '',
  style,
}: DebugPanelOverlayProps): React.ReactElement | null {
  const api = plugin.api as ExtendedDebugPanelAPI
  const state = useDebugPanelState(plugin)
  const options = api.getOptions()

  const positionStyles = useMemo(() => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '12px',
    }

    switch (options.position) {
      case 'top-left':
        return { ...base, top: 10, left: 10 }
      case 'top-right':
        return { ...base, top: 10, right: 10 }
      case 'bottom-left':
        return { ...base, bottom: 10, left: 10 }
      case 'bottom-right':
      default:
        return { ...base, bottom: 10, right: 10 }
    }
  }, [options.position])

  const themeStyles = useMemo((): React.CSSProperties => {
    const isDark = options.theme === 'dark' ||
      (options.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    return isDark
      ? {
          backgroundColor: 'rgba(30, 30, 30, 0.95)',
          color: '#e0e0e0',
          border: '1px solid #444',
        }
      : {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          color: '#333',
          border: '1px solid #ddd',
        }
  }, [options.theme])

  const handleTabClick = useCallback((tab: DebugPanelTab) => {
    api.setActiveTab(tab)
  }, [api])

  const handleToggleCollapse = useCallback(() => {
    api.setCollapsed(!state.collapsed)
  }, [api, state.collapsed])

  const handleClose = useCallback(() => {
    api.hide()
  }, [api])

  if (!state.visible) {
    return null
  }

  const panelStyles: React.CSSProperties = {
    ...positionStyles,
    ...themeStyles,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    minWidth: state.collapsed ? 'auto' : '300px',
    maxWidth: '400px',
    maxHeight: state.collapsed ? 'auto' : '400px',
    ...style,
  }

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: state.collapsed ? 'none' : '1px solid currentColor',
    opacity: 0.8,
    cursor: 'pointer',
  }

  return (
    <div className={`scrollex-debug-panel ${className}`} style={panelStyles}>
      <div style={headerStyles} onClick={handleToggleCollapse}>
        <span style={{ fontWeight: 600 }}>Scrollex Debug</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {options.showFps && (
            <span style={{ color: state.stats.fps < 30 ? '#ff6b6b' : state.stats.fps < 50 ? '#ffd93d' : '#6bcb77' }}>
              {state.stats.fps} FPS
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleClose() }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: 0,
              fontSize: '14px',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {!state.collapsed && (
        <>
          <TabBar activeTab={state.activeTab} onTabClick={handleTabClick} />
          <div style={{ padding: '12px', overflowY: 'auto', maxHeight: '300px' }}>
            {state.activeTab === 'stats' && <StatsPanel stats={state.stats} />}
            {state.activeTab === 'viewport' && (
              <ViewportPanel
                stats={state.stats}
                showOverlay={state.showViewportOverlay}
                showBoundaries={state.showItemBoundaries}
                onToggleOverlay={() => api.toggleViewportOverlay()}
                onToggleBoundaries={() => api.toggleItemBoundaries()}
              />
            )}
            {state.activeTab === 'items' && <ItemsPanel stats={state.stats} />}
            {state.activeTab === 'events' && (
              <EventsPanel eventLog={state.eventLog} onClear={() => api.clearEventLog()} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Tab bar component.
 */
interface TabBarProps {
  activeTab: DebugPanelTab
  onTabClick: (tab: DebugPanelTab) => void
}

function TabBar({ activeTab, onTabClick }: TabBarProps): React.ReactElement {
  const tabs: { id: DebugPanelTab; label: string }[] = [
    { id: 'stats', label: 'Stats' },
    { id: 'viewport', label: 'Viewport' },
    { id: 'items', label: 'Items' },
    { id: 'events', label: 'Events' },
  ]

  const tabStyles = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '6px 8px',
    border: 'none',
    background: isActive ? 'rgba(100, 100, 255, 0.2)' : 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: isActive ? 600 : 400,
  })

  return (
    <div style={{ display: 'flex', borderBottom: '1px solid currentColor', opacity: 0.6 }}>
      {tabs.map((tab) => (
        <button key={tab.id} style={tabStyles(activeTab === tab.id)} onClick={() => onTabClick(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Stats panel component.
 */
interface StatsPanelProps {
  stats: PerformanceStats
}

function StatsPanel({ stats }: StatsPanelProps): React.ReactElement {
  const rowStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    borderBottom: '1px solid rgba(128, 128, 128, 0.2)',
  }

  const labelStyles: React.CSSProperties = {
    opacity: 0.7,
  }

  const valueStyles: React.CSSProperties = {
    fontWeight: 500,
  }

  return (
    <div>
      <div style={rowStyles}>
        <span style={labelStyles}>FPS</span>
        <span style={valueStyles}>{stats.fps}</span>
      </div>
      <div style={rowStyles}>
        <span style={labelStyles}>Frame Time</span>
        <span style={valueStyles}>{stats.frameTime.toFixed(2)}ms</span>
      </div>
      {stats.memoryUsage !== null && (
        <div style={rowStyles}>
          <span style={labelStyles}>Memory</span>
          <span style={valueStyles}>{stats.memoryUsage}MB</span>
        </div>
      )}
      <div style={rowStyles}>
        <span style={labelStyles}>Total Items</span>
        <span style={valueStyles}>{stats.totalItems.toLocaleString()}</span>
      </div>
      <div style={rowStyles}>
        <span style={labelStyles}>Rendered</span>
        <span style={valueStyles}>{stats.renderedItems}</span>
      </div>
      <div style={rowStyles}>
        <span style={labelStyles}>Scroll Position</span>
        <span style={valueStyles}>{Math.round(stats.scrollPosition.offset ?? stats.scrollPosition.scrollTop)}px</span>
      </div>
      <div style={rowStyles}>
        <span style={labelStyles}>Scrolling</span>
        <span style={valueStyles}>{stats.isScrolling ? 'Yes' : 'No'}</span>
      </div>
    </div>
  )
}

/**
 * Viewport panel component.
 */
interface ViewportPanelProps {
  stats: PerformanceStats
  showOverlay: boolean
  showBoundaries: boolean
  onToggleOverlay: () => void
  onToggleBoundaries: () => void
}

function ViewportPanel({
  stats,
  showOverlay,
  showBoundaries,
  onToggleOverlay,
  onToggleBoundaries,
}: ViewportPanelProps): React.ReactElement {
  const rowStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    borderBottom: '1px solid rgba(128, 128, 128, 0.2)',
  }

  const buttonStyles: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid currentColor',
    borderRadius: '4px',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '11px',
    marginTop: '8px',
    marginRight: '8px',
  }

  return (
    <div>
      <div style={rowStyles}>
        <span>Visible Range</span>
        <span>{stats.visibleRange.start} - {stats.visibleRange.end}</span>
      </div>
      <div style={rowStyles}>
        <span>Render Range</span>
        <span>{stats.renderRange.start} - {stats.renderRange.end}</span>
      </div>
      <div style={rowStyles}>
        <span>Overscan Items</span>
        <span>{stats.overscanItems}</span>
      </div>
      <div style={rowStyles}>
        <span>Avg Item Height</span>
        <span>{stats.avgItemHeight.toFixed(1)}px</span>
      </div>
      <div style={rowStyles}>
        <span>Scroll %</span>
        <span>{((stats.scrollPosition.percentage ?? 0) * 100).toFixed(1)}%</span>
      </div>
      <div style={{ marginTop: '12px' }}>
        <button style={{ ...buttonStyles, opacity: showOverlay ? 1 : 0.5 }} onClick={onToggleOverlay}>
          {showOverlay ? '✓' : ''} Viewport Overlay
        </button>
        <button style={{ ...buttonStyles, opacity: showBoundaries ? 1 : 0.5 }} onClick={onToggleBoundaries}>
          {showBoundaries ? '✓' : ''} Item Boundaries
        </button>
      </div>
    </div>
  )
}

/**
 * Items panel component.
 */
interface ItemsPanelProps {
  stats: PerformanceStats
}

function ItemsPanel({ stats }: ItemsPanelProps): React.ReactElement {
  const rowStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    borderBottom: '1px solid rgba(128, 128, 128, 0.2)',
  }

  const efficiency = stats.totalItems > 0
    ? ((stats.renderedItems / stats.totalItems) * 100).toFixed(2)
    : '0'

  return (
    <div>
      <div style={rowStyles}>
        <span>Total Items</span>
        <span>{stats.totalItems.toLocaleString()}</span>
      </div>
      <div style={rowStyles}>
        <span>Visible Items</span>
        <span>{stats.visibleItems}</span>
      </div>
      <div style={rowStyles}>
        <span>Rendered Items</span>
        <span>{stats.renderedItems}</span>
      </div>
      <div style={rowStyles}>
        <span>Overscan Items</span>
        <span>{stats.overscanItems}</span>
      </div>
      <div style={rowStyles}>
        <span>Render Efficiency</span>
        <span>{efficiency}% rendered</span>
      </div>
      <div style={{ ...rowStyles, marginTop: '8px', fontStyle: 'italic', opacity: 0.7 }}>
        <span>Only {stats.renderedItems} of {stats.totalItems.toLocaleString()} items in DOM</span>
      </div>
    </div>
  )
}

/**
 * Events panel component.
 */
interface EventsPanelProps {
  eventLog: EventLogEntry[]
  onClear: () => void
}

function EventsPanel({ eventLog, onClear }: EventsPanelProps): React.ReactElement {
  const buttonStyles: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid currentColor',
    borderRadius: '4px',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '11px',
    marginBottom: '8px',
  }

  const eventStyles: React.CSSProperties = {
    padding: '4px 0',
    borderBottom: '1px solid rgba(128, 128, 128, 0.2)',
    fontSize: '10px',
  }

  const typeColors: Record<string, string> = {
    scroll: '#6bcb77',
    scrollStart: '#4d96ff',
    scrollEnd: '#4d96ff',
    visibleRangeChange: '#ffd93d',
    itemMeasured: '#9b59b6',
    resize: '#ff6b6b',
    loadMore: '#1abc9c',
    itemsChange: '#e74c3c',
  }

  return (
    <div>
      <button style={buttonStyles} onClick={onClear}>
        Clear Log
      </button>
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {eventLog.length === 0 ? (
          <div style={{ opacity: 0.5, fontStyle: 'italic' }}>No events logged</div>
        ) : (
          eventLog.map((entry) => (
            <div key={entry.id} style={eventStyles}>
              <span style={{ color: typeColors[entry.type] ?? '#888' }}>{entry.type}</span>
              <span style={{ opacity: 0.5, marginLeft: '8px' }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
