import { useState } from 'react'
import { MOODS } from '../data/moods'

// เวลาที่รอก่อนเปลี่ยนหน้า (มิลลิวินาที) ให้แอนิเมชันของแต่ละอารมณ์เล่นจบ
const STAY = { tired: 2000, lonely: 2000, overwhelmed: 1200, lost: 1900, hopeful: 2000, happy: 1300 }

const TAU = Math.PI * 2
const mix = (k, m = 7) => ((k * 37 + 11) % m) / (m - 1) // เลขสุ่มที่คงที่ (0-1) ให้ผลเหมือนเดิมทุกครั้ง
const sign = (k) => (k % 2 ? 1 : -1)
// ท่าเดียวกับตอน hover: สลับขวา-ซ้ายของหัว ลอยขึ้น ~30px ทีละชิ้น
const rise = (n) =>
  Array.from({ length: n }, (_, k) =>
    k % 2 === 0
      ? { sx: 40, sy: -34, x: 8, y: -30, d: k * 0.25 }
      : { sx: -54, sy: -30, x: -8, y: -30, d: k * 0.25 },
  )
// รูปแบบของที่พุ่งออกมาของแต่ละอารมณ์
// glyph = ตัวอักษรของชิ้นนั้น (ว่าง = เป็นรูปทรงที่กำหนดใน CSS)
// make() = ตำแหน่งเริ่ม (sx,sy) ปลายทาง (x,y) ดีเลย์ (d) การหมุน (r) และขนาด (s) ของแต่ละชิ้น
const BURSTS = {
  tired: {
    glyph: 'z',
    make: () => 
      [
      0, 1, 2, 3
      ].map((k) => ({ sx: 24, sy: -30, x: 6 + k * 5, y: -52 - k * 10, d: k * 0.2, r: 10, s: 0.8 + k * 0.25 })),
  },
  lonely: {
    glyph: '◌︎',
    // ◌ กระจายอยู่ข้างนอกวงหน้า (ตำแหน่งเดียวกับตอน hover) ชิ้นลำดับคู่คือฝั่งซ้าย (ตัวเล็กกว่า)
    make: () =>
      [
        { sx: 58, sy: -22 }, { sx: -58, sy: -14 },
        { sx: 66, sy: 14 },  { sx: -66, sy: 22 },
        { sx: 40, sy: -52 }, { sx: -44, sy: -50 },
      ].map((p, k) => ({ ...p, x: k % 2 === 0 ? 8 : -8, y: -30, d: k * 0.15 })),
  },
  overwhelmed: {
    glyph: '',
    make: () => Array.from({ length: 12 }, (_, k) => {
      const a = (k * 137.5 * Math.PI) / 180 // กระจายแบบมุมทองคำ ดูสุ่มแต่ไม่ซ้อนกัน
      const r = 52 + mix(k) * 40
      return { x: Math.cos(a) * r, y: Math.sin(a) * r, d: mix(k + 3) * 0.12, r: sign(k) * (120 + k * 20), s: 0.7 + mix(k + 1) * 0.8 }
    }),
  },
  lost: {
    glyph: '?',
    make: () => Array.from({ length: 6 }, (_, k) => {
      const a = (k / 6) * TAU + 0.4
      const r = 58 + (k % 2) * 16
      return { x: Math.cos(a) * r, y: Math.sin(a) * r - 6, d: k * 0.08, r: sign(k) * (25 + k * 6), s: 0.8 + mix(k) * 0.5 }
    }),
  },
  hopeful: {
    glyph: '✿',
    make: () => Array.from({ length: 6 }, (_, k) => ({ sx: -24 + k * 10, sy: -30, x: sign(k) * (6 + k * 2), y: -70 - (k % 3) * 16, d: k * 0.1, r: sign(k) * 35, s: 0.8 + (k % 3) * 0.2 })),
  },
  happy: {
    glyph: '',
    make: () => Array.from({ length: 14 }, (_, k) => {
      const a = (k / 14) * TAU
      const r = 60 + (k % 3) * 16
      return { x: Math.cos(a) * r, y: Math.sin(a) * r - 10, d: (k % 4) * 0.04, r: 200 + k * 30, s: 1 }
    }),
  },
}

export default function MoodCheckIn({ onSelect }) {
  const [picked, setPicked] = useState(null)

  const choose = (id) => {
    if (picked) return // กันกดซ้ำระหว่างแอนิเมชันเล่น
    setPicked(id)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setTimeout(() => onSelect(id), reduce ? 450 : STAY[id])
  }

  return (
    <main className="page">
      <h1>
        How are you feeling <span className="accent">right now?</span>
      </h1>
      <p className="muted">คุณรู้สึกอย่างไรในตอนนี้</p>
      <div className="moods">
        {MOODS.map((m) => (
          <button
            key={m.id}
            data-mood={m.id}
            className={'mood' + (picked === m.id ? ' on' : '')}
            style={{ '--c': m.color }}
            onClick={() => choose(m.id)}
            aria-pressed={picked === m.id}
          >
            {picked === m.id && (
              <span className="burst" aria-hidden="true">
                {BURSTS[m.id].make().map((p, k) => (
                  <i
                    key={k}
                    style={{
                      '--vx': `${p.x}px`,
                      '--vy': `${p.y}px`,
                      '--sx': `${p.sx ?? 0}px`,
                      '--sy': `${p.sy ?? 0}px`,
                      '--dl': `${p.d ?? 0}s`,
                      '--r': `${p.r ?? 0}deg`,
                      '--sz': p.s ?? 1,
                    }}
                  >
                    {BURSTS[m.id].glyph}
                  </i>
                ))}
              </span>
            )}
            <span className="dot" style={{ background: m.color }}>
              <span className="mark">{m.mark}</span>
            </span>
            <b>{m.en}</b>
            <small>{m.th}</small>
          </button>
        ))}
      </div>
    </main>
  )
}