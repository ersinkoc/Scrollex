// README / LLMS list the core renderers next to the plugins you pass in `plugins`, but the components register them
// themselves: passing one again throws. The docs must say so.
import React from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import { VirtualGrid } from '../../src/react/components/virtual-grid.js'
import { listRendererPlugin } from '../../src/plugins/core/list-renderer.js'
import { gridRendererPlugin } from '../../src/plugins/core/grid-renderer.js'
import { autoMeasurerPlugin } from '../../src/plugins/core/auto-measurer.js'


beforeEach(() => {
  Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
  Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 300, configurable: true })
})
const data = Array.from({ length: 20 }, (_, i) => i)
const item = ({ item: i, style }: { item: number; style: React.CSSProperties }) => <div style={style}>{i}</div>

async function throws(element: React.ReactElement) {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  let failed = false
  try {
    let v!: ReturnType<typeof render>
    await act(async () => { v = render(element) })
    v.unmount()
  } catch { failed = true }
  spy.mockRestore()
  return failed
}


describe('core renderers cannot be passed as plugins', () => {
  it('should throw for the list and grid renderers and not for the auto measurer (control)', async () => {
    expect(await throws(<VirtualList data={data} itemHeight={40} height={400} plugins={[listRendererPlugin({})]} renderItem={item} />)).toBe(true)
    expect(await throws(<VirtualGrid data={data} columns={2} itemHeight={40} height={400} plugins={[gridRendererPlugin({ columns: 2, rowHeight: 40 })]} renderItem={item} />)).toBe(true)
    expect(await throws(<VirtualList data={data} itemHeight={40} height={400} plugins={[autoMeasurerPlugin()]} renderItem={item} />)).toBe(false)
  })

  it('should say so in the README plugin table and in LLMS.md', () => {
    const read = (file: string) => readFileSync(join(__dirname, '..', '..', file), 'utf8').split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10))
    const readme = read('README.md')
    const table = readme.slice(readme.indexOf('### Available Plugins'), readme.indexOf('## Infinite Scroll'))
    expect(table).toMatch(/already register/)
    expect(read('LLMS.md')).toMatch(/already register `listRendererPlugin`/)
  })
})
