import { faker } from '@faker-js/faker'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { DataGrid, type Instance } from './DataGrid'
import { CaretSortIcon, EnterFullScreenIcon, ExitFullScreenIcon, TriangleDownIcon, TriangleUpIcon } from '@radix-ui/react-icons'
import { downloadCsv } from './exportCsv'

type Align = 'left' | 'right' | 'center'
type SortDirection = 'asc' | 'desc'
type SortState = {
  columnKey: string
  direction: SortDirection
} | null

type CellKind =
  | 'city'
  | 'company'
  | 'country'
  | 'date'
  | 'department'
  | 'email'
  | 'id'
  | 'invoice'
  | 'jobTitle'
  | 'name'
  | 'orders'
  | 'phone'
  | 'plan'
  | 'priority'
  | 'product'
  | 'progress'
  | 'rating'
  | 'revenue'
  | 'sku'
  | 'status'
  | 'avatar'
  | 'change'
  | 'trend'

type Column = {
  key: string
  title: string
  width: number
  kind: CellKind
  align?: Align
}

type TrendValue = {
  color: 'red' | 'green' | 'blue' | 'yellow'
  data: number[]
}

type CellValue = string | TrendValue

const statusValues = ['Active', 'Trial', 'Paused', 'Churned']
const plans = ['Starter', 'Growth', 'Business', 'Enterprise']
const priorities = ['Low', 'Normal', 'High', 'Urgent']

const baseColumnBlueprints: Array<Omit<Column, 'key'>> = [
  { title: 'Avatar', width: 40, kind: 'avatar', align: 'center' },
  { title: 'ID', width: 80, kind: 'id' },
  { title: 'Name', width: 156, kind: 'name', align: 'left' },
  { title: 'Email', width: 240, kind: 'email', align: 'left' },
  { title: 'Company', width: 220, kind: 'company', align: 'left' },
  { title: 'City', width: 144, kind: 'city', align: 'left' },
  { title: 'Progress', width: 120, kind: 'progress' },
  { title: 'Rating', width: 80, kind: 'rating' },
  { title: 'Status', width: 112, kind: 'status' },
  { title: 'Change', width: 92, kind: 'change', align: 'right' },
  { title: 'Trend', width: 100, kind: 'trend', align: 'center' },
  { title: 'Orders', width: 92, kind: 'orders', align: 'right' },
  { title: 'Revenue', width: 120, kind: 'revenue', align: 'right' },
  { title: 'Last seen', width: 140, kind: 'date' },
]

const generatedKinds: CellKind[] = [
  'department',
  'jobTitle',
  'phone',
  'country',
  'invoice',
  'priority',
  'progress',
  'rating',
  'sku',
  'product',
  'company',
  'city',
  'revenue',
  'orders',
  'avatar',
  'change',
  'trend',
]

const columnCountOptions = [5, 10, 20, 50, 100]
const rowCountOptions = [20, 50, 100, 1000, 5000, 10000, 20000, 50000, 100000]

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date)
}

function titleFromKind(kind: CellKind, index: number) {
  if (kind === 'department') return faker.commerce.department()
  if (kind === 'jobTitle') return faker.person.jobArea()
  if (kind === 'phone') return 'Phone'
  if (kind === 'country') return 'Country'
  if (kind === 'invoice') return 'Invoice'
  if (kind === 'priority') return 'Priority'
  if (kind === 'progress') return 'Progress'
  if (kind === 'rating') return 'Rating'
  if (kind === 'sku') return 'SKU'
  if (kind === 'product') return faker.commerce.productName()
  if (kind === 'company') return faker.company.buzzNoun()
  if (kind === 'city') return 'Region'
  if (kind === 'revenue') return 'Amount'
  if (kind === 'orders') return 'Count'
  return `Field ${index + 1}`
}

