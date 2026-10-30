import { useId } from 'react'

// ============================================================
//  ตัวช่วยวาดรูปร่าง (หน่วยเป็นพิกเซลตามขนาดจริงของสติกเกอร์)
// ============================================================
const f = (n) => +n.toFixed(2)
const P = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z'
const circ = (x, y, r) => `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`
// ย่อ/ขยายเส้นที่วาดไว้ในกรอบ 100x100 (ใช้กับเส้นที่เป็นพิกัดสมบูรณ์ M/C/L/Z เท่านั้น)
const scaleAbs = (d, w, h) => {
  let i = 0
  return d.replace(/-?\d*\.?\d+/g, (m) => f((+m * (i++ % 2 === 0 ? w : h)) / 100))
}
const polar = (w, h, n, k, rot = -Math.PI / 2) =>
  P(
    Array.from({ length: n }, (_, i) => {
      const a = rot + (i / n) * Math.PI * 2
      const r = k(i, n)
      return [w / 2 + (w / 2) * r * Math.cos(a), h / 2 + (h / 2) * r * Math.sin(a)]
    }),
  )
const ellipse = (w, h) =>
  `M0 ${f(h / 2)}A${f(w / 2)} ${f(h / 2)} 0 1 0 ${f(w)} ${f(h / 2)}A${f(w / 2)} ${f(h / 2)} 0 1 0 0 ${f(h / 2)}Z`
const rrect = (w, h, r0) => {
  const r = Math.min(r0, w / 2, h / 2)
  return `M${f(r)} 0H${f(w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(w)} ${f(r)}V${f(h - r)}A${f(r)} ${f(r)} 0 0 1 ${f(w - r)} ${f(h)}H${f(r)}A${f(r)} ${f(r)} 0 0 1 0 ${f(h - r)}V${f(r)}A${f(r)} ${f(r)} 0 0 1 ${f(r)} 0Z`
}
// ขอบแสตมป์: ฟันเฟืองครึ่งวงกลมรอบกรอบ
const perf = (w, h, s = 14) => {
  const nx = Math.max(2, Math.round(w / s))
  const ny = Math.max(2, Math.round(h / s))
  const sx = w / nx
  const sy = h / ny
  let d = 'M0 0'
  for (let i = 0; i < nx; i++) d += `A${f(sx / 2)} ${f(sx / 2)} 0 0 0 ${f((i + 1) * sx)} 0`
  for (let j = 0; j < ny; j++) d += `A${f(sy / 2)} ${f(sy / 2)} 0 0 0 ${f(w)} ${f((j + 1) * sy)}`
  for (let i = nx - 1; i >= 0; i--) d += `A${f(sx / 2)} ${f(sx / 2)} 0 0 0 ${f(i * sx)} ${f(h)}`
  for (let j = ny - 1; j >= 0; j--) d += `A${f(sy / 2)} ${f(sy / 2)} 0 0 0 0 ${f(j * sy)}`
  return d + 'Z'
}
// กระดาษฉีก: ขอบบน-ล่างขาดเป็นหยัก (ค่าสุ่มคงที่ ให้หน้าตาเหมือนเดิมทุกครั้ง)
const torn = (w, h) => {
  const n = Math.max(4, Math.round(w / 12))
  const sx = w / n
  const jt = (i, s) => 1 + ((i * 37 + s * 17) % 7) * 0.9
  const top = []
  const bot = []
  for (let i = 0; i <= n; i++) {
    top.push([i * sx, jt(i, 1)])
    bot.push([i * sx, h - jt(i, 2)])
  }
  return P([...top, ...bot.reverse()])
}

// ============================================================
//  รูปร่างของสติกเกอร์ตัวอักษร / คอลลาจ
//  ar = สัดส่วนกว้างต่อสูง
//  tb = กรอบที่ใส่ข้อความได้ (สัดส่วนของกว้าง/สูง) dx, dy = เลื่อนจากกึ่งกลาง
// ============================================================
const HEART = 'M50 94C6 64 0 30 24 14C40 4 50 16 50 28C50 16 60 4 76 14C100 30 94 64 50 94Z'
const CLOUD = 'M22 100C8 100 2 82 10 68C2 46 24 32 40 42C46 16 84 18 88 46C100 48 104 70 94 82C98 94 90 100 78 100Z'

