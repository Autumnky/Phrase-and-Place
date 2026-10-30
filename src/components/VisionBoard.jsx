import { useCallback, useEffect, useRef, useState } from 'react'
import interact from 'interactjs'
import { toPng } from 'html-to-image'
import { todayKey } from '../utils/storage'
import { loadBoard, saveBoard, emptyBoard } from '../utils/boardStore'
import PHOTOS from '../data/photos.json'
import movies from '../data/movies.json'
import { pastPhrases } from '../utils/history'
import {
  BG_COLORS, COLLAGE, DOODLES, EMOJI_GROUPS, INK_COLORS, PATTERNS, PC_COLORS,
  ColorRow, DoodleSticker, PatternSwatch, Scaled, ShapeControls, ShapeSticker,
  lum, patternStyle, sizeFor,
} from './Stickers'

// ขนาดบอร์ดแต่ละหน้าจอ (หน่วยพิกัดบนบอร์ด) และความกว้างของรูปที่เซฟออกมา
const FORMATS = {
  desktop: { label: 'Desktop 16:10', w: 1600, h: 1000, out: 1920 }, // เซฟ 1920x1200
  phone: { label: 'Phone portrait', w: 600, h: 1300, out: 1080 }, // เซฟ 1080x2340
}
const DEFAULT_BG = '#b98f66'
const MIN = 48
const BGS = ['#b98f66', '#e9dcc8', '#c9d3c4', '#2f4f46']
const TABS = ['Phrase card', 'Stickers', 'Photos', 'Note', 'Edit']
const STICKER_CATS = ['Text', 'Emoji', 'Doodle', 'Collage']
const QUICK = ['GROW', 'BREATHE', 'SLOW DOWN', 'HOPE', 'dream big', 'be kind', 'hello', 'you got this']
// ใช้ในแท็บ Phrase card: หาหนังจากรหัส และย่อวันที่เป็นภาษาไทย
const MOVIE_BY_ID = Object.fromEntries(movies.map((m) => [m.id, m]))
const MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const shortDate = (d) => {
  const [, m, day] = d.split('-').map(Number)
  return `${day} ${MONTHS_SHORT[m - 1]}`
}

// ---------- คลังรูป Unsplash (src/data/photos.json) ----------
// ใช้ลิงก์รูปตรงจาก images.unsplash.com (ไม่ตัดพารามิเตอร์ ixid) และให้เครดิตช่างภาพพร้อมลิงก์
const UNSPLASH = 'https://unsplash.com/?utm_source=phrase_and_place&utm_medium=referral'
const CATS = PHOTOS.categories ?? []
const PHOTO_INDEX = {}
CATS.forEach((c) => c.photos.forEach((p) => { PHOTO_INDEX[p.id] = p }))
const photoSrc = (p, w) =>
  `https://images.unsplash.com/${p.cdn}?fm=jpg&q=70&w=${w}&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=${p.ixid}`
const creditOf = (p) => ({
  name: p.name,
  link: `https://unsplash.com/@${p.user}?utm_source=phrase_and_place&utm_medium=referral`,
})
const measureRatio = (src) =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalHeight / img.naturalWidth)
    img.onerror = () => resolve(0.75)
    img.src = src
  })

// การ์ดข้อความเริ่มต้นเป็นสีครีม ตัวหนังสือสีเข้ม
const CREAM = '#fbf2dc'
const INK = '#2f2a27'
const POLAROID_BG = '#fffdf8'
const CARD_COLORS = [CREAM, '#ffffff', '#f6d6d2', '#d7e6d8', '#d9e4f5', '#fdf3d0', '#273d66', '#2f2a27']
const TEXT_COLORS = ['#2f2a27', '#5b4636', '#b0443d', '#2f4f46', '#273d66', '#ffffff', '#f4b9c4']
const NOTE_DEFAULT = 'slow mornings & brave dreams'

const DND = 'application/x-pap' // ชนิดข้อมูลของสิ่งที่ลากจากแถบด้านข้าง

const uid = () => Math.random().toString(36).slice(2, 9)
const rad = (d) => (d * Math.PI) / 180

// สีแพทเทิร์นอัตโนมัติ (ถ้าผู้ใช้ไม่เลือกเอง): ขาวบนพื้นเข้ม เข้มบนพื้นสว่าง
const patColor = (it) => it.pc ?? (lum(it.bg) > 0.6 ? '#2f2a27' : '#ffffff')

// ชิ้นงานที่แก้ไขได้ในแท็บ Edit (คลิกแล้วเปิดแท็บ Edit ให้เอง)
const isEditable = (it) => it.variant === 'shape' || it.variant === 'doodle' || it.type === 'text' || it.type === 'photo'