function widthFromKind(kind: CellKind) {
  if (kind === 'email') return 240
  if (kind === 'company' || kind === 'product') return 220
  if (kind === 'name' || kind === 'jobTitle') return 160
  if (kind === 'phone' || kind === 'country' || kind === 'department') return 148
  if (kind === 'revenue' || kind === 'date') return 124
  if (kind === 'id' || kind === 'invoice' || kind === 'status') return 112
  if (kind === 'orders' || kind === 'progress' || kind === 'rating') return 96
  return 120
}

function alignFromKind(kind: CellKind): Align | undefined {
  if (kind === 'orders' || kind === 'progress' || kind === 'rating' || kind === 'revenue') return 'right'
  if (kind === 'email' || kind === 'company' || kind === 'name' || kind === 'product' || kind === 'jobTitle') return 'left'
  return undefined
}

function createColumns(count: number, seed: number) {
  faker.seed(seed + 17)

  return Array.from({ length: count }, (_, index): Column => {
    const blueprint = baseColumnBlueprints[index]

    if (blueprint) {
      return {
        ...blueprint,
        key: `col_${index}_${blueprint.kind}`,
      }
    }

    const kind = faker.helpers.arrayElement(generatedKinds)
    const title = titleFromKind(kind, index)

    return {
      key: `col_${index}_${kind}`,
      title: `${title} ${index + 1}`,
      width: widthFromKind(kind),
      kind,
      align: alignFromKind(kind),
    }
  })
}

function createCellValue(kind: CellKind, rowIndex: number) {
  if (kind === 'id') return faker.git.commitSha({length: 6}).toUpperCase()
  // if (kind === 'avatar') return `https://picsum.photos/id/${rowIndex}/64/64`
  // https://github.com/faker-js/assets-person-portrait
  if (kind === 'avatar') return `https://cdn.jsdelivr.net/gh/faker-js/assets-person-portrait/${faker.helpers.arrayElement(['male', 'female'])}/64/${rowIndex % 100}.jpg`
  if (kind === 'name') return faker.person.fullName()
  if (kind === 'email') return faker.internet.email().toLowerCase()
  if (kind === 'company') return faker.company.name()
  if (kind === 'city') return faker.location.city()
  if (kind === 'plan') return faker.helpers.arrayElement(plans)
  if (kind === 'status') return faker.helpers.arrayElement(statusValues)
  if (kind === 'orders') return String(faker.number.int({ min: 1, max: 240 }))
  if (kind === 'revenue') return `$${faker.finance.amount({ min: 120, max: 48000, dec: 2 })}`
  if (kind === 'date') return formatDate(faker.date.recent({ days: 120 }))
  if (kind === 'department') return faker.commerce.department()
  if (kind === 'jobTitle') return faker.person.jobTitle()
  if (kind === 'phone') return faker.phone.number()
  if (kind === 'country') return faker.location.country()
  if (kind === 'invoice') return `INV-${faker.string.numeric(7)}`
  if (kind === 'priority') return faker.helpers.arrayElement(priorities)
  if (kind === 'progress') return `${faker.number.int({ min: 0, max: 100 })}%`
  if (kind === 'rating') return faker.number.float({ min: 1, max: 5, fractionDigits: 1 }).toFixed(1)
  if (kind === 'sku') return faker.commerce.isbn({ variant: 13 })
  if (kind === 'change') return faker.helpers.arrayElement(['-', '+']) + faker.number.float({min: 0, max: 10, fractionDigits: 3}).toFixed(3)
  if (kind === 'trend') return {
    color: faker.helpers.arrayElement(['red', 'green', 'blue', 'yellow']),
    data:  Array.from({ length: 20 }, () =>
      Math.floor(Math.random() * 100)
    )
  }
  return faker.commerce.productName()
}

function createRows(count: number, columns: Column[], seed: number) {
  faker.seed(seed + 101)

  return Array.from({ length: count }, (_, rowIndex) => {
    return columns.map(column => createCellValue(column.kind, rowIndex))
  })
}

function isTrendValue(value: CellValue | undefined): value is TrendValue {
  return typeof value === 'object' && value !== null && 'data' in value
}

