import { useVirtualizer, Virtualizer, type VirtualItem, type PartialKeys, type ReactVirtualizerOptions } from '@tanstack/react-virtual'
import { useRef, useState, useCallback, type ReactNode, useEffect, type Ref, useImperativeHandle, forwardRef, useMemo } from 'react'

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

type BaseVirtualizerOptions = Omit<PartialKeys<ReactVirtualizerOptions<HTMLDivElement, Element>, "observeElementRect" | "observeElementOffset" | "scrollToFn">, 'getScrollElement' | 'estimateSize'> & {
  estimateSize?: (index: number) => number
}

export interface DataGridProps {
  className?: string
  row: BaseVirtualizerOptions
  column: BaseVirtualizerOptions
  resizeable?: {
    column?: boolean
    row?: boolean
  }
  render: RenderHandler
  corner?: ReactNode
  borderWidth?: number
  exnted?: ReactNode
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

export const DataGrid = forwardRef((props: DataGridProps, ref: Ref<Instance>) => {
  const columnMouseDown = useRef<boolean>(false)
  const rowMouseDown = useRef<boolean>(false)
  const cellMouseDown = useRef<boolean>(false)
  const columnResizing = useRef<boolean>(false)
  const columnResizer = useRef<HTMLDivElement>(null)
  const rowResizing = useRef<boolean>(false)
  const rowResizer = useRef<HTMLDivElement>(null)
  const [actived, setActived] = useState(false)
  const [scrollOffset, setScrollOffset] = useState({ox: false, oy: false})
  const [baseColumn, setBaseColumn] = useState<VirtualItem | null>(null)
  const [baseRow, setBaseRow] = useState<VirtualItem | null>(null)
  const [pos, setPos] = useState<[VirtualItem, VirtualItem] | null>(null)
  const [range, setRange] = useState<Range | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

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

  const handleColumnResize = (e: React.PointerEvent<HTMLDivElement>) => {
    setPos(null)
    setRange(null)
    columnResizing.current = true
    const sx = e.clientX
    const offset = Number(columnResizer.current!.dataset.offset) || 0
    const index = Number(columnResizer.current!.dataset.index) || 0
    const size = Number(columnResizer.current!.dataset.size) || 0
    const defaultCursor = document.documentElement.style.cursor
    document.documentElement.style.cursor = 'col-resize'
    const pointermove = (e: PointerEvent) => {
      let ox = e.clientX - sx
      ox = (size + ox) <= MIN_WIDTH
        ? MIN_WIDTH - size
        : ox
      columnResizer.current!.style.transform = `translateX(${offset + ox}px)`
      columnResizer.current!.dataset.offset = String(offset + ox)
      columnVirtualizer.resizeItem(index, size + ox)
    }

    const mouseup = () => {
      columnResizing.current = false
      document.documentElement.style.cursor = defaultCursor
      window.removeEventListener('pointerup', mouseup, false)
      window.removeEventListener('pointermove', pointermove, false)
    }

    window.addEventListener('pointermove', pointermove, false)
    window.addEventListener('pointerup', mouseup, false)
  }

  const handleRowResize = (e: React.PointerEvent<HTMLDivElement>) => {
    setPos(null)
    setRange(null)
    rowResizing.current = true
    const sy = e.clientY
    const offset = Number(rowResizer.current!.dataset.offset) || 0
    const index = Number(rowResizer.current!.dataset.index) || 0
    const size = Number(rowResizer.current!.dataset.size) || 0
    const defaultCursor = document.documentElement.style.cursor
    document.documentElement.style.cursor = 'row-resize'
    const pointermove = (e: PointerEvent) => {
      let ox = e.clientY - sy
      ox = (size + ox) <= MIN_HEIGHT
        ? MIN_HEIGHT - size
        : ox
      rowResizer.current!.style.transform = `translateX(${offset + ox}px)`
      rowResizer.current!.dataset.offset = String(offset + ox)
      rowVirtualizer.resizeItem(index, size + ox)
    }

    const mouseup = () => {
      rowResizing.current = false
      document.documentElement.style.cursor = defaultCursor
      window.removeEventListener('pointerup', mouseup, false)
      window.removeEventListener('pointermove', pointermove, false)
    }

    window.addEventListener('pointermove', pointermove, false)
    window.addEventListener('pointerup', mouseup, false)
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
      if (scrollOffset.ox !== x || scrollOffset.oy || y) {
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
          {props.resizeable?.column && (
            <div className="column-resizer"
              ref={columnResizer}
              onPointerDown={handleColumnResize}
            ></div>
          )}
          {columns.map((column) => (
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
                columnMouseDown.current = true
                const mouseup = () => {
                  columnMouseDown.current = false
                  window.removeEventListener('pointerup', mouseup, false)
                }
                const mouseleave = () => {
                  columnMouseDown.current = false
                  window.removeEventListener('pointerleave', mouseleave, false)
                }
                document.addEventListener('pointerleave', mouseleave, false)
                window.addEventListener('pointerup', mouseup, false)
              }}
              onPointerEnter={() => {
                if (!columnMouseDown.current && !columnResizing.current && columnResizer.current) {
                  const offset = column.end
                  columnResizer.current.style.transform = `translateX(${offset}px)`
                  columnResizer.current.dataset.index = String(column.index)
                  columnResizer.current.dataset.offset = String(offset)
                  columnResizer.current.dataset.size = String(column.size)
                }
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
              >{props.render(0, column.index, 'column')}</div>
          ))}
        </div>
        <div className={cls('data-grid-row-header', scrollOffset.ox && 'has-scroll')}>
          {rows.length && <div className="row-header-width-hold">{props.render(rows[rows.length - 1].index, 0, 'row')}</div>}
          {props.resizeable?.row && (
            <div className="row-resizer"
              ref={rowResizer}
              onPointerDown={handleRowResize}
            ></div>
          )}
          {rows.map((row) => (
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
                rowMouseDown.current = true
                const mouseup = () => {
                  rowMouseDown.current = false
                  window.removeEventListener('pointerup', mouseup, false)
                }
                const mouseleave = () => {
                  rowMouseDown.current = false
                  window.removeEventListener('pointerleave', mouseleave, false)
                }
                document.addEventListener('pointerleave', mouseleave, false)
                window.addEventListener('pointerup', mouseup, false)
              }}
              onPointerEnter={() => {
                if (!rowMouseDown.current && !rowResizing.current && rowResizer.current) {
                  const offset = row.end
                  rowResizer.current.style.transform = `translateY(${offset}px)`
                  rowResizer.current.dataset.index = String(row.index)
                  rowResizer.current.dataset.offset = String(offset)
                  rowResizer.current.dataset.size = String(row.size)
                }

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
            >{props.render(row.index, 0, 'row')}</div>
          ))}
        </div>
        <div className="data-grid-body"
          style={{
            height: `${height}px`,
            width: `${width}px`,
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
                  )}
                  style={{
                    width: column.size - borderWidth + 'px',
                    height: row.size - borderWidth + 'px',
                    transform: `translateX(${column.start+borderWidth}px)`,
                  }}
                  onPointerDown={(e) => {
                    cellMouseDown.current = true
                    setPos([column, row])
                    if (e.shiftKey && pos) {
                      drawRange(pos, [column, row])
                    } else {
                      drawRange([column, row], [column, row])
                    }

                    const mouseup = () => {
                      cellMouseDown.current = false
                      window.removeEventListener('pointerup', mouseup, false)
                    }
                    const mouseleave = () => {
                      cellMouseDown.current = false
                      window.removeEventListener('pointerleave', mouseleave, false)
                    }
                    document.addEventListener('pointerleave', mouseleave, false)
                    window.addEventListener('pointerup', mouseup, false)
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
      {props.exnted}
    </div>
  )
})

DataGrid.displayName = 'DataGrid'
