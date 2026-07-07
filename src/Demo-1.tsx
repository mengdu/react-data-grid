import { useEffect, useMemo, useRef, useState } from 'react'
import { DataGrid, type Instance } from './DataGrid'
import { EnterFullScreenIcon, ExitFullScreenIcon } from '@radix-ui/react-icons'
import { downloadCsv } from './exportCsv'

function genColumn(n: number) {
  let v = ''
  while (n > 0) {
    n--
    v = String.fromCharCode(65 + (n % 26)) + v
    n = Math.floor(n / 26)
  }
  return v
}

export default function GridVirtualizerFixed() {
  const ref = useRef<Instance>(null)
  const [fullScreen, setFullScreen] = useState(false)
  const [rows, setRows] = useState(10000)
  const [columns, setColumns] = useState(100)
  const [borderWidth, setBorderWidth] = useState(1)

  const { cols, data } = useMemo(() => {
    const cols = new Array(columns).fill(0).map((_, i) => genColumn(i + 1))
    const data: string[][] = []

    for (let r = 0; r < rows; r++) {
      const row: string[] = []
      for (let c = 0; c < columns; c++) {
        row.push(`${cols[c]}${r + 1}`)
      }
      data.push(row)
    }

    return {
      cols,
      data,
    }
  }, [rows, columns])

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (!ref.current?.range) return
      if (!ref.current.active()) return
      e.preventDefault()
      const arr: string[] = []
      for (let i = ref.current.range.ty; i <= ref.current.range.by; i++) {
        const line = []
        for (let j = ref.current.range.tx; j <= ref.current.range.bx; j++) {
          line.push(data[i][j])
        }
        arr.push(line.join(' '))
      }

      const text = arr.join('\n')
      e.clipboardData?.setData('text/plain', text)
    }

    document.addEventListener('copy', handleCopy, false)

    return () => {
      document.removeEventListener('copy', handleCopy, false)
    }
  }, [data])

  const exportCsv = () => {
    downloadCsv(`sheet-${rows}x${columns}.csv`, [
      ['', ...cols],
      ...data.map((row, index) => [index + 1, ...row]),
    ])
  }

  return (
    <div className={`flex flex-col bg-white ${fullScreen ? 'w-screen h-screen absolute left-0 top-0 z-100' : 'w-full h-100 border border-slate-200 rounded-md overflow-hidden'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h1 className="text-base font-semibold leading-6">Sheet</h1>
          <p className="text-xs text-slate-500">Sheet example.</p>
        </div>
        <div className="flex-1 flex flex-wrap justify-center items-center gap-2">
          <label>
            <select
              className="select"
              value={columns}
              onChange={e => setColumns(Number(e.target.value))}
            >
              <option value="10">10 columns</option>
              <option value="30">30 columns</option>
              <option value="50">50 columns</option>
              <option value="100">100 columns</option>
              <option value="1000">1K columns</option>
            </select>
          </label>
          <label>
            <select
              className="select"
              value={rows}
              onChange={e => setRows(Number(e.target.value))}
            >
              <option value="10">10 rows</option>
              <option value="50">50 rows</option>
              <option value="100">100 rows</option>
              <option value="1000">1K rows</option>
              <option value="10000">10K rows</option>
              <option value="50000">50K rows</option>
              <option value="100000">100K rows</option>
            </select>
          </label>
          <label>
            <select
              className="select"
              value={borderWidth}
              onChange={e => setBorderWidth(Number(e.target.value))}
            >
              <option value="0">None</option>
              <option value="1">1 Border</option>
              <option value="2">2 Border</option>
              <option value="3">3 Border</option>
            </select>
          </label>
          <button
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => ref.current?.row.scrollToIndex(0, { behavior: 'smooth' })}
            type="button"
          >
            Top
          </button>
          <button
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => ref.current?.row.scrollToIndex(Math.floor(rows / 2), { behavior: 'smooth' })}
            type="button"
          >
            Middle
          </button>
          <button
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => ref.current?.row.scrollToEnd({ behavior: 'smooth' })}
            type="button"
          >
            End
          </button>
          <button
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
            onClick={exportCsv}
            type="button"
          >
            Export CSV
          </button>
          {/* <button
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => {
              ref.current?.row.measure()
              ref.current?.column.measure()
            }}
            type="button"
          >
            Measure
          </button> */}
        </div>
        <div>
          <button className="cursor-pointer" 
            title={fullScreen ? 'Exit full screen' : 'Full screen'}
            onClick={() => setFullScreen(!fullScreen)}
          >
            {fullScreen ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
          </button>
        </div>
      </div>
      <DataGrid
        ref={ref}
        className="flex-1 overflow-hidden border-t border-slate-200"
        row={{
          count: rows,
          overscan: 5,
        }}
        column={{
          count: columns,
          overscan: 5,
        }}
        columnResize
        rowResize
        borderWidth={borderWidth}
        render={(r, c, type) => {
          if (type === 'column') return cols[c]
          if (type === 'row') return r + 1
          return <div className="text-nowrap overflow-hidden text-ellipsis">{data[r][c]}</div>
        }}
      />
    </div>
  )
}