export const SHAPES = {
  circle: { label: 'Circle', ar: 1, tb: { w: 0.68, h: 0.56 }, d: (w, h) => ellipse(w, h) },
  pill: { label: 'Pill', ar: 2.4, tb: { w: 0.84, h: 0.62 }, d: (w, h) => rrect(w, h, h / 2) },
  rounded: { label: 'Rounded', ar: 1.5, tb: { w: 0.84, h: 0.66 }, d: (w, h) => rrect(w, h, Math.min(w, h) * 0.2) },
  arch: { label: 'Arch', ar: 0.8, tb: { w: 0.7, h: 0.46, dy: 0.14 }, d: (w, h) => `M0 ${f(h)}V${f(w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(w)} ${f(w / 2)}V${f(h)}Z` },
  tag: {
    label: 'Tag',
    ar: 2.2,
    tb: { w: 0.46, h: 0.6, dx: 0.02 },
    d: (w, h) => P([[0, 0], [w * 0.78, 0], [w, h / 2], [w * 0.78, h], [0, h]]) + circ(h * 0.42, h / 2, h * 0.09),
  },
  ticket: {
    label: 'Ticket',
    ar: 2.1,
    tb: { w: 0.76, h: 0.64 },
    d: (w, h) => {
      const r = h * 0.12
      const a = h * 0.38
      const b = h * 0.62
      return `M0 0H${f(w)}V${f(a)}A${f(r)} ${f(r)} 0 0 0 ${f(w)} ${f(b)}V${f(h)}H0V${f(b)}A${f(r)} ${f(r)} 0 0 0 0 ${f(a)}Z`
    },
  },
  speech: {
    label: 'Speech',
    ar: 1.4,
    tb: { w: 0.78, h: 0.5, dy: -0.11 },
    d: (w, h) => {
      const r = Math.min(w, h) * 0.18
      const b = h * 0.78
      return `M${f(r)} 0H${f(w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(w)} ${f(r)}V${f(b - r)}A${f(r)} ${f(r)} 0 0 1 ${f(w - r)} ${f(b)}H${f(w * 0.4)}L${f(w * 0.2)} ${f(h)}L${f(w * 0.26)} ${f(b)}H${f(r)}A${f(r)} ${f(r)} 0 0 1 0 ${f(b - r)}V${f(r)}A${f(r)} ${f(r)} 0 0 1 ${f(r)} 0Z`
    },
  },
  star: { label: 'Star', ar: 1, tb: { w: 0.58, h: 0.34, dy: 0.03 }, d: (w, h) => polar(w, h, 10, (i) => (i % 2 ? 0.46 : 1)) },
  burst: { label: 'Burst', ar: 1, tb: { w: 0.66, h: 0.5 }, d: (w, h) => polar(w, h, 28, (i) => (i % 2 ? 0.8 : 1)) },
  badge: { label: 'Badge', ar: 1, tb: { w: 0.7, h: 0.54 }, d: (w, h) => polar(w, h, 90, (i) => 0.92 + 0.08 * Math.cos((i / 90) * Math.PI * 2 * 12)) },
  flower: { label: 'Flower', ar: 1, tb: { w: 0.56, h: 0.4 }, d: (w, h) => polar(w, h, 120, (i) => 0.72 + 0.28 * Math.cos((i / 120) * Math.PI * 2 * 6)) },
  heart: { label: 'Heart', ar: 1.1, tb: { w: 0.5, h: 0.32, dy: -0.06 }, d: (w, h) => scaleAbs(HEART, w, h) },
  cloud: { label: 'Cloud', ar: 1.45, tb: { w: 0.6, h: 0.34, dy: 0.1 }, d: (w, h) => scaleAbs(CLOUD, w, h) },
  blob: {
    label: 'Blob',
    ar: 1.2,
    tb: { w: 0.64, h: 0.48 },
    d: (w, h) =>
      polar(w, h, 120, (i) => {
        const t = (i / 120) * Math.PI * 2
        return 0.82 + 0.1 * Math.cos(2 * t + 1) + 0.07 * Math.cos(3 * t + 2)
      }),
  },
  hexagon: { label: 'Hexagon', ar: 1.1, tb: { w: 0.66, h: 0.5 }, d: (w, h) => polar(w, h, 6, () => 1, 0) },
  stamp: { label: 'Stamp', ar: 0.85, tb: { w: 0.66, h: 0.66 }, d: (w, h) => perf(w, h) },
  torn: { label: 'Torn paper', ar: 1.7, tb: { w: 0.84, h: 0.62 }, d: (w, h) => torn(w, h) },
  tape: {
    label: 'Tape',
    ar: 4.5,
    tb: { w: 0.84, h: 0.6 },
    d: (w, h) => P([[0, 0], [w, 0], [w - 6, h * 0.25], [w, h * 0.5], [w - 6, h * 0.75], [w, h], [0, h], [6, h * 0.75], [0, h * 0.5], [6, h * 0.25]]),
  },
}
export const SHAPE_LIST = Object.keys(SHAPES)