// ทำให้ element ลากไปวางบนบอร์ดได้ (ส่งข้อมูลว่าจะสร้างอะไร)
const dnd = (payload) => ({
  draggable: true,
  onDragStart: (e) => {
    e.dataTransfer.setData(DND, JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'copy'
  },
})

// จัดงานจากบอร์ดขนาดหนึ่ง (from) ให้พอดีกับบอร์ดอีกขนาด (to) คืนสำเนาชุดใหม่ (id ใหม่ ไม่แตะของเดิม)
//  - ปลายทางเป็นแนวตั้ง (phone): เรียงซ้อนลงมาตามตำแหน่งเดิม ย่อให้กว้างไม่เกิน 80% ของบอร์ด
//  - ปลายทางเป็นแนวนอน (desktop): ย่อ/ขยายทั้งชุดให้พอดีแล้ววางกึ่งกลาง
function reflow(items, from, to) {
  const round = (n) => Math.round(n)
  if (to.h > to.w) {
    const gap = 28
    const maxW = to.w * 0.8
    const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
    const boxes = sorted.map((it) => {
      const k = Math.min(1, maxW / it.w)
      return { it, w: it.w * k, h: it.h * k }
    })
    const total = boxes.reduce((s, b) => s + b.h, 0) + gap * (boxes.length - 1)
    const fit = Math.min(1, (to.h - gap * 2) / total) // ยาวเกินกรอบ ย่อทั้งชุด
    let y = (to.h - total * fit) / 2
    return boxes.map(({ it, w, h }) => {
      const w2 = w * fit
      const h2 = h * fit
      const out = { ...it, id: uid(), w: round(w2), h: round(h2), x: round((to.w - w2) / 2), y: round(y) }
      y += h2 + gap * fit
      return out
    })
  }
  const s = Math.min(to.w / from.w, to.h / from.h)
  const ox = (to.w - from.w * s) / 2
  const oy = (to.h - from.h * s) / 2
  return items.map((it) => ({
    ...it,
    id: uid(),
    w: round(it.w * s),
    h: round(it.h * s),
    x: round(it.x * s + ox),
    y: round(it.y * s + oy),
  }))
}

// ตำแหน่งของชิ้นใหม่ในบอร์ดขนาด dims: ถ้ามีจุดที่วาง (at) ใช้เป็นกึ่งกลาง ไม่งั้นวางกลางบอร์ดเยื้องเล็กน้อย
// และบีบให้อยู่ในกรอบบอร์ดเสมอ
const placeIn = (dims, w, h, at) => {
  const cx = at ? at.x : dims.w / 2 + (Math.random() - 0.5) * Math.min(300, dims.w * 0.3)
  const cy = at ? at.y : dims.h / 2 + (Math.random() - 0.5) * Math.min(240, dims.h * 0.2)
  const clamp = (v, max) => Math.round(Math.min(Math.max(v, 0), Math.max(0, max)))
  return { w, h, x: clamp(cx - w / 2, dims.w - w), y: clamp(cy - h / 2, dims.h - h) }
}

// ประมาณจำนวนบรรทัดและความสูงกล่องข้อความจากความยาวตัวอักษร
const lines = (text, w, fs) => Math.ceil(text.length / Math.max(6, Math.floor(w / (fs * 0.52))))
const textHeight = (text, w, k) => {
  const fs = w * k
  return Math.round(lines(text, w, fs) * fs * 1.35 + w * 0.16)
}
// การ์ดที่มีทั้งประโยคอังกฤษและคำแปลไทย (คำแปลตัวเล็กกว่า 0.72 เท่า)
const pairHeight = (en, th, w, k) => {
  const f1 = w * k
  const f2 = f1 * 0.72
  return Math.round(lines(en, w, f1) * f1 * 1.35 + lines(th, w, f2) * f2 * 1.45 + w * 0.2)
}
// การ์ด Polaroid: ขอบ + รูป + ประโยค + คำแปลไทย + บรรทัดชื่อหนัง (ขนาดตัวอักษรหลัก = 5% ของความกว้าง)
const polaroidHeight = (text, w, th = '') => {
  const fs = w * 0.05
  const pad = fs * 0.9
  const inner = w - 2 * pad
  const img = inner * 0.72
  const txt = lines(text, inner, fs) * fs * 1.3
  const thh = th ? fs * 0.35 + lines(th, inner, fs * 0.85) * fs * 0.85 * 1.5 : 0
  return Math.round(pad + img + fs * 0.7 + txt + thh + fs * 1.2 + pad)
}
// ความสูงของรูปเมื่อมีกรอบ (padding ซ้าย-ขวา 14px บน 14px ล่าง 44px) และเมื่อไม่มีกรอบ
const framedHeight = (w, ratio) => Math.round((w - 28) * ratio + 58)
const bareHeight = (w, ratio) => Math.round(w * ratio)

// ย่อรูปก่อนเก็บ (รับได้ทั้งไฟล์และ Blob)
function readPhoto(file, max = 900) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve({ src: c.toDataURL('image/jpeg', 0.75), ratio: c.height / c.width })
    }
    img.onerror = reject
    img.src = url
  })
}

// รูปหนังจากลิงก์: พยายามโหลดแล้วย่อเก็บในเครื่อง ถ้าไม่ได้ (ติด CORS) ใช้ลิงก์ตรง
async function loadRemoteImage(url) {
  try {
    const res = await fetch(url, { mode: 'cors' })
    return await readPhoto(await res.blob())
  } catch {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ src: url, ratio: img.naturalHeight / img.naturalWidth })
      img.onerror = () => resolve(null)
      img.src = url
    })
  }
}

function bodyStyle(it) {
  if (it.type === 'text') {
    return {
      backgroundColor: it.bg,
      color: it.ink,
      fontSize: it.w * it.k,
      ...patternStyle(it.pattern, patColor(it)), // แพทเทิร์นบนการ์ดข้อความ
    }
  }
  if (it.variant === 'polaroid') return { background: it.bg, color: it.ink, fontSize: it.w * 0.05 }
  if (it.type === 'sticker' && (it.variant === 'emoji' || it.variant === 'stamp')) {
    return { fontSize: it.w * (it.variant === 'emoji' ? 0.7 : 0.16) }
  }
  return undefined
}

