import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Logo from './Logo'

// 3 ขั้นตอนหลัก: โผล่ทีละใบ ให้ผู้ใช้ลากไปแปะบนหน้าจอ
const STEPS = [
  { title: 'เลือกความรู้สึกของวันนี้', text: 'วันนี้คุณรู้สึกยังไง เลือกได้เลย ไม่มีถูกผิด' },
  { title: 'รับประโยคจากหนัง 1 ประโยค', text: 'พร้อมคำแปล และคำศัพท์ 2 คำ กดฟังเสียงได้' },
  {
    title: 'เก็บไว้ และต่อยอด',
    text: (
      <>
        <span className="accent">ย้อนดูประโยคที่เคยได้ใน My Days</span> หรือทำ <span className="accent">Vision Board</span> เพื่อกำหนดเป้าหมายของคุณ และใช้เป็นวอลเปเปอร์ได้นะ &gt;&lt;
      </>
    ),
  },
]

// หน้าตาของโน้ตแต่ละใบ: ใบที่ 1 ใหญ่สุด → ใบที่ 3 เล็กสุด (w = กว้าง, h = สูงขั้นต่ำ, r = เอียง, b = ขนาดป้ายเลข)
// ทุกใบขนาดเท่ากัน (w = กว้าง, h = สูง, b = ขนาดป้ายเลข) ต่างกันแค่ความเอียง (r)
const NOTE = { w: 300, h: 210, b: 46 }
const LOOK = [-2.5, 1.8, -1.2].map((r) => ({ ...NOTE, r }))
const AUTO_X = [0.18, 0.5, 0.82] // ตำแหน่งแปะอัตโนมัติ (กด Enter): สัดส่วนของพื้นที่ว่างแนวนอน
const MOVE_MIN = 24 // ต้องลากอย่างน้อยเท่านี้ (px) จึงนับว่า "แปะ"
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi))