function cellToText(value: CellValue | undefined) {
  if (!value) return ''
  if (isTrendValue(value)) return value.data.join(' ')
  return value
}

function getCellText(rows: CellValue[][], rowIndex: number, columnIndex: number) {
  return rows[rowIndex]?.[columnIndex] ?? ''
}

function getExportCellText(columns: Column[], rows: CellValue[][], rowIndex: number, columnIndex: number) {
  const column = columns[columnIndex]
  const value = getCellText(rows, rowIndex, columnIndex)

  if (column?.kind === 'rating') return '★'.repeat(Math.max(0, Math.min(5, Math.round(Number(value)))))
  return cellToText(value)
}

function isSortableColumn(column: Column) {
  return !['avatar', 'progress', 'trend'].includes(column.kind)
}

function numericValue(value: string) {
  return Number(value.replace(/[$,%\s,]/g, ''))
}

function cellSortValue(column: Column, value: CellValue | undefined) {
  const text = cellToText(value)

  if (column.kind === 'orders' || column.kind === 'rating' || column.kind === 'revenue' || column.kind === 'change') return numericValue(text)
  if (column.kind === 'date') return Date.parse(text)
  if (column.kind === 'status') return statusValues.indexOf(text)
  if (column.kind === 'priority') return priorities.indexOf(text)
  return text.toLowerCase()
}

function compareCellValues(column: Column, leftValue: CellValue | undefined, rightValue: CellValue | undefined) {
  const left = cellSortValue(column, leftValue)
  const right = cellSortValue(column, rightValue)

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

function sortRows(rows: CellValue[][], columns: Column[], sort: SortState) {
  if (!sort) return rows

  const columnIndex = columns.findIndex(column => column.key === sort.columnKey)
  const column = columns[columnIndex]
  if (!column || !isSortableColumn(column)) return rows

  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const result = compareCellValues(column, a.row[columnIndex], b.row[columnIndex])
      const direction = sort.direction === 'asc' ? 1 : -1
      return result === 0 ? a.index - b.index : result * direction
    })
    .map(item => item.row)
}

function statusClassName(status: string) {
  if (status === 'Active') return 'bg-emerald-50 text-emerald-700'
  if (status === 'Trial') return 'bg-sky-50 text-sky-700'
  if (status === 'Paused') return 'bg-amber-50 text-amber-700'
  return 'bg-rose-50 text-rose-700'
}

function PerfStars(props: { value: number }) {
  const value = props.value % 5
  return (
    <span className="perf-stars">
      {Array.from({length: 5}, (_, i) => {
        return i
      }).map(e => (
        <span key={e} className={`${e <= value ? 'text-[#f59e0b]' : 'text-[#d1d5db]'}`}>★</span>
      ))}
    </span>
  )
}

function ProgressBar(props: {value: string}) {
  return (
    <div className="flex items-center gap-3 w-full max-w-md px-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${props.value}` }}
        />
      </div>
      <span className="w-7 text-gray-600 text-sm font-medium">{props.value}</span>
    </div>
  )
}

function getSmoothPath(points: {x: number; y: number}[]) {
  if (points.length < 2) return ""

  const path = [];

  for (let i = 0; i < points.length; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1] || points[i];
    const p3 = points[i + 2] || p2;

    if (i === 0) {
      path.push(`M ${p1.x} ${p1.y}`);
    }

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  return path.join(" ");
}