export default function VisionBoard({ phrase, onBack }) {
  const [ready, setReady] = useState(false) // โหลดบอร์ดที่บันทึกไว้เสร็จแล้ว (ก่อนหน้านี้ห้ามบันทึกทับ)
  const [format, setFormat] = useState('desktop')
  const [items, setItems] = useState([])
  const [bg, setBg] = useState(DEFAULT_BG)
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('Phrase card')
  const [cat, setCat] = useState('Text') // หมวดย่อยในแท็บ Stickers
  const [pcat, setPcat] = useState(CATS[0]?.id) // หมวดรูปในแท็บ Photos
  const [draft, setDraft] = useState({ text: 'GROW', shape: 'circle', pattern: 'dots', bg: '#e8d083', ink: '#b0443d' })
  const [note, setNote] = useState('')
  const [noteStyle, setNoteStyle] = useState({ bg: CREAM, ink: INK, pattern: 'none' }) // สี/แพทเทิร์นของโน้ตที่จะสร้าง
  const [zoom, setZoom] = useState(0.76)
  const [status, setStatus] = useState('Loading…')
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false) // กำลังลากของมาอยู่เหนือบอร์ด
    const [past] = useState(pastPhrases) // ประโยคที่เคยได้ (ใหม่ → เก่า ไม่รวมวันนี้)
  const [pastShown, setPastShown] = useState(6) // จำนวนที่แสดงในแท็บ Phrase card

  const dims = FORMATS[format]
  const zoomRef = useRef(zoom)
  const manualZoom = useRef(false)
  const stageRef = useRef(null)
  const boardRef = useRef(null)
  const movieImgs = useRef({}) // แคชรูปหนังที่โหลดแล้ว (key = ลิงก์รูป)  
  const layoutsRef = useRef(emptyBoard().layouts) // เลย์เอาต์ของทั้งสองหน้าจอ (หน้าที่เปิดอยู่ใช้ items/bg แทน)
  const latest = useRef(null)
  latest.current = { items, bg, format, ready }

  const sel = items.find((i) => i.id === selected)
  const hasColors = sel && (sel.type === 'text' || sel.variant === 'polaroid') // เปลี่ยนสีการ์ด/ตัวอักษรได้
  const isPhoto = sel?.type === 'photo' && sel.variant !== 'polaroid' // รูปธรรมดา (เปิด/ปิดกรอบได้)
  const draftSize = sizeFor(draft.shape)
  const noteText = note.trim() || NOTE_DEFAULT
  const noteCss = { backgroundColor: noteStyle.bg, color: noteStyle.ink, ...patternStyle(noteStyle.pattern, patColor(noteStyle)) }
  const activeCat = CATS.find((c) => c.id === pcat) ?? CATS[0]

  const place = (w, h, at) => placeIn(dims, w, h, at)

  const patch = useCallback(
    (id, fn) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...fn(it) } : it))),
    [],
  )
  const remove = useCallback((id) => {
    setItems((list) => list.filter((it) => it.id !== id))
    setSelected(null)
  }, [])

  const add = (item) =>
    setItems((list) => {
      const z = list.reduce((m, i) => Math.max(m, i.z), 0) + 1
      return [...list, { id: uid(), rot: Math.round((Math.random() - 0.5) * 6), z, ...item }]
    })

  const pick = (id) => {
    setSelected(id)
    const cur = items.find((i) => i.id === id)
    if (cur && isEditable(cur)) setTab('Edit') // คลิกชิ้นงานที่แก้ไขได้ แล้วเปิดแท็บ Edit ให้เอง
    setItems((list) => {
      const top = Math.max(...list.map((i) => i.z))
      const c = list.find((i) => i.id === id)
      return !c || c.z === top ? list : list.map((i) => (i.id === id ? { ...i, z: top + 1 } : i))
    })
  }

  // ---------- โหลด / บันทึกบอร์ดใบเดียว (IndexedDB) ----------
  useEffect(() => {
    let alive = true
    loadBoard().then((b) => {
      if (!alive) return
      layoutsRef.current = b.layouts
      const L = b.layouts[b.format] ?? { items: [], bg: DEFAULT_BG }
      setFormat(b.format)
      setItems(L.items)
      setBg(L.bg)
      setReady(true)
      setStatus('Auto-saved')
    })
    return () => { alive = false }
  }, [])

  // บันทึกอัตโนมัติหลังแก้ไข 0.4 วินาที
  useEffect(() => {
    if (!ready) return
    setStatus('Saving…')
    const t = setTimeout(async () => {
      layoutsRef.current = { ...layoutsRef.current, [format]: { items, bg } }
      const ok = await saveBoard({ v: 1, format, layouts: layoutsRef.current })
      setStatus(ok ? 'Auto-saved' : "Couldn't save: check browser storage")
    }, 400)
    return () => clearTimeout(t)
  }, [items, bg, format, ready])

  // กดกลับหรือปิดแท็บทันที: บันทึกสิ่งที่แก้ล่าสุดก่อน (กันงานหายใน 0.4 วินาทีสุดท้าย)
  useEffect(() => {
    const flush = () => {
      const cur = latest.current
      if (!cur?.ready) return
      layoutsRef.current = { ...layoutsRef.current, [cur.format]: { items: cur.items, bg: cur.bg } }
      saveBoard({ v: 1, format: cur.format, layouts: layoutsRef.current })
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  // สลับหน้าจอ Desktop / Phone: เก็บเลย์เอาต์เดิมไว้ แล้วโหลดของอีกหน้าจอมาแสดง
  const changeFormat = (next) => {
    if (next === format) return
    layoutsRef.current = { ...layoutsRef.current, [format]: { items, bg } }
    const L = layoutsRef.current[next] ?? { items: [], bg: DEFAULT_BG }
    setSelected(null)
    manualZoom.current = false
    setFormat(next)
    setItems(L.items)
    setBg(L.bg)
  }

    // คัดลอกงานจากอีกขนาดมาจัดให้พอดีกรอบนี้ (ไม่แตะของเดิมในอีกขนาด)
  const copyFromOther = () => {
    const other = format === 'desktop' ? 'phone' : 'desktop'
    const src = layoutsRef.current[other]?.items ?? []
    if (src.length === 0) {
      alert(`ยังไม่มีงานในขนาด ${FORMATS[other].label}`)
      return
    }
    if (items.length > 0 && !confirm(`ขนาดนี้มีงานอยู่แล้ว ต้องการแทนที่ด้วยสำเนาจาก ${FORMATS[other].label} หรือไม่?`)) return
    setSelected(null)
    setItems(reflow(src, FORMATS[other], dims))
  }

  // ---------- เพิ่มชิ้นใหม่ (at = จุดที่ลากมาวาง ถ้าไม่ระบุจะวางกลางบอร์ด) ----------
  // style = { bg, ink, pattern, pc } ใช้กับโน้ตที่เลือกสี/แพทเทิร์นไว้
  const addText = (text, variant, at, style) => {
    const quote = variant === 'quote'
    const w = quote ? 460 : 380
    const k = quote ? 0.075 : 0.07
    add({
      type: 'text',
      variant,
      text,
      k,
      bg: style?.bg ?? CREAM,
      ink: style?.ink ?? INK,
      pattern: style?.pattern ?? 'none',
      pc: style?.pc,
      ...place(w, textHeight(text, w, k), at),
    })
  }

  // การ์ดใบเดียวมีทั้งประโยคอังกฤษ (text) และคำแปลไทย (sub)
  const addPair = (text, sub, at) => {
    const w = 520
    const k = 0.062
    add({ type: 'text', variant: 'pair', text, sub, k, bg: CREAM, ink: INK, ...place(w, pairHeight(text, sub, w, k), at) })
  }

  const addEmoji = (text, at) => add({ type: 'sticker', variant: 'emoji', text, ...place(110, 110, at) })

  // สติกเกอร์รูปร่าง (ตัวอักษร / คอลลาจ)
  const addShape = (spec, at) => {
    const sz = spec.w ? { w: spec.w, h: spec.h } : sizeFor(spec.shape)
    add({ type: 'sticker', variant: 'shape', ...spec, ...place(sz.w, sz.h, at) })
  }

  const addDoodle = (id, at) => {
    const dd = DOODLES[id]
    if (!dd) return
    add({ type: 'sticker', variant: 'doodle', doodle: id, bg: dd.color ?? '#fff3a8', ink: INK, ...place(150, 150, at) })
  }

  // รูปที่อัปโหลด: เริ่มต้นมีกรอบ Polaroid (frame: true) เก็บ ratio ไว้ใช้ตอนเปิด/ปิดกรอบ
  const addPhoto = async (file, at) => {
    try {
      const { src, ratio } = await readPhoto(file)
      add({ type: 'photo', src, ratio, frame: true, ...place(360, framedHeight(360, ratio), at) })
    } catch {
      alert('เปิดรูปนี้ไม่ได้ ลองไฟล์ JPG หรือ PNG')
    }
  }

  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) addPhoto(file)
  }

  // รูปจากคลัง Unsplash: ใช้ลิงก์รูปตรง (ไม่ดาวน์โหลดเก็บ) เก็บชื่อช่างภาพไว้ให้เครดิตในแท็บ Edit
  const addStockPhoto = async (p, at) => {
    if (!p) return
    const src = photoSrc(p, 1080)
    const ratio = await measureRatio(src)
    add({ type: 'photo', src, ratio, frame: true, credit: creditOf(p), ...place(380, framedHeight(380, ratio), at) })
  }

  // เปิด/ปิดกรอบ Polaroid ของรูป พร้อมปรับความสูงให้พอดีกับสัดส่วนรูป (ไม่ให้รูปถูกครอป)
  const toggleFrame = (it, on) => {
    const ratio = it.ratio ?? (it.h - 58) / (it.w - 28)
    patch(it.id, () => ({ frame: on, ratio, h: on ? framedHeight(it.w, ratio) : bareHeight(it.w, ratio) }))
  }

    // ---------- รูปหนัง (ของวันนี้หรือของวันก่อน ๆ) ----------
  const getMovieImage = async (url) => {
    if (!movieImgs.current[url]) movieImgs.current[url] = await loadRemoteImage(url)
    return movieImgs.current[url]
  }

  // รูปหนังของวันนี้: มีชื่อหนัง · ปี ตัวเล็กที่มุมขวาล่างของรูป (meta)
  const addMoviePhoto = async (at) => {
    if (!phrase) return
    const img = await getMovieImage(phrase.image)
    if (!img) { alert('โหลดรูปหนังไม่ได้ ลองใหม่อีกครั้ง'); return }
    add({
      type: 'photo',
      src: img.src,
      ratio: img.ratio,
      frame: true,
      meta: `${phrase.source} · ${phrase.year}`,
      ...place(420, framedHeight(420, img.ratio), at),
    })
  }

  // การ์ด Polaroid: รูปหนัง + ประโยค + คำแปลไทย + ชื่อหนังและปีตัวเล็กที่มุมขวาล่าง
  // p = ประโยคที่จะใช้ (ไม่ระบุ = ของวันนี้)
  const addPolaroid = async (at, p = phrase) => {
    if (!p) return
    const img = await getMovieImage(p.image)
    if (!img) { alert('โหลดรูปหนังไม่ได้ ลองใหม่อีกครั้ง'); return }
    const w = 380
    add({
      type: 'photo',
      variant: 'polaroid',
      src: img.src,
      text: p.sentence,
      th: p.translation,
      meta: `${p.source} · ${p.year}`,
      bg: POLAROID_BG,
      ink: INK,
      ...place(w, polaroidHeight(p.sentence, w, p.translation), at),
    })
  }
  // ---------- ลากมาวางบนบอร์ด ----------
  const onDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!over) setOver(true)
  }
  const onDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setOver(false)
  }
  const onDrop = (e) => {
    e.preventDefault()
    setOver(false)
    // แปลงตำแหน่งเมาส์เป็นพิกัดบนบอร์ด (ชดเชยการซูม)
    const r = boardRef.current.getBoundingClientRect()
    const at = { x: (e.clientX - r.left) / zoomRef.current, y: (e.clientY - r.top) / zoomRef.current }

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) { addPhoto(file, at); return } // ลากไฟล์รูปจากเครื่อง

    const raw = e.dataTransfer.getData(DND)
    if (!raw) return
    try {
      const d = JSON.parse(raw)
      if (d.type === 'polaroid') addPolaroid(at, MOVIE_BY_ID[d.id]) // ไม่มี id = ประโยคของวันนี้      
      else if (d.type === 'moviephoto') addMoviePhoto(at)
      else if (d.type === 'stock') addStockPhoto(PHOTO_INDEX[d.id], at)
      else if (d.type === 'both') addPair(d.text, d.sub, at)
      else if (d.type === 'quote') addText(d.text, 'quote', at)
      else if (d.type === 'note') addText(d.text, 'note', at, d.style)
      else if (d.type === 'emoji') addEmoji(d.text, at)
      else if (d.type === 'shape') addShape(d.spec, at)
      else if (d.type === 'doodle') addDoodle(d.id, at)
    } catch {
      /* ไม่ใช่ของจากแถบเครื่องมือ ข้ามไป */
    }
  }

  // ---------- interact.js: ลาก / ย่อขยาย / หมุน ----------
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    const z = () => zoomRef.current

    interact('.item').draggable({
      ignoreFrom: '.handle',
      listeners: {
        move(e) {
          const { dx, dy } = e
          patch(e.target.dataset.id, (it) => ({ x: it.x + dx / z(), y: it.y + dy / z() }))
        },
      },
    })

    // ย่อขยายจากมุมขวาล่าง คำนวณตามมุมหมุน และตรึงมุมซ้ายบนไว้ที่เดิม
    interact('.h-size').draggable({
      listeners: {
        move(e) {
          const { dx, dy } = e
          patch(e.target.closest('.item').dataset.id, (it) => {
            const r = rad(it.rot)
            const lx = (dx * Math.cos(r) + dy * Math.sin(r)) / z()
            const ly = (-dx * Math.sin(r) + dy * Math.cos(r)) / z()
            const w = Math.max(MIN, it.w + lx)
            const h = it.type === 'text' ? Math.max(MIN, it.h + ly) : (w * it.h) / it.w // รูป/สติกเกอร์คงอัตราส่วน
            const dw = w - it.w
            const dh = h - it.h
            const cx = it.x + it.w / 2 + (dw * Math.cos(r) - dh * Math.sin(r)) / 2
            const cy = it.y + it.h / 2 + (dw * Math.sin(r) + dh * Math.cos(r)) / 2
            return { w, h, x: cx - w / 2, y: cy - h / 2 }
          })
        },
      },
    })

    // หมุนรอบจุดกึ่งกลาง ตามตำแหน่งเมาส์/นิ้ว
    interact('.h-rot').draggable({
      listeners: {
        move(e) {
          const el = e.target.closest('.item')
          const box = el.getBoundingClientRect()
          const cx = box.left + box.width / 2
          const cy = box.top + box.height / 2
          const deg = (Math.atan2(e.client.y - cy, e.client.x - cx) * 180) / Math.PI + 90
          patch(el.dataset.id, () => ({ rot: Math.round(deg) }))
        },
      },
    })

    return () => {
      interact('.item').unset()
      interact('.h-size').unset()
      interact('.h-rot').unset()
    }
  }, [patch])

  // ปรับซูมให้พอดีหน้าจอ (จนกว่าผู้ใช้จะกดปุ่ม − / + เอง) บอร์ดแนวตั้งให้พอดีทั้งความกว้างและความสูง
  useEffect(() => {
    const fit = () => {
      if (manualZoom.current || !stageRef.current) return
      let z = (stageRef.current.clientWidth - 40) / dims.w
      if (format === 'phone') z = Math.min(z, (window.innerHeight - 260) / dims.h)
      setZoom(Math.min(1, Math.max(0.2, +z.toFixed(2))))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [format, dims.w, dims.h])
  const changeZoom = (d) => {
    manualZoom.current = true
    setZoom((v) => Math.min(1.5, Math.max(0.2, +(v + d).toFixed(2))))
  }

  // กด Delete / Backspace เพื่อลบชิ้นที่เลือก
  useEffect(() => {
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName)
      if (selected && !typing && (e.key === 'Delete' || e.key === 'Backspace')) remove(selected)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, remove])

  // Save as image: ขนาดตามหน้าจอที่เปิดอยู่ (Desktop 1920x1200 / Phone 1080x2340)
  const save = async () => {
    setSelected(null) // เอากรอบและปุ่มจับออกก่อนถ่าย
    setBusy(true)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    try {
      const url = await toPng(boardRef.current, {
        width: dims.w,
        height: dims.h,
        pixelRatio: dims.out / dims.w,
        cacheBust: true,
      })
      const a = document.createElement('a')
      a.download = `vision-board-${format}-${todayKey()}.png`
      a.href = url
      a.click()
    } catch (err) {
      console.warn(err)
      alert('Save ไม่สำเร็จ ลองกดอีกครั้ง')
    }
    setBusy(false)
  }

  return (
    <div className="vb">
      <header className="vb-top">
        <button className="btn ghost" onClick={onBack}>← Back</button>
        <div className="vb-title">
          <h2>My Vision Board</h2>
          <small>{status}</small>
        </div>
        <button className="btn" onClick={save} disabled={busy || !ready}>{busy ? 'Saving…' : 'Save as image'}</button>
      </header>

      <div className="vb-main">
        <aside className="tools">
          <h3>Assets</h3>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

                    {tab === 'Phrase card' && (
            <>
              <h4 className="sec">Phrase card ของคุณวันนี้</h4>
              {phrase ? (
                <>
                  <p className="cap">ลากไปวางบนบอร์ด (หรือดับเบิลคลิกที่การ์ด)</p>
                  <div className="pol-prev drag" {...dnd({ type: 'polaroid' })} onDoubleClick={() => addPolaroid()} title="ลากไปวางบนบอร์ด">
                    <div className="polaroid" style={{ fontSize: 12, background: POLAROID_BG, color: INK }}>
                      <img src={phrase.image} alt="" draggable={false} />
                      <p className="pol-text">{phrase.sentence}</p>
                      <p className="pol-th">{phrase.translation}</p>
                      <span className="pol-meta">{phrase.source} · {phrase.year}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="hint">วันนี้ยังไม่ได้เลือกความรู้สึก เลือก mood ก่อนเพื่อรับประโยคของวันนี้ หรือเลือกจากประโยคที่เคยได้ด้านล่างได้เลย</p>
              )}

              <hr className="sep" />

              <h4 className="sec">Phrase card ที่คุณเคยได้</h4>
              {past.length === 0 ? (
                <p className="hint">ยังไม่มีประโยคจากวันก่อน ๆ พรุ่งนี้กลับมาเลือกอารมณ์ใหม่ ประโยคของวันนี้จะมาอยู่ตรงนี้</p>
              ) : (
                <>
                  <p className="cap">ลากไปวางบนบอร์ด (หรือดับเบิลคลิกที่การ์ด)</p>
                  <div className="pol-grid">
                    {past.slice(0, pastShown).map(({ date, phrase: p }) => (
                      <figure key={date} className="pol-cell">
                        <div
                          className="pol-prev pol-mini drag"
                          {...dnd({ type: 'polaroid', id: p.id })}
                          onDoubleClick={() => addPolaroid(undefined, p)}
                          title={`${p.sentence} · ลากไปวางบนบอร์ด`}
                        >
                          <div className="polaroid" style={{ fontSize: 9, background: POLAROID_BG, color: INK }}>
                            <img src={p.image} alt="" loading="lazy" draggable={false} />
                            <p className="pol-text">{p.sentence}</p>
                          </div>
                        </div>
                        <figcaption className="pol-date">{shortDate(date)}</figcaption>
                      </figure>
                    ))}
                  </div>
                  {past.length > pastShown && (
                    <button className="btn ghost" onClick={() => setPastShown((n) => n + 6)}>ดูเพิ่ม</button>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'Stickers' && (
            <>
              <div className="subtabs">
                {STICKER_CATS.map((c) => (
                  <button key={c} className={c === cat ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>
                ))}
              </div>

              {cat === 'Text' && (
                <>
                  <p className="cap">สร้างสติกเกอร์ตัวอักษร · ลากตัวอย่างไปวางบนบอร์ด (หรือดับเบิลคลิก)</p>
                  <div className="stk-preview drag" {...dnd({ type: 'shape', spec: draft })} onDoubleClick={() => addShape(draft)} title="ลากไปวางบนบอร์ด">
                    <Scaled w={draftSize.w} h={draftSize.h} maxW={260} maxH={150}>
                      <ShapeSticker it={{ ...draft, ...draftSize }} />
                    </Scaled>
                  </div>
                  <div className="quick">
                    {QUICK.map((t) => (
                      <button key={t} className="qchip" onClick={() => setDraft((d) => ({ ...d, text: t }))}>{t}</button>
                    ))}
                  </div>
                  <ShapeControls v={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} />
                </>
              )}

              {cat === 'Emoji' && (
                <>
                  <p className="cap">ลากอีโมจิไปวางบนบอร์ด</p>
                  {EMOJI_GROUPS.map((g) => (
                    <section key={g.name} className="egroup">
                      <p className="cap">{g.name}</p>
                      <div className="grid">
                        {g.items.map((e) => (
                          <button key={e} className="chip drag" {...dnd({ type: 'emoji', text: e })} onClick={() => addEmoji(e)}>{e}</button>
                        ))}
                      </div>
                    </section>
                  ))}
                </>
              )}

              {cat === 'Doodle' && (
                <>
                  <p className="cap">ลายเส้นวาดมือ · ลากไปวาง (หรือดับเบิลคลิก) แล้วเปลี่ยนสีได้ที่แท็บ Edit</p>
                  <div className="cells">
                    {Object.entries(DOODLES).map(([id, dd]) => (
                      <div key={id} className="cell" {...dnd({ type: 'doodle', id })} onDoubleClick={() => addDoodle(id)} title={dd.label}>
                        <div className="cell-doodle"><DoodleSticker it={{ doodle: id, bg: dd.color ?? '#fff3a8', ink: INK }} /></div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {cat === 'Collage' && (
                <>
                  <p className="cap">ชิ้นแนวคอลลาจ · ลากไปวาง (หรือดับเบิลคลิก) แล้วปรับแต่งที่แท็บ Edit</p>
                  <div className="cells">
                    {COLLAGE.map((c) => (
                      <div key={c.id} className="cell" {...dnd({ type: 'shape', spec: c.spec })} onDoubleClick={() => addShape(c.spec)} title={c.id}>
                        <Scaled w={c.spec.w} h={c.spec.h} maxW={84} maxH={76}>
                          <ShapeSticker it={c.spec} />
                        </Scaled>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'Photos' && (
            <>
              {phrase && (
                <>
                  <p className="cap">รูปหนังของวันนี้ · ลากไปวางบนบอร์ด (หรือดับเบิลคลิก)</p>
                  <div className="mtile drag" {...dnd({ type: 'moviephoto' })} onDoubleClick={() => addMoviePhoto()} title="ลากไปวางบนบอร์ด">
                    <img src={phrase.image} alt="" draggable={false} />
                    <span>{phrase.source} · {phrase.year}</span>
                  </div>
                </>
              )}

              <label className="btn">
                + Upload photo
                <input type="file" accept="image/*" hidden onChange={onPhoto} />
              </label>
              <p className="hint">หรือลากไฟล์รูปจากเครื่องมาวางบนบอร์ดได้เลย · คลิกรูปบนบอร์ดแล้วเลือกเอา/ไม่เอากรอบ Polaroid ได้ที่แท็บ Edit</p>

              <hr className="sep" />

              <p className="cap">Photo library · ลากไปวางบนบอร์ด (หรือดับเบิลคลิก)</p>
              {CATS.length === 0 ? (
                <p className="hint">ยังไม่มีรูปในคลัง ตรวจไฟล์ src/data/photos.json</p>
              ) : (
                <>
                  <div className="quick">
                    {CATS.map((c) => (
                      <button key={c.id} className={'qchip' + (c.id === activeCat.id ? ' on' : '')} onClick={() => setPcat(c.id)}>{c.label}</button>
                    ))}
                  </div>
                  <div className="pgrid">
                    {activeCat.photos.map((p) => (
                      <figure key={p.id} className="pthumb">
                        <div className="drag" {...dnd({ type: 'stock', id: p.id })} onDoubleClick={() => addStockPhoto(p)} title="ลากไปวางบนบอร์ด">
                          <img src={photoSrc(p, 400)} alt={p.alt} loading="lazy" draggable={false} />
                        </div>
                        <figcaption className="pcap">
                          <a href={creditOf(p).link} target="_blank" rel="noreferrer">{p.name}</a>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  <p className="hint">Photos from <a href={UNSPLASH} target="_blank" rel="noreferrer">Unsplash</a></p>
                </>
              )}
            </>
          )}

          {tab === 'Note' && (
            <>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={NOTE_DEFAULT} />

              <p className="cap">Note · ลากไปวางบนบอร์ด (หรือดับเบิลคลิกที่การ์ด)</p>
              <div
                className="clip drag"
                style={noteCss}
                {...dnd({ type: 'note', text: noteText, style: noteStyle })}
                onDoubleClick={() => addText(noteText, 'note', undefined, noteStyle)}
                title="ลากไปวางบนบอร์ด"
              >
                <p className="clip-q">{noteText}</p>
              </div>

              <ColorRow label="Card color" value={noteStyle.bg} colors={CARD_COLORS} onPick={(c) => setNoteStyle((s) => ({ ...s, bg: c }))} />
              <ColorRow label="Text color" value={noteStyle.ink} colors={TEXT_COLORS} onPick={(c) => setNoteStyle((s) => ({ ...s, ink: c }))} />

              <p className="cap">Pattern</p>
              <div className="pat-grid">
                {PATTERNS.map((p) => (
                  <button key={p} className={'pat' + ((noteStyle.pattern ?? 'none') === p ? ' on' : '')} title={p} onClick={() => setNoteStyle((s) => ({ ...s, pattern: p }))}>
                    <PatternSwatch kind={p} bg={noteStyle.bg} />
                  </button>
                ))}
              </div>
              {noteStyle.pattern && noteStyle.pattern !== 'none' && (
                <ColorRow label="Pattern color" value={noteStyle.pc ?? ''} colors={PC_COLORS} onPick={(c) => setNoteStyle((s) => ({ ...s, pc: c }))} />
              )}
            </>
          )}

          {tab === 'Edit' && (
            <>
              {/* สติกเกอร์ตัวอักษร / คอลลาจ */}
              {sel?.variant === 'shape' && (
                <>
                  <p className="cap">แก้ไขสติกเกอร์ที่เลือก · ข้อความ รูปร่าง แพทเทิร์น และสี</p>
                  <ShapeControls v={sel} extras onChange={(p) => patch(sel.id, () => p)} />
                </>
              )}

              {/* Doodle */}
              {sel?.variant === 'doodle' && (
                <>
                  <p className="cap">แก้ไข doodle ที่เลือก</p>
                  {DOODLES[sel.doodle]?.fill && (
                    <ColorRow label="Fill color" value={sel.bg} colors={BG_COLORS} onPick={(c) => patch(sel.id, () => ({ bg: c }))} />
                  )}
                  <ColorRow label="Line color" value={sel.ink} colors={INK_COLORS} onPick={(c) => patch(sel.id, () => ({ ink: c }))} />
                </>
              )}

              {/* การ์ดข้อความ และการ์ด Polaroid: สีการ์ด + สีตัวอักษร */}
              {hasColors && (
                <>
                  <p className="cap">{sel.type === 'text' ? 'แก้ไขการ์ดข้อความที่เลือก' : 'แก้ไขการ์ด Polaroid ที่เลือก'}</p>
                  <ColorRow label="Card color" value={sel.bg} colors={CARD_COLORS} onPick={(c) => patch(sel.id, () => ({ bg: c }))} />
                  <ColorRow label="Text color" value={sel.ink} colors={TEXT_COLORS} onPick={(c) => patch(sel.id, () => ({ ink: c }))} />
                </>
              )}

              {/* การ์ดข้อความ: แพทเทิร์น */}
              {sel?.type === 'text' && (
                <>
                  <p className="cap">Pattern</p>
                  <div className="pat-grid">
                    {PATTERNS.map((p) => (
                      <button key={p} className={'pat' + ((sel.pattern ?? 'none') === p ? ' on' : '')} title={p} onClick={() => patch(sel.id, () => ({ pattern: p }))}>
                        <PatternSwatch kind={p} bg={sel.bg} />
                      </button>
                    ))}
                  </div>
                  {sel.pattern && sel.pattern !== 'none' && (
                    <ColorRow label="Pattern color" value={sel.pc ?? ''} colors={PC_COLORS} onPick={(c) => patch(sel.id, () => ({ pc: c }))} />
                  )}
                </>
              )}

              {/* รูปภาพ / รูปหนัง: กรอบ Polaroid และชื่อหนัง */}
              {isPhoto && (
                <>
                  <p className="cap">แก้ไขรูปที่เลือก</p>
                  <div className="sc-toggles">
                    <label>
                      <input type="checkbox" checked={sel.frame !== false} onChange={(e) => toggleFrame(sel, e.target.checked)} /> Polaroid frame
                    </label>
                    {sel.meta && (
                      <label>
                        <input type="checkbox" checked={sel.showMeta !== false} onChange={(e) => patch(sel.id, () => ({ showMeta: e.target.checked }))} /> Movie title
                      </label>
                    )}
                  </div>
                  {sel.credit && (
                    <p className="hint">
                      Photo by <a href={sel.credit.link} target="_blank" rel="noreferrer">{sel.credit.name}</a> on <a href={UNSPLASH} target="_blank" rel="noreferrer">Unsplash</a>
                    </p>
                  )}
                </>
              )}

              {!(sel && isEditable(sel)) && (
                <p className="hint">คลิกชิ้นงานบนบอร์ด (สติกเกอร์ doodle การ์ดข้อความ Polaroid หรือรูป) เพื่อแก้ไขที่นี่</p>
              )}

              <hr className="sep" />

              <p className="cap">Wallpaper size</p>
              <div className="subtabs">
                {Object.entries(FORMATS).map(([k, f]) => (
                  <button key={k} className={k === format ? 'on' : ''} onClick={() => changeFormat(k)}>{f.label}</button>
                ))}
              </div>
              <p className="hint">เมื่อสลับขนาด Vision Board แล้วงานของอีกขนาดไม่หายนะ กดปุ่มด้านล่างเพื่อคัดลอกงานจากอีกขนาดมาจัดให้พอดี</p>
              <button className="btn ghost" onClick={copyFromOther}>
                Copy from {format === 'desktop' ? 'Phone' : 'Desktop'}
              </button>

              <p className="cap">Board color</p>
              <div className="swatches">
                {BGS.map((c) => (
                  <button key={c} className={'sw' + (bg === c ? ' on' : '')} style={{ background: c }} onClick={() => setBg(c)} aria-label={`Board color ${c}`} />
                ))}
              </div>
              <button
                className="btn ghost"
                onClick={() => {
                  if (confirm(`ล้างบอร์ดขนาด ${dims.label} ทั้งหมด?`)) { setItems([]); setSelected(null) }
                }}
              >
                Clear board
              </button>
            </>
          )}
        </aside>

        <section className="stage-wrap" ref={stageRef}>
          <div className="zoombar">
            <span>Wallpaper · {dims.label}</span>
            <div className="zoomctl">
              <button onClick={() => changeZoom(-0.1)} aria-label="Zoom out">−</button>
              <b>{Math.round(zoom * 100)}%</b>
              <button onClick={() => changeZoom(0.1)} aria-label="Zoom in">+</button>
            </div>
          </div>

          <div className="scaler" style={{ width: dims.w * zoom, height: dims.h * zoom }}>
            <div className="zoom" style={{ width: dims.w, height: dims.h, transform: `scale(${zoom})`, '--hs': 1 / zoom }}>
              <div
                className={'board' + (over ? ' over' : '')}
                ref={boardRef}
                style={{ backgroundColor: bg }}
                onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                {items.map((it) => (
                  <div
                    key={it.id}
                    data-id={it.id}
                    className={'item' + (selected === it.id ? ' sel' : '')}
                    style={{ left: it.x, top: it.y, width: it.w, height: it.h, zIndex: it.z, transform: `rotate(${it.rot}deg)` }}
                    onPointerDown={() => pick(it.id)}
                    onDoubleClick={() => remove(it.id)}
                  >
                    <div
                      className={`body b-${it.type} v-${it.variant ?? 'none'}${it.type === 'photo' && it.frame === false ? ' nofr' : ''}`}
                      style={bodyStyle(it)}
                    >
                      {it.variant === 'polaroid' ? (
                        <div className="polaroid">
                          <img src={it.src} alt="" draggable={false} />
                          <p className="pol-text">{it.text}</p>
                          {it.th && <p className="pol-th">{it.th}</p>}
                          <span className="pol-meta">{it.meta}</span>
                        </div>
                      ) : it.type === 'photo' ? (
                        <div className="ph">
                          <img src={it.src} alt="" draggable={false} />
                          {it.meta && it.showMeta !== false && (
                            <span className="ph-meta" style={{ fontSize: Math.max(10, it.w * 0.03) }}>{it.meta}</span>
                          )}
                        </div>
                      ) : it.variant === 'shape' ? (
                        <ShapeSticker it={it} />
                      ) : it.variant === 'doodle' ? (
                        <DoodleSticker it={it} />
                      ) : it.sub ? (
                        <div className="t-pair">
                          <p className="t-main">{it.text}</p>
                          <p className="t-sub">{it.sub}</p>
                        </div>
                      ) : (
                        it.text
                      )}
                    </div>
                    {selected === it.id && (
                      <>
                        <span className="handle h-rot" />
                        <span className="handle h-size" />
                        <button className="handle h-del" onClick={() => remove(it.id)} aria-label="Remove">×</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="hint center">Drag to move · Double click to remove</p>
        </section>
      </div>
    </div>
  )
}