// ขนาดเริ่มต้นของสติกเกอร์ตามรูปร่าง (พื้นที่ใกล้เคียงกันทุกรูปร่าง)
export function sizeFor(shape, base = 190) {
  const ar = SHAPES[shape]?.ar ?? 1
  const w = Math.round(base * Math.sqrt(ar))
  return { w, h: Math.round(w / ar) }
}

// ============================================================
//  จัดขนาดตัวอักษรให้พอดีกรอบ: ไม่ตัดคำกลางคำ ขึ้นบรรทัดใหม่เฉพาะตรงช่องว่าง
// ============================================================
let measureCtx
const measure = (text, fs) => {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  measureCtx.font = `700 ${fs}px Fraunces, "Anuphan", serif`
  return measureCtx.measureText(text).width
}

export function fitText(text, bw, bh) {
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return { fs: 0, lines: [] }
  const BASE = 100
  const ww = words.map((x) => measure(x, BASE))
  const sp = measure(' ', BASE)
  const maxWord = Math.max(...ww)

  // ลองตัดบรรทัดที่ขนาด fs: คืนบรรทัดทั้งหมด และบอกว่าพอดีกรอบหรือไม่
  const wrap = (fs) => {
    const k = fs / BASE
    const lines = []
    let cur = ''
    let curW = 0
    words.forEach((word, i) => {
      const w = ww[i] * k
      if (!cur) {
        cur = word
        curW = w
      } else if (curW + sp * k + w <= bw) {
        cur += ' ' + word
        curW += sp * k + w
      } else {
        lines.push(cur)
        cur = word
        curW = w
      }
    })
    lines.push(cur)
    return { lines, ok: maxWord * k <= bw && lines.length * fs * 1.06 <= bh }
  }

  // หาขนาดใหญ่ที่สุดที่ยังพอดี (binary search)
  let lo = 8
  let hi = Math.min(bh, 160)
  let best = wrap(lo)
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2
    const r = wrap(mid)
    if (r.ok) {
      lo = mid
      best = r
    } else {
      hi = mid
    }
  }
  return { fs: lo, lines: best.lines }
}

// ============================================================
//  แพทเทิร์นพื้นหลัง
// ============================================================
export const PATTERNS = ['none', 'dots', 'stripes', 'grid', 'checker', 'hearts', 'stars', 'waves', 'zigzag', 'gingham']