const LineChart = (prpos: {
  color: string
  data: number[]
}) => {
  const gradientId = useId()
  const width = 150
  const height = 30
  const COLOR = {
    red: {
      stroke: "#ef4444",
      areaFrom: "#ef4444",
      areaTo: "rgba(239, 68, 68, 0)",
    },

    green: {
      stroke: "#22c55e",
      areaFrom: "#22c55e",
      areaTo: "rgba(34, 197, 94, 0)",
    },

    blue: {
      stroke: "#3b82f6",
      areaFrom: "#3b82f6",
      areaTo: "rgba(59, 130, 246, 0)",
    },

    yellow: {
      stroke: "#ff9f43",
      areaFrom: "#ffb36b",
      areaTo: "#ffb36b",
    }
  }
  const color = COLOR[prpos.color as keyof typeof COLOR]
  const { linePath, areaPath } = useMemo(() => {
    if (!prpos.data.length) return { linePath: "", areaPath: "" };

    const max = Math.max(...prpos.data);
    const min = Math.min(...prpos.data);

    const padding = 10;

    const points = prpos.data.map((v, i) => {
      const x =
        (i / (prpos.data.length - 1)) * (width - padding * 2) + padding;

      const y =
        height -
        ((v - min) / (max - min || 1)) * (height - padding * 2) -
        padding;

      return { x, y };
    });

    const smooth = getSmoothPath(points);

    const area = `
      ${smooth}
      L ${points[points.length - 1].x} ${height}
      L ${points[0].x} ${height}
      Z
    `;

    return {
      linePath: smooth,
      areaPath: area,
    };
  }, [prpos.data, width, height]);

  return (
    <div className="w-full h-full">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color.areaFrom} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color.areaTo} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color.stroke}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export default function FakerDataGridDemo() {
  const ref = useRef<Instance>(null)
  const [fullScreen, setFullScreen] = useState(false)
  const [rowCount, setRowCount] = useState(5000)
  const [columnCount, setColumnCount] = useState(20)
  const [seed, setSeed] = useState(20260704)
  const [sort, setSort] = useState<SortState>(null)
  const columns = useMemo(() => createColumns(columnCount, seed), [columnCount, seed])
  const sourceRows = useMemo(() => createRows(rowCount, columns, seed), [columns, rowCount, seed])
  const rows = useMemo(() => sortRows(sourceRows, columns, sort), [columns, sort, sourceRows])

  useEffect(() => {
    setSort(current => {
      if (!current) return current
      return columns.some(column => column.key === current.columnKey && isSortableColumn(column)) ? current : null
    })
  }, [columns])

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (!ref.current?.range) return
      if (!ref.current.active()) return

      e.preventDefault()

      const lines: string[] = []
      for (let rowIndex = ref.current.range.ty; rowIndex <= ref.current.range.by; rowIndex++) {
        const cells: string[] = []
        for (let columnIndex = ref.current.range.tx; columnIndex <= ref.current.range.bx; columnIndex++) {
          cells.push(cellToText(getCellText(rows, rowIndex, columnIndex)))
        }
        lines.push(cells.join('\t'))
      }

      e.clipboardData?.setData('text/plain', lines.join('\n'))
    }

    document.addEventListener('copy', handleCopy, false)

    return () => {
      document.removeEventListener('copy', handleCopy, false)
    }
  }, [rows])

  const exportCsv = () => {
    downloadCsv(`faker-data-${rowCount}x${columnCount}.csv`, [
      columns.map(column => column.title),
      ...rows.map((_, rowIndex) => columns.map((__, columnIndex) => getExportCellText(columns, rows, rowIndex, columnIndex))),
    ])
  }

  const toggleSort = (column: Column) => {
    if (!isSortableColumn(column)) return

    setSort(current => {
      if (!current || current.columnKey !== column.key) {
        return { columnKey: column.key, direction: 'desc' }
      }

      if (current.direction === 'desc') {
        return { columnKey: column.key, direction: 'asc' }
      }

      return null
    })
  }

  return (
    <div className={`flex flex-col bg-white ${fullScreen ? 'w-screen h-screen absolute left-0 top-0 z-100' : 'w-full h-100 border border-slate-200 rounded-md overflow-hidden'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h1 className="text-base font-semibold leading-6">Faker data</h1>
          <p className="text-xs text-slate-500">Generated with @faker-js/faker.</p>
        </div>
        <div className="flex-1 flex flex-wrap justify-center items-center gap-2">
          <label>
            <select
              className="select"
              value={columnCount}
              onChange={e => setColumnCount(Number(e.target.value))}
            >
              {columnCountOptions.map(count => (
                <option key={count} value={count}>
                  {count} columns
                </option>
              ))}
            </select>
          </label>
          <label>
            <select
              className="select"
              value={rowCount}
              onChange={e => setRowCount(Number(e.target.value))}
            >
              {rowCountOptions.map(count => (
                <option key={count} value={count}>
                  {count >= 1000 ? `${count / 1000}K` : count} rows
                </option>
              ))}
            </select>
          </label>
          <button
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => setSeed(value => value + 1)}
            type="button"
          >
            Regenerate
          </button>
          <button
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => ref.current?.row.scrollToIndex(0, { behavior: 'smooth' })}
            type="button"
          >
            Top
          </button>
          <button
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => ref.current?.row.scrollToIndex(Math.floor(rows.length / 2), { behavior: 'smooth' })}
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
        className="min-h-0 flex-1 overflow-hidden"
        row={{
          count: rows.length,
          estimateSize: () => 30,
          overscan: 8,
        }}
        column={{
          count: columns.length,
          estimateSize: index => columns[index]?.width ?? 120,
          overscan: 3,
        }}
        render={(rowIndex, columnIndex, type) => {
          const column = columns[columnIndex]

          if (type === 'column') {
            if (!column) return null
            const sortable = isSortableColumn(column)
            const sortDirection = sort?.columnKey === column.key ? sort.direction : null
            const SortIcon = sortDirection === 'asc'
              ? TriangleUpIcon
              : sortDirection === 'desc'
                ? TriangleDownIcon
                : CaretSortIcon

            if (sortable) {
              return (
                <button
                  className="flex h-full w-full cursor-pointer items-center justify-between gap-2 overflow-hidden px-3 text-left text-xs font-semibold uppercase"
                  onClick={e => {
                    e.stopPropagation()
                    toggleSort(column)
                  }}
                 
                  title={`Sort by ${column.title}`}
                  type="button"
                >
                  <span className="min-w-0 overflow-hidden text-ellipsis text-nowrap">{column.title}</span>
                  <SortIcon className={sortDirection ? 'shrink-0 text-slate-900' : 'shrink-0 text-slate-300'} />
                </button>
              )
            }

            return (
              <div className="w-full overflow-hidden text-ellipsis text-nowrap px-3 text-xs font-semibold uppercase">
                {column.title}
              </div>
            )
          }

          if (type === 'row') {
            return <span className="px-2 text-xs tabular-nums text-slate-500">{rowIndex + 1}</span>
          }

          const value = rows[rowIndex]?.[columnIndex]
          if (!column || !value) return null
          const textValue = cellToText(value)

          if (column.kind === 'status') {
            return (
              <div className="flex w-full items-center justify-center px-2">
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusClassName(textValue)}`}>
                  {textValue}
                </span>
              </div>
            )
          }

          if (column.kind === 'avatar') {
            return (
              <div>
                <img src={textValue} alt="avatar" className="w-6 h-6 rounded-sm" />
              </div>
            )
          }

          if (column.kind === 'rating') {
            return <PerfStars value={Number(textValue)} />
          }

          if (column.kind === 'progress') {
            return <ProgressBar value={textValue} />
          }

          if (column.kind === 'trend') {
            if (!isTrendValue(value)) return null
            return <LineChart color={value.color} data={value.data} />
          }

          if (column.kind === 'change') {
            return <span className={`${textValue.startsWith('-') ? 'text-green-500' : 'text-red-400'}`}>{textValue}</span>
          }

          return (
            <div
              className={`w-full overflow-hidden text-ellipsis text-nowrap px-3 text-sm ${
                column.align === 'right'
                  ? 'text-right tabular-nums'
                  : column.align === 'center'
                    ? 'text-center'
                    : 'text-left'
              }`}
            >
              {textValue}
            </div>
          )
        }}
      />
    </div>
  )
}
