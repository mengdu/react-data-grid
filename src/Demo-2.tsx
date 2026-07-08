import { faker } from '@faker-js/faker'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { DataGrid, type Instance } from './DataGrid'
import { CaretSortIcon, ChevronRightIcon, Cross2Icon, EnterFullScreenIcon, ExitFullScreenIcon, TriangleDownIcon, TriangleUpIcon } from '@radix-ui/react-icons'
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
  | 'intraday'
  | 'kline'
  | 'volume'
  | 'macd'

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

type KLineItem = {
  open: number
  close: number
  high: number
  low: number
}

type KLineValue = {
  data: KLineItem[]
}

type IntradayItem = {
  price: number
  average: number
}

type IntradayValue = {
  previousClose: number
  data: IntradayItem[]
}

type MacdItem = {
  dif: number
  dea: number
  macd: number
}

type MacdValue = {
  data: MacdItem[]
}

type VolumeItem = {
  value: number
  rising: boolean
}

type VolumeValue = {
  data: VolumeItem[]
}

type CellValue = string | TrendValue | IntradayValue | KLineValue | VolumeValue | MacdValue

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
  { title: 'Intraday', width: 132, kind: 'intraday', align: 'center' },
  { title: 'K Line', width: 132, kind: 'kline', align: 'center' },
  { title: 'Volume', width: 132, kind: 'volume', align: 'center' },
  { title: 'MACD', width: 132, kind: 'macd', align: 'center' },
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
  'intraday',
  'kline',
  'volume',
  'macd',
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

const style = getComputedStyle(document.body)
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
if (ctx) {
  ctx.font = [
    style.fontStyle,
    style.fontVariant,
    style.fontWeight,
    style.fontSize,
    style.fontFamily
  ].join(' ')
}

function widthFromKind(kind: CellKind, title: string) {
  if (kind === 'email') return 240
  if (kind === 'company' || kind === 'product') return 220
  if (kind === 'name' || kind === 'jobTitle') return 160
  if (kind === 'phone' || kind === 'country' || kind === 'department') return 148
  if (kind === 'revenue' || kind === 'date') return 124
  if (kind === 'id' || kind === 'invoice' || kind === 'status') return 112
  if (kind === 'orders' || kind === 'progress' || kind === 'rating') return 96
  return ctx?.measureText(title).width ?? title.length * 7
}

function alignFromKind(kind: CellKind): Align | undefined {
  if (kind === 'orders' || kind === 'progress' || kind === 'rating' || kind === 'revenue') return 'right'
  if (kind === 'email' || kind === 'company' || kind === 'name' || kind === 'product' || kind === 'jobTitle') return 'left'
  if (kind === 'trend' || kind === 'intraday' || kind === 'kline' || kind === 'volume' || kind === 'macd') return 'center'
  return undefined
}

function createIntradayData(length = 80): IntradayValue {
  const previousClose = faker.number.float({ min: 80, max: 130, fractionDigits: 2 })
  let price = previousClose + faker.number.float({ min: -1.5, max: 1.5, fractionDigits: 2 })
  let total = 0

  const data = Array.from({ length }, (_, index) => {
    const wave = Math.sin(index / 9) * 0.5
    price += faker.number.float({ min: -0.45, max: 0.45, fractionDigits: 2 }) + wave * 0.08
    total += price

    return {
      price: Number(price.toFixed(2)),
      average: Number((total / (index + 1)).toFixed(2)),
    }
  })

  return {
    previousClose: Number(previousClose.toFixed(2)),
    data,
  }
}