export function lum(hex = '#ffffff') {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return 1
  const n = parseInt(m[1], 16)
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

function PatternDef({ id, kind, color }) {
  const c = { id, patternUnits: 'userSpaceOnUse' }
  switch (kind) {
    case 'dots':
      return <pattern {...c} width="14" height="14"><circle cx="7" cy="7" r="2.4" fill={color} /></pattern>
    case 'stripes':
      return <pattern {...c} width="12" height="12" patternTransform="rotate(45)"><rect width="6" height="12" fill={color} /></pattern>
    case 'grid':
      return <pattern {...c} width="16" height="16"><path d="M16 0H0V16" fill="none" stroke={color} strokeWidth="1.4" /></pattern>
    case 'checker':
      return (
        <pattern {...c} width="24" height="24">
          <rect width="12" height="12" fill={color} />
          <rect x="12" y="12" width="12" height="12" fill={color} />
        </pattern>
      )
    case 'hearts':
      return <pattern {...c} width="26" height="24"><path d="M13 19C4 12 5 5 9.5 5c2 0 3.5 1.2 3.5 3 0-1.8 1.5-3 3.5-3C21 5 22 12 13 19Z" fill={color} /></pattern>
    case 'stars':
      return <pattern {...c} width="26" height="26"><path d="M13 4C14 10 16 12 22 13C16 14 14 16 13 22C12 16 10 14 4 13C10 12 12 10 13 4Z" fill={color} /></pattern>
    case 'waves':
      return <pattern {...c} width="28" height="12"><path d="M0 6Q7 0 14 6T28 6" fill="none" stroke={color} strokeWidth="1.8" /></pattern>
    case 'zigzag':
      return <pattern {...c} width="20" height="12"><path d="M0 9L5 3L10 9L15 3L20 9" fill="none" stroke={color} strokeWidth="1.8" /></pattern>
    case 'gingham':
      return (
        <pattern {...c} width="24" height="24">
          <rect width="12" height="24" fill={color} opacity=".55" />
          <rect width="24" height="12" fill={color} opacity=".55" />
        </pattern>
      )
    default:
      return null
  }
}

// ============================================================
//  สติกเกอร์รูปร่าง (ใช้ทั้งสติกเกอร์ตัวอักษรและคอลลาจ)
// ============================================================
export function ShapeSticker({ it }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const { w, h } = it
  const sh = SHAPES[it.shape] ?? SHAPES.rounded
  const d = sh.d(w, h)
  const hasPat = it.pattern && it.pattern !== 'none'
  const pcol = it.pc ?? (lum(it.bg) > 0.6 ? '#2f2a27' : '#ffffff')
  const edge = it.edge ? 6 : 0
  const text = (it.text ?? '').trim()

  // กรอบข้อความของรูปร่างนี้ แล้วจัดขนาดตัวอักษรให้พอดี (เผื่อไว้ 4%)
  const tb = sh.tb
  const bw = w * tb.w * 0.96
  const bh = h * tb.h
  const box = {
    left: w / 2 + w * (tb.dx ?? 0) - bw / 2,
    top: h / 2 + h * (tb.dy ?? 0) - bh / 2,
    width: bw,
    height: bh,
  }
  const fit = text ? fitText(text, bw, bh) : null

  return (
    <div className={'stk' + (it.flat ? ' flat' : '')} style={{ width: w, height: h }}>
      <svg className="stk-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          {hasPat && <PatternDef id={`p${uid}`} kind={it.pattern} color={pcol} />}
          <clipPath id={`c${uid}`}><path d={d} clipRule="evenodd" /></clipPath>
        </defs>
        {edge > 0 && <path d={d} fill="#fff" stroke="#fff" strokeWidth={edge * 2} strokeLinejoin="round" fillRule="evenodd" />}
        <path d={d} fill={it.bg} fillRule="evenodd" />
        {hasPat && <rect width={w} height={h} fill={`url(#p${uid})`} opacity=".5" clipPath={`url(#c${uid})`} />}
      </svg>
      {fit && (
        <div className="stk-text" style={{ ...box, color: it.ink, fontSize: fit.fs }}>
          {fit.lines.map((line, i) => <span key={i}>{line}</span>)}
        </div>
      )}
    </div>
  )
}

// ============================================================
//  Doodle: ลายเส้นแนววาดมือ (viewBox 100x100) fill = พื้นที่ระบายสี, lines = เส้นล้วน
// ============================================================
const ray = (i, n, r1, r2) => {
  const a = (i / n) * Math.PI * 2
  return `M${f(50 + r1 * Math.cos(a))} ${f(50 + r1 * Math.sin(a))}L${f(50 + r2 * Math.cos(a))} ${f(50 + r2 * Math.sin(a))}`
}
const spiral = () => {
  let d = ''
  for (let t = 0; t <= 13.6; t += 0.25) {
    const r = 3 + t * 3.2
    d += (d ? 'L' : 'M') + f(50 + r * Math.cos(t)) + ' ' + f(50 + r * Math.sin(t))
  }
  return d
}
// หัวลูกศรที่ปลาย (tx,ty) โดยเส้นวิ่งเข้าหาปลายด้วยทิศ (dx,dy): แขนทั้งสองข้างกางย้อนกลับด้านหลัง
const arrowHead = (tx, ty, dx, dy, len = 20, ang = 0.6) => {
  const m = Math.hypot(dx, dy)
  const ux = -dx / m
  const uy = -dy / m
  const at = (a) => [tx + len * (ux * Math.cos(a) - uy * Math.sin(a)), ty + len * (ux * Math.sin(a) + uy * Math.cos(a))]
  const [x1, y1] = at(ang)
  const [x2, y2] = at(-ang)
  return `M${f(x1)} ${f(y1)}L${f(tx)} ${f(ty)}L${f(x2)} ${f(y2)}`
}

export const DOODLES = {
  star: { label: 'Star', color: '#ffd75a', fill: 'M50 8L61 38L93 40L68 60L77 92L50 74L23 92L32 60L7 40L39 38Z' },
  heart: { label: 'Heart', color: '#f4b9c4', fill: 'M50 88C10 60 4 30 26 18C40 11 50 20 50 32C50 20 60 11 74 18C96 30 90 60 50 88Z' },
  sparkle: { label: 'Sparkle', color: '#fff3a8', fill: 'M50 6C54 34 66 46 94 50C66 54 54 66 50 94C46 66 34 54 6 50C34 46 46 34 50 6Z' },
  sun: { label: 'Sun', color: '#ffd75a', fill: circ(50, 50, 20), lines: Array.from({ length: 8 }, (_, i) => ray(i, 8, 30, 44)) },
  cloud: { label: 'Cloud', color: '#d9e4f5', fill: 'M24 74C8 74 4 54 20 50C18 30 42 24 50 38C58 22 84 30 80 50C96 52 96 74 78 74Z' },
  moon: { label: 'Moon', color: '#fff3a8', fill: 'M60 10C30 14 14 42 24 66C34 88 64 94 84 78C58 80 42 58 50 34C53 24 56 16 60 10Z' },
  leaf: { label: 'Leaf', color: '#d7e6d8', fill: 'M18 82C12 42 40 14 86 14C88 60 60 88 18 82Z', lines: ['M18 82L64 36'] },
  bolt: { label: 'Bolt', color: '#ffd75a', fill: 'M58 6L22 54H46L38 94L78 44H54Z' },
  crown: { label: 'Crown', color: '#ffd75a', fill: 'M12 76L16 30L36 52L50 20L64 52L84 30L88 76Z', lines: ['M12 86H88'] },
  music: { label: 'Music', color: '#f6d6d2', fill: circ(30, 76, 10) + circ(70, 66, 10), lines: ['M40 76V26L80 16V66', 'M40 42L80 32'] },
  coffee: {
    label: 'Coffee',
    color: '#fdf3d0',
    fill: 'M16 38H70V60C70 78 58 86 43 86C28 86 16 78 16 60Z',
    lines: ['M70 44C88 44 88 68 70 68', 'M30 28C26 20 36 16 32 8', 'M50 28C46 20 56 16 52 8'],
  },
  house: { label: 'House', color: '#f6d6d2', fill: 'M12 48L50 14L88 48V88H12Z', lines: ['M42 88V64H58V88'] },
  butterfly: {
    label: 'Butterfly',
    color: '#d9e4f5',
    fill: 'M50 50C20 10 2 32 24 52C6 70 28 92 50 58ZM50 50C80 10 98 32 76 52C94 70 72 92 50 58Z',
    lines: ['M50 32V78', 'M50 32C46 22 40 18 36 16', 'M50 32C54 22 60 18 64 16'],
  },
  smiley: { label: 'Smiley', color: '#ffd75a', fill: circ(50, 50, 40), lines: ['M36 40V48', 'M64 40V48', 'M30 62C40 78 60 78 70 62'] },
  plant: {
    label: 'Plant',
    color: '#e9c4a0',
    fill: 'M32 90L37 66H63L68 90Z',
    lines: ['M50 66V32', 'M50 50C34 50 28 38 30 26C42 26 50 34 50 50', 'M50 42C62 42 72 34 72 22C60 22 52 28 50 42'],
  },
  // ลูกศรโค้ง: เส้นวิ่งไปทางขวาล่าง หัวลูกศรชี้ไปทางที่เส้นวิ่งไป (คำนวณมุมจากทิศของปลายเส้น)
  arrow: { label: 'Arrow', lines: ['M12 74C24 30 56 18 84 40', arrowHead(84, 40, 28, 22)] },
  squiggle: { label: 'Squiggle', lines: ['M6 58C18 28 28 28 38 54C48 80 56 80 64 54C72 28 84 28 94 56'] },
  spiral: { label: 'Spiral', lines: [spiral()] },
  zigzag: { label: 'Zigzag', lines: ['M6 64L20 36L34 64L48 36L62 64L76 36L90 64'] },
  loop: { label: 'Circle it', lines: ['M52 10C82 8 98 36 88 62C78 90 36 96 16 72C0 52 10 24 34 14C46 8 60 8 68 12'] },
  underline: { label: 'Underline', lines: ['M6 64C30 50 62 76 94 56'] },
}

export function DoodleSticker({ it }) {
  const dd = DOODLES[it.doodle]
  if (!dd) return null
  const st = { stroke: it.ink, strokeWidth: 3.6, strokeLinejoin: 'round', strokeLinecap: 'round' }
  return (
    <svg className="doodle" viewBox="0 0 100 100" width="100%" height="100%">
      {dd.fill && <path d={dd.fill} fill={it.bg} {...st} />}
      {dd.lines?.map((d, i) => <path key={i} d={d} fill="none" {...st} />)}
    </svg>
  )
}

// ============================================================
//  Collage: ชิ้นสำเร็จรูป (กระดาษฉีก เทปวาชิ ตั๋ว แสตมป์ กระดาษตัดรูป ฯลฯ)
// ============================================================
export const COLLAGE = [
  { id: 'torn-kraft', spec: { shape: 'torn', pattern: 'grid', bg: '#d9b98a', ink: '#5b4636', text: '', w: 280, h: 170 } },
  { id: 'mood', spec: { shape: 'pill', pattern: 'none', bg: '#ffd75a', ink: '#2f2a27', text: 'MOOD', edge: 1, w: 250, h: 104 } },
  { id: 'torn-white', spec: { shape: 'torn', pattern: 'none', bg: '#fffaf0', ink: '#2f2a27', text: 'my note', w: 260, h: 150 } },
  { id: 'torn-strip', spec: { shape: 'torn', pattern: 'none', bg: '#273d66', ink: '#ffffff', text: 'THINGS I LOVE', w: 320, h: 84 } },
  { id: 'tape-pink', spec: { shape: 'tape', pattern: 'stripes', bg: '#f4b9c4', ink: '#2f2a27', flat: true, w: 210, h: 46 } },
  { id: 'tape-mint', spec: { shape: 'tape', pattern: 'dots', bg: '#bfe0cf', ink: '#2f2a27', flat: true, w: 210, h: 46 } },
  { id: 'tape-yellow', spec: { shape: 'tape', pattern: 'checker', bg: '#fde7a0', ink: '#2f2a27', flat: true, w: 210, h: 46 } },
  { id: 'cut-heart', spec: { shape: 'heart', pattern: 'dots', bg: '#f4b9c4', ink: '#2f2a27', edge: 1, w: 170, h: 155 } },
  { id: 'cut-star', spec: { shape: 'star', pattern: 'none', bg: '#ffd75a', ink: '#2f2a27', edge: 1, w: 170, h: 170 } },
  { id: 'cut-flower', spec: { shape: 'flower', pattern: 'none', bg: '#f6a5b5', ink: '#2f2a27', edge: 1, w: 170, h: 170 } },
  { id: 'cut-cloud', spec: { shape: 'cloud', pattern: 'waves', bg: '#d9e4f5', ink: '#2f2a27', edge: 1, w: 200, h: 140 } },
  { id: 'cut-blob', spec: { shape: 'blob', pattern: 'hearts', bg: '#c9d3c4', ink: '#2f2a27', edge: 1, w: 190, h: 160 } },
  { id: 'arch', spec: { shape: 'arch', pattern: 'gingham', bg: '#fdf3d0', ink: '#2f2a27', edge: 1, w: 150, h: 190 } },
]

// ============================================================
//  Emoji
// ============================================================
export const EMOJI_GROUPS = [
  { name: 'Feelings', items: ['😊', '🥹', '😌', '🥰', '😴', '🤍', '💛', '🧡', '💗', '✨', '🌈', '💭'] },
  { name: 'Nature', items: ['🌿', '🌸', '🌻', '🍃', '🌙', '☀️', '⭐', '🌊', '🕊️', '🦋', '🐝', '🍀', '🌵', '🍄', '🌷', '🌲'] },
  { name: 'Food & drink', items: ['☕', '🍵', '🍰', '🍓', '🍑', '🥐', '🍪', '🍯', '🥑', '🍜', '🧋', '🍋'] },
  { name: 'Things', items: ['📚', '🎬', '🎧', '📷', '🖋️', '🎨', '🧸', '🎁', '🕯️', '🧺', '🗝️', '💌', '🪴', '🛋️', '🚲', '✈️'] },
  { name: 'Symbols', items: ['❤️', '🔥', '💡', '⏳', '🏆', '🎯', '🌟', '💫', '🔔', '🏠', '🧿', '🪄'] },
]

// ============================================================
//  UI ย่อย: ตัวอย่างย่อส่วน, ไอคอนรูปร่าง, ตัวอย่างแพทเทิร์น, แถวเลือกสี, ชุดควบคุมสติกเกอร์
// ============================================================
export const BG_COLORS = ['#fbf2dc', '#ffffff', '#f6d6d2', '#f4b9c4', '#ffd75a', '#e8d083', '#f0705f', '#d7e6d8', '#86cf8f', '#d9e4f5', '#86b6ea', '#b9b4ec', '#273d66', '#2f4f46', '#2f2a27']
export const PC_COLORS = ['#ffffff', '#2f2a27', '#b0443d', '#f4b9c4', '#e8d083', '#86b6ea', '#2f4f46']
export const INK_COLORS = ['#2f2a27', '#5b4636', '#b0443d', '#2f4f46', '#273d66', '#ffffff', '#f4b9c4']

// แสดงของขนาดจริงแบบย่อส่วนให้พอดีกรอบ (ใช้ทำตัวอย่างในแถบด้านข้าง)
export function Scaled({ w, h, maxW, maxH, children }) {
  const s = Math.min(maxW / w, maxH / h, 1)
  return (
    <div style={{ width: w * s, height: h * s }}>
      <div style={{ width: w, height: h, transform: `scale(${s})`, transformOrigin: 'top left' }}>{children}</div>
    </div>
  )
}

export function ShapeIcon({ id }) {
  const s = SHAPES[id]
  const h = 22
  const w = Math.max(14, Math.min(34, Math.round(h * s.ar)))
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={s.d(w, h)} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}

export function PatternSwatch({ kind, bg = '#fbf2dc' }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const col = lum(bg) > 0.6 ? '#2f2a27' : '#ffffff'
  const on = kind !== 'none'
  return (
    <svg width="34" height="24" viewBox="0 0 34 24">
      <defs>{on && <PatternDef id={`s${uid}`} kind={kind} color={col} />}</defs>
      <rect width="34" height="24" rx="4" fill={bg} stroke="rgba(0,0,0,.14)" />
      {on && <rect width="34" height="24" rx="4" fill={`url(#s${uid})`} opacity=".6" />}
    </svg>
  )
}

export function ColorRow({ label, value, colors, onPick }) {
  return (
    <div className="cr">
      <span>{label}</span>
      <div className="cr-sw">
        {colors.map((c) => (
          <button key={c} className={'sw sm' + (value === c ? ' on' : '')} style={{ background: c }} onClick={() => onPick(c)} aria-label={`${label} ${c}`} />
        ))}
      </div>
    </div>
  )
}

// v = { text, shape, pattern, bg, ink, pc, edge, flat }  onChange(ส่วนที่เปลี่ยน)
export function ShapeControls({ v, onChange, extras = false }) {
  const hasPat = v.pattern && v.pattern !== 'none'
  return (
    <div className="sc">
      <label className="sc-row">
        <span className="cap">Text</span>
        <input className="sc-input" value={v.text ?? ''} placeholder="พิมพ์ข้อความ…" onChange={(e) => onChange({ text: e.target.value })} />
      </label>

      <p className="cap">Shape</p>
      <div className="shape-grid">
        {SHAPE_LIST.map((s) => (
          <button key={s} className={'shp' + (v.shape === s ? ' on' : '')} title={SHAPES[s].label} onClick={() => onChange({ shape: s })}>
            <ShapeIcon id={s} />
          </button>
        ))}
      </div>

      <p className="cap">Pattern</p>
      <div className="pat-grid">
        {PATTERNS.map((p) => (
          <button key={p} className={'pat' + ((v.pattern ?? 'none') === p ? ' on' : '')} title={p} onClick={() => onChange({ pattern: p })}>
            <PatternSwatch kind={p} bg={v.bg} />
          </button>
        ))}
      </div>

      <ColorRow label="Background" value={v.bg} colors={BG_COLORS} onPick={(c) => onChange({ bg: c })} />
      {hasPat && <ColorRow label="Pattern color" value={v.pc ?? ''} colors={PC_COLORS} onPick={(c) => onChange({ pc: c })} />}
      <ColorRow label="Text color" value={v.ink} colors={INK_COLORS} onPick={(c) => onChange({ ink: c })} />

      {extras && (
        <div className="sc-toggles">
          <label><input type="checkbox" checked={!!v.edge} onChange={(e) => onChange({ edge: e.target.checked ? 1 : 0 })} /> White paper edge</label>
          <label><input type="checkbox" checked={!v.flat} onChange={(e) => onChange({ flat: !e.target.checked })} /> Shadow</label>
        </div>
      )}
    </div>
  )
}

// ============================================================
//  แพทเทิร์นพื้นหลังแบบ CSS (ใช้กับการ์ดข้อความ) คืนค่าเป็น style object
// ============================================================
const svgBg = (w, h, body, op = 0.45) => ({
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><g opacity='${op}'>${body}</g></svg>`,
  )}")`,
  backgroundSize: `${w}px ${h}px`,
})

export function patternStyle(kind, color) {
  if (!kind || kind === 'none') return {}
  const c = color
  const soft = `color-mix(in srgb, ${c} 45%, transparent)`
  switch (kind) {
    case 'dots':
      return svgBg(14, 14, `<circle cx='7' cy='7' r='2.4' fill='${c}'/>`)
    case 'stripes':
      return { backgroundImage: `repeating-linear-gradient(45deg, ${soft} 0 6px, transparent 6px 12px)` }
    case 'grid':
      return {
        backgroundImage: `linear-gradient(${soft} 1.4px, transparent 1.4px), linear-gradient(90deg, ${soft} 1.4px, transparent 1.4px)`,
        backgroundSize: '16px 16px',
      }
    case 'checker':
      return { backgroundImage: `conic-gradient(${soft} 25%, transparent 0 50%, ${soft} 0 75%, transparent 0)`, backgroundSize: '24px 24px' }
    case 'hearts':
      return svgBg(26, 24, `<path d='M13 19C4 12 5 5 9.5 5c2 0 3.5 1.2 3.5 3 0-1.8 1.5-3 3.5-3C21 5 22 12 13 19Z' fill='${c}'/>`)
    case 'stars':
      return svgBg(26, 26, `<path d='M13 4C14 10 16 12 22 13C16 14 14 16 13 22C12 16 10 14 4 13C10 12 12 10 13 4Z' fill='${c}'/>`)
    case 'waves':
      return svgBg(28, 12, `<path d='M0 6Q7 0 14 6T28 6' fill='none' stroke='${c}' stroke-width='1.8'/>`)
    case 'zigzag':
      return svgBg(20, 12, `<path d='M0 9L5 3L10 9L15 3L20 9' fill='none' stroke='${c}' stroke-width='1.8'/>`)
    case 'gingham':
      return {
        backgroundImage: `linear-gradient(90deg, ${soft} 50%, transparent 50%), linear-gradient(${soft} 50%, transparent 50%)`,
        backgroundSize: '24px 24px',
      }
    default:
      return {}
  }
}