import { useVirtualizer, Virtualizer, type VirtualItem, type PartialKeys, type ReactVirtualizerOptions } from '@tanstack/react-virtual'
import { useRef, useState, useCallback, type ReactNode, useEffect, type Ref, useImperativeHandle, forwardRef, useMemo, Fragment } from 'react'

function cls(...arr: any[]) {
  return arr.filter(Boolean).join(' ')
}

function inRange(a: number, b: number, x: number) {
  return a <= x && x <= b
}

export interface Range {
  x: number
  y: number
  w: number
  h: number
  tx: number
  ty: number
  bx: number
  by: number
}

export type RenderHandler = (row: number, column: number, type: 'cell' | 'row' | 'column') => ReactNode
export type ResizeConfig = boolean | ((index: number) => [number, number])

export type BaseVirtualizerOptions = Omit<PartialKeys<ReactVirtualizerOptions<HTMLDivElement, Element>, "observeElementRect" | "observeElementOffset" | "scrollToFn">, 'getScrollElement' | 'estimateSize'> & {
  estimateSize?: (index: number) => number
}

export interface DataGridProps {
  className?: string
  row: BaseVirtualizerOptions
  column: BaseVirtualizerOptions
  rowResize?: ResizeConfig
  columnResize?: ResizeConfig
  render: RenderHandler
  corner?: ReactNode
  borderWidth?: number
  extra?: ReactNode
}

export interface Instance {
  el?: HTMLDivElement | null
  range: Range | null
  row: Virtualizer<HTMLDivElement, Element>
  column: Virtualizer<HTMLDivElement, Element>
  active: () => boolean
  clearSelection: () => void
}

const MIN_WIDTH = 40
const MIN_HEIGHT = 20
const RESIZER_WIDTH = 3

function getResizeRange(config: ResizeConfig | undefined, index: number, fallbackMin: number): [number, number] | null {
  if (!config) return null
  if (config === true) return [fallbackMin, Number.POSITIVE_INFINITY]

  const [min, max] = config(index)
  const minSize = Number.isFinite(min) ? Math.max(0, min) : fallbackMin
  const maxSize = Number.isFinite(max) ? Math.max(minSize, max) : Number.POSITIVE_INFINITY

  return [minSize, maxSize]
}