export default function Intro({ onStart }) {
  const stage = useRef(null)
  const tray = useRef(null)
  const gesture = useRef(null)

  const [area, setArea] = useState({ w: 0, top: 0 }) // ความกว้างหน้า + ตำแหน่งบนของที่รอโน้ตใบถัดไป
  const [placed, setPlaced] = useState([]) // ใบที่แปะแล้ว: [{ fx, y }] (fx = สัดส่วนแนวนอน, y = px จากบนสุดของหน้า)
  const [drag, setDrag] = useState(null) // { i, x, y } ตอนกำลังลาก

  const current = placed.length // ใบที่รอแปะ (0-2) หรือ 3 = แปะครบแล้ว
  const done = current >= STEPS.length
  const compact = area.w > 0 && area.w < 560 // มือถือ: โน้ตเล็กลง เพื่อให้มีที่วางมากขึ้น
  const noteW = (i) => Math.round(Math.min(LOOK[i].w * (compact ? 0.66 : 1), Math.max(150, area.w - 40)))

  // วัดตำแหน่งที่รอของโน้ต (ใต้หัวข้อ) และความกว้างหน้า
  const measure = () => {
    const s = stage.current
    const t = tray.current
    if (!s || !t) return
    const sr = s.getBoundingClientRect()
    const tr = t.getBoundingClientRect()
    const gap = sr.width < 560 ? 72 : 44 // มือถือ: เว้นที่ให้ข้อความแนะนำเหนือโน้ต
    const next = { w: Math.round(sr.width), top: Math.round(tr.top - sr.top) + gap }
    setArea((a) => (a.w === next.w && a.top === next.top ? a : next))
  }
  useLayoutEffect(measure, [done])
  useEffect(() => {
    const ro = new ResizeObserver(measure)
    ro.observe(stage.current)
    ro.observe(tray.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  useEffect(() => () => cancelAnimationFrame(gesture.current?.raf), [])

  // ตำแหน่งปัจจุบันของโน้ตใบที่ i (px ในพื้นที่หน้า)
  const posOf = (i) => {
    if (drag?.i === i) return drag
    if (i < placed.length) return { x: placed[i].fx * Math.max(0, area.w - noteW(i)), y: placed[i].y }
    return { x: (area.w - noteW(i)) / 2, y: area.top } // ใบที่รอ: อยู่กลางใต้หัวข้อ
  }

  // ---------- ลาก (เมาส์และนิ้ว) ----------
  // ใช้พิกัดของ "หน้า" (ตำแหน่งบนจอ + ระยะที่เลื่อนไปแล้ว) หน้าเลื่อนระหว่างลาก โน้ตจึงยังอยู่ใต้นิ้ว
  const apply = (g) => {
    const s = stage.current
    const dx = g.cx + window.scrollX - g.px
    const dy = g.cy + window.scrollY - g.py
    g.moved = Math.max(g.moved, Math.hypot(dx, dy))
    g.x = clamp(g.ox + dx, 0, s.clientWidth - g.w) // ไม่ให้ลากออกนอกหน้า
    g.y = clamp(g.oy + dy, 0, s.offsetHeight - g.h)
    setDrag({ i: g.i, x: g.x, y: g.y })
  }

  // ลากชิดขอบบน/ล่างของจอ = เลื่อนหน้าให้เอง (ใช้พื้นที่ทั้งหน้าได้บนมือถือ)
  const autoScroll = () => {
    const g = gesture.current
    if (!g) return
    const edge = 90
    const vy = g.cy > window.innerHeight - edge ? 14 : g.cy < edge ? -14 : 0
    if (vy) {
      window.scrollBy(0, vy)
      apply(g)
    }
    g.raf = requestAnimationFrame(autoScroll)
  }

  const onDown = (e, i) => {
    if (i > current || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.preventDefault()
    const el = e.currentTarget
    const o = posOf(i)
    gesture.current = {
      i, ox: o.x, oy: o.y, x: o.x, y: o.y,
      cx: e.clientX, cy: e.clientY,
      px: e.clientX + window.scrollX, py: e.clientY + window.scrollY,
      w: el.offsetWidth, h: el.offsetHeight, moved: 0, raf: 0,
    }
    el.setPointerCapture(e.pointerId)
    setDrag({ i, x: o.x, y: o.y })
    gesture.current.raf = requestAnimationFrame(autoScroll)
  }

  const onMove = (e) => {
    const g = gesture.current
    if (!g) return
    g.cx = e.clientX
    g.cy = e.clientY
    apply(g)
  }

  const finish = (commit) => {
    const g = gesture.current
    gesture.current = null
    setDrag(null)
    if (!g) return
    cancelAnimationFrame(g.raf)
    if (!commit) return
    const rec = { fx: g.x / Math.max(1, area.w - g.w), y: g.y }
    if (g.i < placed.length) setPlaced((p) => p.map((q, k) => (k === g.i ? rec : q))) // ย้ายโน้ตที่แปะแล้ว
    else if (g.moved >= MOVE_MIN) setPlaced((p) => [...p, rec]) // แปะใบปัจจุบัน → เปิดใบถัดไป
    // ลากไม่ถึงเกณฑ์: เด้งกลับที่เดิม
  }
  const onUp = () => finish(true)
  const onCancel = () => finish(false)

  // คีย์บอร์ด: Enter / Space ที่โน้ตที่รออยู่ = แปะลงตำแหน่งอัตโนมัติ
  const onKey = (e, i) => {
    if (i !== current || (e.key !== 'Enter' && e.key !== ' ')) return
    e.preventDefault()
    setPlaced((p) => [...p, { fx: AUTO_X[i], y: area.top + i * 40 }])
  }

  // หลังแปะแต่ละใบ ย้ายโฟกัสไปใบถัดไป (หรือปุ่ม START เมื่อครบ) เพื่อให้ใช้คีย์บอร์ดต่อได้

  return (
    <main className="page intro" ref={stage}>
      <header className="intro-hero">
        <Logo height={52} className="intro-logo" />

        <h1>
          <span className="h1-line">A place to feel a little </span>
          <span className="h1-line accent">and learn English a little.</span>
        </h1>
        <svg className="intro-squiggle" viewBox="0 0 150 16" aria-hidden="true">
          <path d="M3 8 Q15 0 27 8 T51 8 T75 8 T99 8 T123 8 T147 8" pathLength="1" />
        </svg>

        <p className="intro-tagline">ที่ที่ให้ได้รับรู้ความรู้สึกนิดหน่อย และเรียนอังกฤษอีกนิดหน่อย</p>
        <p className="intro-lead">เรียนอังกฤษ 1 วัน 1 ประโยค ผ่านประโยคจากหนังที่เข้ากับความรู้สึกของคุณ ไม่ต้องจำเยอะแต่ให้ภาษาอังกฤษอยู่กับคุณในทุกวัน</p>
      
      </header>

      {/* ที่เว้นไว้ให้โน้ตที่รอแปะ (หายไปเมื่อแปะครบ) */}
      <div className={'intro-tray' + (done ? ' done' : '')} ref={tray}>
        {!done && <p className="intro-hint">ลากโน้ตไปแปะตรงไหนก็ได้ ({current + 1}/{STEPS.length}){compact && ' · ลากชิดขอบจอเพื่อเลื่อนหน้า'}</p>}
      </div>

      <ol className="intro-notes" aria-label="วิธีใช้งาน">
        {STEPS.slice(0, current + 1).map((s, i) => {
          const p = posOf(i)
          const waiting = i === current && !done
          const dragging = drag?.i === i
          return (
            <li
              key={s.title}
              className={'intro-note ' + (waiting ? 'waiting' : 'placed') + (dragging ? ' dragging' : '')}
              style={{
                left: p.x,
                top: p.y,
                zIndex: dragging ? 40 : 10 + i,
                '--w': `${noteW(i)}px`,
                '--h': `${Math.round(LOOK[i].h * (compact ? 0.9 : 1))}px`,
                '--r': `${LOOK[i].r}deg`,
                '--b': `${Math.round(LOOK[i].b * (compact ? 0.85 : 1))}px`,                
                '--i': i,
              }}
              tabIndex={waiting ? 0 : undefined}
              aria-label={waiting ? `ขั้นที่ ${i + 1}: ${s.title}. ลากไปวางตรงไหนก็ได้ หรือกด Enter เพื่อแปะ` : undefined}
              onPointerDown={(e) => onDown(e, i)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onCancel}
              onKeyDown={(e) => onKey(e, i)}
            >
              <span className="intro-badge" aria-hidden="true">{i + 1}</span>
              <b>{s.title}</b>
              <p>{s.text}</p>
            </li>
          )
        })}
      </ol>

            {done && (
        <div className="intro-start">
          <button className="cta" onClick={onStart}>START</button>
        </div>
      )}
    </main>
  )
}