function createKLineData(length = 16): KLineItem[] {
  let lastClose = faker.number.float({ min: 70, max: 120, fractionDigits: 2 })

  return Array.from({ length }, () => {
    const open = lastClose + faker.number.float({ min: -3, max: 3, fractionDigits: 2 })
    const close = open + faker.number.float({ min: -5, max: 5, fractionDigits: 2 })
    const high = Math.max(open, close) + faker.number.float({ min: 0.5, max: 4.5, fractionDigits: 2 })
    const low = Math.min(open, close) - faker.number.float({ min: 0.5, max: 4.5, fractionDigits: 2 })

    lastClose = close

    return {
      open: Number(open.toFixed(2)),
      close: Number(close.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
    }
  })
}

function createMacdData(length = 24): MacdItem[] {
  let dif = faker.number.float({ min: -1.8, max: 1.8, fractionDigits: 2 })
  let dea = dif * 0.65

  return Array.from({ length }, () => {
    dif += faker.number.float({ min: -0.8, max: 0.8, fractionDigits: 2 })
    dea = dea * 0.72 + dif * 0.28
    const macd = (dif - dea) * 2

    return {
      dif: Number(dif.toFixed(2)),
      dea: Number(dea.toFixed(2)),
      macd: Number(macd.toFixed(2)),
    }
  })
}

function createVolumeData(length = 20): VolumeItem[] {
  return Array.from({ length }, (_, index) => {
    const wave = Math.sin(index / 2.2) * 0.28 + 1
    const value = faker.number.int({ min: 8000, max: 88000 }) * wave

    return {
      value: Math.round(value),
      rising: faker.datatype.boolean(),
    }
  })
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
      title: title,
      width: widthFromKind(kind, title) + 10 * 2 + 15,
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
  if (kind === 'intraday') return createIntradayData()
  if (kind === 'kline') return {
    data: createKLineData()
  }
  if (kind === 'volume') return {
    data: createVolumeData()
  }
  if (kind === 'macd') return {
    data: createMacdData()
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
  return typeof value === 'object' && value !== null && 'color' in value
}

function isKLineValue(value: CellValue | undefined): value is KLineValue {
  return typeof value === 'object' && value !== null && 'data' in value && value.data.some(item => typeof item === 'object' && item !== null && 'open' in item)
}

function isIntradayValue(value: CellValue | undefined): value is IntradayValue {
  return typeof value === 'object' && value !== null && 'previousClose' in value && 'data' in value && value.data.some(item => typeof item === 'object' && item !== null && 'price' in item)
}

function isMacdValue(value: CellValue | undefined): value is MacdValue {
  return typeof value === 'object' && value !== null && 'data' in value && value.data.some(item => typeof item === 'object' && item !== null && 'macd' in item)
}

function isVolumeValue(value: CellValue | undefined): value is VolumeValue {
  return typeof value === 'object' && value !== null && 'data' in value && value.data.some(item => typeof item === 'object' && item !== null && 'value' in item && 'rising' in item)
}

function cellToText(value: CellValue | undefined) {
  if (!value) return ''
  if (isTrendValue(value)) return value.data.join(' ')
  if (isIntradayValue(value)) return value.data.map(item => `${item.price}/${item.average}`).join(' ')
  if (isKLineValue(value)) return value.data.map(item => `${item.open}/${item.high}/${item.low}/${item.close}`).join(' ')
  if (isVolumeValue(value)) return value.data.map(item => `${item.value}/${item.rising ? 'up' : 'down'}`).join(' ')
  if (isMacdValue(value)) return value.data.map(item => `${item.dif}/${item.dea}/${item.macd}`).join(' ')
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
  return !['avatar', 'progress', 'trend', 'intraday', 'kline', 'volume', 'macd'].includes(column.kind)
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

const KLineChart = (props: {
  data: KLineItem[]
}) => {
  const width = 150
  const height = 34
  const paddingX = 7
  const paddingY = 4
  const candleGap = 2
  const risingColor = '#ef4444'
  const fallingColor = '#22c55e'

  const { candles } = useMemo(() => {
    if (!props.data.length) return { candles: [] }

    const max = Math.max(...props.data.map(item => item.high))
    const min = Math.min(...props.data.map(item => item.low))
    const scaleY = (value: number) => {
      return height - paddingY - ((value - min) / (max - min || 1)) * (height - paddingY * 2)
    }
    const slotWidth = (width - paddingX * 2) / props.data.length
    const bodyWidth = Math.max(2, Math.min(6, slotWidth - candleGap))

    return {
      candles: props.data.map((item, index) => {
        const centerX = paddingX + slotWidth * index + slotWidth / 2
        const openY = scaleY(item.open)
        const closeY = scaleY(item.close)
        const highY = scaleY(item.high)
        const lowY = scaleY(item.low)
        const bodyTop = Math.min(openY, closeY)
        const bodyHeight = Math.max(1, Math.abs(closeY - openY))
        const rising = item.close >= item.open

        return {
          key: index,
          centerX,
          bodyX: centerX - bodyWidth / 2,
          bodyTop,
          bodyWidth,
          bodyHeight,
          highY,
          lowY,
          color: rising ? risingColor : fallingColor,
        }
      }),
    }
  }, [props.data])

  return (
    <div className="h-full w-full px-1 py-0.5">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {candles.map(item => (
          <g key={item.key}>
            <line
              x1={item.centerX}
              x2={item.centerX}
              y1={item.highY}
              y2={item.lowY}
              stroke={item.color}
              strokeWidth="1"
              strokeLinecap="round"
            />
            <rect
              x={item.bodyX}
              y={item.bodyTop}
              width={item.bodyWidth}
              height={item.bodyHeight}
              rx="0.75"
              fill={item.color}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

const IntradayChart = (props: {
  previousClose: number
  data: IntradayItem[]
}) => {
  const gradientId = useId()
  const width = 150
  const height = 34
  const paddingX = 7
  const paddingY = 4
  const priceColor = '#2563eb'
  const averageColor = '#f59e0b'
  const baselineColor = '#cbd5e1'

  function getLinePath(points: {x: number; y: number}[]) {
    if (!points.length) return ''
    return points.map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    }).join(' ')
  }

  const { pricePath, averagePath, areaPath, baselineY } = useMemo(() => {
    if (!props.data.length) {
      return {
        pricePath: '',
        averagePath: '',
        areaPath: '',
        baselineY: height / 2,
      }
    }

    const values = props.data.flatMap(item => [item.price, item.average])
    const maxDistance = Math.max(...values.map(value => Math.abs(value - props.previousClose)), 0.01)
    const max = props.previousClose + maxDistance
    const min = props.previousClose - maxDistance
    const scaleY = (value: number) => {
      return height - paddingY - ((value - min) / (max - min || 1)) * (height - paddingY * 2)
    }
    const pointX = (index: number) => {
      if (props.data.length === 1) return width / 2
      return paddingX + (index / (props.data.length - 1)) * (width - paddingX * 2)
    }
    const pricePoints = props.data.map((item, index) => ({ x: pointX(index), y: scaleY(item.price) }))
    const averagePoints = props.data.map((item, index) => ({ x: pointX(index), y: scaleY(item.average) }))
    const pricePath = getLinePath(pricePoints)
    const lastPoint = pricePoints[pricePoints.length - 1]
    const firstPoint = pricePoints[0]

    return {
      pricePath,
      averagePath: getLinePath(averagePoints),
      baselineY: scaleY(props.previousClose),
      areaPath: pricePath
        ? `${pricePath} L ${lastPoint.x} ${height - paddingY} L ${firstPoint.x} ${height - paddingY} Z`
        : '',
    }
  }, [props.data, props.previousClose])

  return (
    <div className="h-full w-full px-1 py-0.5">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={priceColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={priceColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={paddingX}
          x2={width - paddingX}
          y1={baselineY}
          y2={baselineY}
          stroke={baselineColor}
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={pricePath} fill="none" stroke={priceColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={averagePath} fill="none" stroke={averageColor} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

const MacdChart = (props: {
  data: MacdItem[]
}) => {
  const width = 150
  const height = 34
  const paddingX = 7
  const paddingY = 4
  const histogramGap = 2
  const difColor = '#3b82f6'
  const deaColor = '#f59e0b'
  const positiveColor = '#ef4444'
  const negativeColor = '#22c55e'

  function getLinePath(points: {x: number; y: number}[]) {
    if (!points.length) return ''
    return points.map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    }).join(' ')
  }

  const { bars, zeroY, difPath, deaPath } = useMemo(() => {
    if (!props.data.length) return { bars: [], zeroY: height / 2, difPath: '', deaPath: '' }

    const values = props.data.flatMap(item => [item.dif, item.dea, item.macd])
    const max = Math.max(...values, 0)
    const min = Math.min(...values, 0)
    const scaleY = (value: number) => {
      return height - paddingY - ((value - min) / (max - min || 1)) * (height - paddingY * 2)
    }
    const slotWidth = (width - paddingX * 2) / props.data.length
    const barWidth = Math.max(2, Math.min(5, slotWidth - histogramGap))
    const zeroY = scaleY(0)
    const pointX = (index: number) => paddingX + slotWidth * index + slotWidth / 2

    return {
      zeroY,
      difPath: getLinePath(props.data.map((item, index) => ({ x: pointX(index), y: scaleY(item.dif) }))),
      deaPath: getLinePath(props.data.map((item, index) => ({ x: pointX(index), y: scaleY(item.dea) }))),
      bars: props.data.map((item, index) => {
        const y = scaleY(item.macd)
        return {
          key: index,
          x: pointX(index) - barWidth / 2,
          y: Math.min(y, zeroY),
          width: barWidth,
          height: Math.max(1, Math.abs(zeroY - y)),
          color: item.macd >= 0 ? positiveColor : negativeColor,
        }
      }),
    }
  }, [props.data])

  return (
    <div className="h-full w-full px-1 py-0.5">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <line x1={paddingX} x2={width - paddingX} y1={zeroY} y2={zeroY} stroke="#e5e7eb" strokeWidth="1" />
        {bars.map(item => (
          <rect
            key={item.key}
            x={item.x}
            y={item.y}
            width={item.width}
            height={item.height}
            rx="0.75"
            fill={item.color}
            opacity="0.8"
          />
        ))}
        <path d={difPath} fill="none" stroke={difColor} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <path d={deaPath} fill="none" stroke={deaColor} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

const VolumeChart = (props: {
  data: VolumeItem[]
}) => {
  const width = 150
  const height = 34
  const paddingX = 7
  const paddingY = 4
  const barGap = 2
  const risingColor = '#ef4444'
  const fallingColor = '#22c55e'

  const bars = useMemo(() => {
    if (!props.data.length) return []

    const max = Math.max(...props.data.map(item => item.value), 1)
    const slotWidth = (width - paddingX * 2) / props.data.length
    const barWidth = Math.max(2, Math.min(5, slotWidth - barGap))

    return props.data.map((item, index) => {
      const barHeight = Math.max(1, (item.value / max) * (height - paddingY * 2))
      const x = paddingX + slotWidth * index + slotWidth / 2 - barWidth / 2

      return {
        key: index,
        x,
        y: height - paddingY - barHeight,
        width: barWidth,
        height: barHeight,
        color: item.rising ? risingColor : fallingColor,
      }
    })
  }, [props.data])

  return (
    <div className="h-full w-full px-1 py-0.5">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <line x1={paddingX} x2={width - paddingX} y1={height - paddingY} y2={height - paddingY} stroke="#e5e7eb" strokeWidth="1" />
        {bars.map(item => (
          <rect
            key={item.key}
            x={item.x}
            y={item.y}
            width={item.width}
            height={item.height}
            rx="0.75"
            fill={item.color}
            opacity="0.78"
          />
        ))}
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
  const [pos, setPos] = useState<[number, number] | null>(null)
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

  useEffect(() => {
    if (!fullScreen) return

    const previousOverflow = document.body.style.overflow
    window.scrollTo({ top: 0, left: 0 })
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [fullScreen])

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

      <div className="flex-1 overflow-hidden flex flex-row">
        <DataGrid
          ref={ref}
          className="min-h-0 flex-1 overflow-hidden"
          row={{
            count: rows.length,
            estimateSize: () => 25,
            overscan: 8,
          }}
          column={{
            count: columns.length,
            estimateSize: index => columns[index]?.width ?? 120,
            overscan: 3,
          }}
          columnResize={() => [50, 200]}
          rowResize
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
              return <span className="px-1 text-sm tabular-nums">{rowIndex + 1}</span>
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

            if (column.kind === 'intraday') {
              if (!isIntradayValue(value)) return null
              return <IntradayChart previousClose={value.previousClose} data={value.data} />
            }

            if (column.kind === 'kline') {
              if (!isKLineValue(value)) return null
              return <KLineChart data={value.data} />
            }

            if (column.kind === 'volume') {
              if (!isVolumeValue(value)) return null
              return <VolumeChart data={value.data} />
            }

            if (column.kind === 'macd') {
              if (!isMacdValue(value)) return null
              return <MacdChart data={value.data} />
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
                onClick={() => {
                  setPos([columnIndex, rowIndex])
                }}
              >
                {textValue}
              </div>
            )
          }}
        />
        {pos && (
          <div className="shrink-0 w-[300px] border-l border-slate-200">
            <div className="p-1.5 flex gap-0.5 items-center">
              <div className="flex-1 flex gap-0.5 items-center text-gray-600">
                <span>selection</span>
                <ChevronRightIcon className="text-gray-400" />
                <span className="flex-1 overflow-hidden text-ellipsis text-nowrap">{columns[pos[0]].title}</span>
              </div>
              <div>
                <button className="p-0.5 cursor-pointer w-5 h-5 rounded-sm hover:bg-gray-200" onClick={() => {setPos(null)}}><Cross2Icon /></button>
              </div>
            </div>
            <div className="p-1.5 break-all">{cellToText(rows[pos[1]]?.[pos[0]])}</div>
          </div>
        )}
      </div>
    </div>
  )
}