export const DataGrid = forwardRef((props: DataGridProps, ref: Ref<Instance>) => {
  const columnMouseDown = useRef<boolean>(false)
  const rowMouseDown = useRef<boolean>(false)
  const cellMouseDown = useRef<boolean>(false)
  const columnResizing = useRef<boolean>(false)
  const rowResizing = useRef<boolean>(false)
  const pointerCleanupRef = useRef<(() => void) | null>(null)
  const [actived, setActived] = useState(false)
  const [scrollOffset, setScrollOffset] = useState({ox: false, oy: false})
  const [baseColumn, setBaseColumn] = useState<VirtualItem | null>(null)
  const [baseRow, setBaseRow] = useState<VirtualItem | null>(null)
  const [pos, setPos] = useState<[VirtualItem, VirtualItem] | null>(null)
  const [range, setRange] = useState<Range | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const startPointerSelection = useCallback((mouseDown: { current: boolean }) => {
    pointerCleanupRef.current?.()
    mouseDown.current = true

    const cleanup = () => {
      mouseDown.current = false
      window.removeEventListener('pointerup', cleanup, false)
      window.removeEventListener('pointercancel', cleanup, false)
      document.removeEventListener('pointerleave', cleanup, false)
      if (pointerCleanupRef.current === cleanup) pointerCleanupRef.current = null
    }

    pointerCleanupRef.current = cleanup
    window.addEventListener('pointerup', cleanup, false)
    window.addEventListener('pointercancel', cleanup, false)
    document.addEventListener('pointerleave', cleanup, false)
  }, [])

  const startPointerResize = useCallback((resizing: { current: boolean }, cursor: string, pointermove: (e: PointerEvent) => void) => {
    pointerCleanupRef.current?.()
    resizing.current = true
    const defaultCursor = document.documentElement.style.cursor
    document.documentElement.style.cursor = cursor

    const cleanup = () => {
      resizing.current = false
      document.documentElement.style.cursor = defaultCursor
      window.removeEventListener('pointermove', pointermove, false)
      window.removeEventListener('pointerup', cleanup, false)
      window.removeEventListener('pointercancel', cleanup, false)
      window.removeEventListener('blur', cleanup, false)
      document.removeEventListener('pointerleave', cleanup, false)
      if (pointerCleanupRef.current === cleanup) pointerCleanupRef.current = null
    }

    pointerCleanupRef.current = cleanup
    window.addEventListener('pointermove', pointermove, false)
    window.addEventListener('pointerup', cleanup, false)
    window.addEventListener('pointercancel', cleanup, false)
    window.addEventListener('blur', cleanup, false)
    document.addEventListener('pointerleave', cleanup, false)
  }, [])

  useEffect(() => () => pointerCleanupRef.current?.(), [])

  const borderWidth = useMemo(() => props.borderWidth ?? 1, [props.borderWidth])

  const getScrollElement = useCallback(() => {
    return parentRef.current
  }, [])
  const estimateRowSize = useCallback((i: number) => (props.row.estimateSize?.(i) ?? 24) + borderWidth, [props.row, borderWidth])
  const estimateColumnSize = useCallback((i: number) => (props.column.estimateSize?.(i) ?? 79) + borderWidth, [props.column, borderWidth])

  const rowVirtualizer = useVirtualizer({
    ...props.row,
    getScrollElement,
    estimateSize: estimateRowSize,
  })

  const columnVirtualizer = useVirtualizer({
    ...props.column,
    horizontal: true,
    getScrollElement,
    estimateSize: estimateColumnSize,
  })

  const drawRange = (from: [VirtualItem, VirtualItem] | null, to: [VirtualItem, VirtualItem] | null) => {
    if (!cellMouseDown.current) return
    if (!from || !to) {
      setRange(null)
      return
    }
    const [sx, sy] = from
    const [ex, ey] = to
    let x, y, w, h
    if (ex.index < sx.index || ey.index < sy.index) {
      x = Math.min(sx.start, ex.start)
      y = Math.min(sy.start, ey.start)
      w = sx.index > ex.index
        ? sx.end - ex.start
        : ex.end - sx.start
      h = sy.index > ey.index
        ? sy.end - ey.start
        : ey.end - sy.start
    } else {
      x = sx.start
      y = sy.start
      w = ex.end - x
      h = ey.end - y
    }
    const tx = Math.min(sx.index, ex.index)
    const ty = Math.min(sy.index, ey.index)
    const bx = Math.max(sx.index, ex.index)
    const by = Math.max(sy.index, ey.index)
    setRange({x, y, w, h, tx, ty, bx, by})
  }

  const handleColumnResize = (e: React.PointerEvent<HTMLDivElement>, col: VirtualItem) => {
    const resizeRange = getResizeRange(props.columnResize, col.index, MIN_WIDTH)
    if (!resizeRange) return

    setPos(null)
    setRange(null)
    e.stopPropagation()
    const sx = e.clientX
    const startSize = col.size - borderWidth

    const pointermove = (e: PointerEvent) => {
      const nextSize = Math.min(Math.max(startSize + e.clientX - sx, resizeRange[0]), resizeRange[1])
      columnVirtualizer.resizeItem(col.index, nextSize + borderWidth)
    }

    startPointerResize(columnResizing, 'col-resize', pointermove)
  }

  const handleRowResize = (e: React.PointerEvent<HTMLDivElement>, row: VirtualItem) => {
    const resizeRange = getResizeRange(props.rowResize, row.index, MIN_HEIGHT)
    if (!resizeRange) return

    e.stopPropagation()
    setPos(null)
    setRange(null)
    const sy = e.clientY
    const startSize = row.size - borderWidth

    const pointermove = (e: PointerEvent) => {
      const nextSize = Math.min(Math.max(startSize + e.clientY - sy, resizeRange[0]), resizeRange[1])
      rowVirtualizer.resizeItem(row.index, nextSize + borderWidth)
    }

    startPointerResize(rowResizing, 'row-resize', pointermove)
  }

  const rows = rowVirtualizer.getVirtualItems()
  const columns = columnVirtualizer.getVirtualItems()
  const height = rowVirtualizer.getTotalSize()
  const width = columnVirtualizer.getTotalSize()

  useImperativeHandle(ref, () => {
    return {
      el: parentRef.current,
      range: range,
      row: rowVirtualizer,
      column: columnVirtualizer,
      active() {
        return document.activeElement === parentRef.current
      },
      clearSelection() {
        setRange(null)
        setPos(null)
      }
    }
  })

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const onscroll = () => {
      const x = (parentRef.current?.scrollLeft || 0) > 0
      const y = (parentRef.current?.scrollTop || 0) > 0
      if (scrollOffset.ox !== x || scrollOffset.oy !== y) {
        setScrollOffset({ox: x, oy: y})
      }
    }
    el.addEventListener('scroll', onscroll, false)
    return () => {
      el?.removeEventListener('scroll', onscroll, false)
    }
  }, [scrollOffset])

  return (
    <div className={cls('data-grid', props.className)}>
      <div className={cls('data-grid-container', actived && 'actived')} ref={parentRef}
        tabIndex={0}
        style={{'--data-grid-border-width': `${borderWidth}px`} as React.CSSProperties}
        onFocus={() => {
          setActived(true)
        }}
        onBlur={() => {
          setActived(false)
        }}
      >
        <div className="data-grid-corner"
          onClick={() => {
            setRange({x: 0, y: 0, w: width, h: height, tx: 0, ty: 0, bx: columnVirtualizer.options.count - 1, by: rowVirtualizer.options.count - 1})
          }}
          >
          {props.corner}
        </div>
        <div className={cls('data-grid-column-header', scrollOffset.oy && 'has-scroll')}>
          {columns.map((column) => (
            <Fragment key={column.key}>
              <div
                key={column.key}
                className={cls(
                  'data-grid-cell head',
                  range && inRange(range.tx, range.bx, column.index) && 'in-range',
                  range && inRange(range.tx, range.bx, column.index) && range.ty === 0 && range.by === rowVirtualizer.options.count - 1 && 'full-selected'
                )}
                style={{
                  width: column.size - borderWidth + 'px',
                  transform: `translateX(${column.start + borderWidth}px)`,
                }}
                onPointerDown={() => {
                  setPos(null)
                  setBaseColumn(column)
                  setBaseRow(null)
                  setRange({x: column.start, y: 0, w: column.size, h: height, tx: column.index, ty: 0, bx: column.index, by: rowVirtualizer.options.count - 1})
                  startPointerSelection(columnMouseDown)
                }}
                onPointerEnter={() => {
                  if (columnResizing.current) return
                  if (!columnMouseDown.current) return
                  if (!range) return
                  if (!baseColumn) return
                  if (column.index > baseColumn.index) {
                    setRange(v => {
                      if (!v) return v
                      v.w = column.end - baseColumn.start
                      v.bx = column.index
                      return {...v}
                    })
                  } else {
                    setRange(v => {
                      if (!v) return v
                      v.w = baseColumn.end - column.start
                      v.x = column.start
                      v.tx = column.index
                      v.bx = baseColumn.index
                      return {...v}
                    })
                  }
                }}
                >
                  {props.render(0, column.index, 'column')}
              </div>
              {props.columnResize && (
                <div key={'resizer' + column.key} className="column-resizer"
                  style={{
                    transform: `translateX(${column.end + (borderWidth / 2 - RESIZER_WIDTH / 2)}px)`,
                  }}
                  onPointerDown={(e) => handleColumnResize(e, column)}
                ></div>
              )}
            </Fragment>
          ))}
          <div key={'data-grid-helper'} className="data-grid-helper">
            {range && (
              <div className="data-grid-selection"
              style={{
                transform: `translate(${range.x}px, 0px)`,
                width: `${range.w+borderWidth}px`,
                height: `100%`,
                borderWidth: `${borderWidth || 1}px`,
              }}
              ></div>
            )}
            {range && (
              <div className="data-grid-selection bg"
              style={{
                transform: `translate(${range.x}px, 0px)`,
                width: `${range.w+borderWidth}px`,
                height: `100%`,
              }}
              ></div>
            )}
          </div>
        </div>
        <div className={cls('data-grid-row-header', scrollOffset.ox && 'has-scroll')}>
          {rows.length && <div className="row-header-width-hold">{props.render(rows[rows.length - 1].index, 0, 'row')}</div>}
          {rows.map((row) => (
            <Fragment key={row.key}>
              <div
                key={row.key}
                className={cls(
                  'data-grid-cell',
                  ((row.index + 1) % 2) === 0 ? 'even' : 'odd',
                  (row.index + 1) % 6 === 3 && 'nth6n-3',
                  (row.index + 1) % 6 === 0 && 'nth6n-6',
                  range && inRange(range.ty, range.by, row.index) && 'in-range',
                  range && inRange(range.ty, range.by, row.index) && range.tx === 0 && range.bx === columnVirtualizer.options.count - 1 && 'full-selected'
                )}
                style={{
                  height: row.size - borderWidth + 'px',
                  transform: `translateY(${row.start + borderWidth}px)`,
                }}
                onPointerDown={() => {
                  setPos(null)
                  setBaseColumn(null)
                  setBaseRow(row)
                  setRange({x: 0, y: row.start, w: width, h: row.size, tx: 0, ty: row.index, bx: columnVirtualizer.options.count - 1, by: row.index})
                  startPointerSelection(rowMouseDown)
                }}
                onPointerEnter={() => {
                  if (rowResizing.current) return
                  if (!rowMouseDown.current) return
                  if (!range) return
                  if (!baseRow) return
                  if (row.index > baseRow.index) {
                    setRange(v => {
                      if (!v) return v
                      v.h = row.end - baseRow.start
                      v.by = row.index
                      return {...v}
                    })
                  } else {
                    setRange(v => {
                      if (!v) return v
                      v.h = baseRow.end - row.start
                      v.y = row.start
                      v.ty = row.index
                      v.by = baseRow.index
                      return {...v}
                    })
                  }
                }}
              >
                {props.render(row.index, 0, 'row')}
              </div>
              {props.rowResize && (
                <div key={'resizer' + row.key} className="row-resizer"
                  style={{
                    transform: `translateY(${row.end + (borderWidth / 2 - RESIZER_WIDTH / 2)}px)`,
                  }}
                  onPointerDown={(e) => handleRowResize(e, row)}
                ></div>
              )}
            </Fragment>
          ))}
          <div className="data-grid-helper">
            {range && (
              <div className="data-grid-selection"
              style={{
                transform: `translate(0px, ${range.y}px)`,
                width: `100%`,
                height: `${range.h+borderWidth}px`,
                borderWidth: `${borderWidth || 1}px`,
              }}
              ></div>
            )}
            {range && (
              <div className="data-grid-selection bg"
              style={{
                transform: `translate(0px, ${range.y}px)`,
                width: `100%`,
                height: `${range.h+borderWidth}px`,
              }}
              ></div>
            )}
          </div>
        </div>
        <div className="data-grid-body"
          style={{
            width: `${width + borderWidth}px`,
            height: `${height + borderWidth}px`,
          }}
        >
          <div className="data-grid-helper">
            {range && (
              <div className="data-grid-selection"
              style={{
                transform: `translate(${range.x}px, ${range.y}px)`,
                width: `${range.w+borderWidth}px`,
                height: `${range.h+borderWidth}px`,
                borderWidth: `${borderWidth || 1}px`,
              }}
              ></div>
            )}
            {range && (
              <div className="data-grid-selection bg"
              style={{
                transform: `translate(${range.x}px, ${range.y}px)`,
                width: `${range.w+borderWidth}px`,
                height: `${range.h+borderWidth}px`,
              }}
              ></div>
            )}
            {pos && (
              <div className="data-grid-selection-anchor"
              style={{
                transform: `translate(${pos[0].start}px, ${pos[1].start}px)`,
                width: `${pos[0].size+borderWidth}px`,
                height: `${pos[1].size+borderWidth}px`,
                borderWidth: `${borderWidth <= 1 ? 2 : borderWidth}px`,
              }}
              ></div>
            )}
          </div>
          {rows.map((row) => (
            <div
              key={row.key}
              className={cls(
                'data-grid-row',
                ((row.index + 1) % 2) === 0 ? 'even' : 'odd',
                (row.index + 1) % 6 === 3 && 'nth6n-3',
                (row.index + 1) % 6 === 0 && 'nth6n-6',
                (pos && row.index === pos[1].index) && 'current-row'
              )}
              style={{
                height: row.size - borderWidth + 'px',
                transform: `translateY(${row.start + borderWidth}px)`,
              }}
            >
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={cls(
                    'data-grid-cell',
                    (row.index + 1) % 6 === 3 && 'nth6n-3',
                    (row.index + 1) % 6 === 0 && 'nth6n-6',
                    (pos && column.index === pos[0].index) && 'current-column',
                  )}
                  style={{
                    width: column.size - borderWidth + 'px',
                    height: row.size - borderWidth + 'px',
                    transform: `translateX(${column.start+borderWidth}px)`,
                  }}
                  onPointerDown={(e) => {
                    startPointerSelection(cellMouseDown)
                    setPos([column, row])
                    if (e.shiftKey && pos) {
                      drawRange(pos, [column, row])
                    } else {
                      drawRange([column, row], [column, row])
                    }
                  }}
                  onPointerEnter={() => {
                    drawRange(pos, [column, row])
                  }}
                  >{props.render(row.index, column.index, 'cell')}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {props.extra}
    </div>
  )
})

DataGrid.displayName = 'DataGrid'
