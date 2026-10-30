import { useMemo, useState } from 'react'
import movies from '../data/movies.json'
import PhraseCard from './PhraseCard'
import { dayPrefix, isDemo, pickByDate, todayKey } from '../utils/storage'

// สีตามอารมณ์ (เหมือนใน src/data/moods.js)
const MOOD_COLOR = {
  tired: '#5e7b6c',
  lonely: '#8daae0',
  overwhelmed: '#cf6a5f',
  lost: '#b89073',
  hopeful: '#fa8f6f',
  happy: '#f0cb4e',
}
const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const WEEKDAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const byId = Object.fromEntries(movies.map((m) => [m.id, m]))

// อ่านบันทึกรายวันจาก localStorage: { 'YYYY-MM-DD': { mood, phraseId } }
// (โหมดเดโม่อ่านจากคีย์ของเดโม่ ไม่ปนข้อมูลจริง)
function readLog() {
  const prefix = dayPrefix()
  const log = {}
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(prefix)) continue
      const date = k.slice(prefix.length)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
      const day = JSON.parse(localStorage.getItem(k))
      if (day?.phraseId && byId[day.phraseId]) {
        log[date] = { mood: day.mood ?? byId[day.phraseId].mood, phraseId: day.phraseId }
      }
    }
  } catch {
    /* อ่านไม่ได้ ใช้บันทึกว่าง */
  }
  return log
}

// ข้อมูลตัวอย่างสำหรับพรีเซนต์: 10 วันก่อน "วันจริงของเครื่อง" ไม่เขียนลงเครื่อง
function demoLog() {
  const moods = ['lost', 'tired', 'hopeful', 'happy', 'overwhelmed', 'lonely', 'lost', 'tired', 'hopeful', 'lonely']
  const log = {}
  const now = new Date()
  moods.forEach((mood, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i + 1))
    const key = keyOf(d.getFullYear(), d.getMonth(), d.getDate())
    const chosen = pickByDate(movies.filter((m) => m.mood === mood), key)
    if (chosen) log[key] = { mood, phraseId: chosen.id }
  })
  return log
}

export default function MyDays({ onBack }) {
  const demo = isDemo()
  const log = useMemo(() => (demo ? { ...demoLog(), ...readLog() } : readLog()), [demo])

  const today = todayKey() // โหมดเดโม่ = วันที่จำลอง
  const [ty, tm] = today.split('-').map(Number)
  const latest = useMemo(() => Object.keys(log).sort().pop() ?? today, [log, today])

  const [sel, setSel] = useState(latest) // เริ่มที่วันล่าสุดที่มีบันทึก
  const [ym, setYm] = useState(() => {
    const [y, m] = latest.split('-').map(Number)
    return { y, m: m - 1 }
  })

  // จำกัดช่วงเดือนที่เลื่อนได้: ตั้งแต่เดือนที่มีบันทึกแรก ถึงเดือนปัจจุบัน
  const thisYm = { y: ty, m: tm - 1 }
  const firstKey = Object.keys(log).sort()[0]
  const minYm = firstKey ? { y: +firstKey.slice(0, 4), m: +firstKey.slice(5, 7) - 1 } : thisYm
  const idx = (v) => v.y * 12 + v.m
  const canPrev = idx(ym) > idx(minYm)
  const canNext = idx(ym) < idx(thisYm)

  const first = new Date(ym.y, ym.m, 1).getDay()
  const count = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((first + count) / 7) * 7 }, (_, i) => {
    const d = i - first + 1
    return d >= 1 && d <= count ? d : null
  })

  const shiftMonth = (delta) => {
    const d = new Date(ym.y, ym.m + delta, 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
  }

  const entry = log[sel]
  const phrase = entry ? byId[entry.phraseId] : null
  const [sy, sm, sd] = sel.split('-').map(Number)
  const dateLine = `วัน${WEEKDAYS_FULL[new Date(sy, sm - 1, sd).getDay()]}ที่ ${sd} ${MONTHS[sm - 1]} ${sy}${sel === today ? ' (วันนี้)' : ''}`
  const empty = Object.keys(log).length === 0

  return (
    <main className="page md">
      <header className="md-head">
        <div className="md-bar">
          <button className="btn ghost" onClick={onBack}>← Back</button>
        </div>
        <div>
          <h1>My <span className="accent">Days</span></h1>
          <p className="muted" style={{ marginTop: 14 }}>ย้อนดูประโยคและคำศัพท์ของแต่ละวัน</p>        </div>
      </header>


      <div className="md-main">
        <section className="md-cal" aria-label="Calendar">
          <div className="md-cal-head">
            <button type="button" className="md-nav" onClick={() => shiftMonth(-1)} disabled={!canPrev} aria-label="เดือนก่อนหน้า">←</button>
            <h2>{MONTHS[ym.m]} {ym.y}</h2>
            <button type="button" className="md-nav" onClick={() => shiftMonth(1)} disabled={!canNext} aria-label="เดือนถัดไป">→</button>
          </div>
          <div className="md-week">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="md-grid">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const key = keyOf(ym.y, ym.m, d)
              const e = log[key]
              if (!e) return <div key={i} className={'md-day' + (key === today ? ' today' : '')}>{d}</div>
              return (
                <button
                  key={i}
                  type="button"
                  className={'md-day has' + (key === sel ? ' on' : '')}
                  onClick={() => setSel(key)}
                  aria-pressed={key === sel}
                  aria-label={`${d} ${MONTHS[ym.m]} อารมณ์ ${e.mood}`}
                >
                  <span>{d}</span>
                  <i className="md-dot" style={{ background: MOOD_COLOR[e.mood] }} />
                </button>
              )
            })}
          </div>
          <p className="hint">กดวันที่มีจุดสีเพื่อดูประโยคและคำศัพท์ของวันนั้น</p>
        </section>

        <section className="md-detail" aria-label="Day detail">
          {empty && <p className="muted">ยังไม่มีบันทึก เลือกอารมณ์ของวันนี้ แล้วกลับมาดูที่นี่</p>}
          {!empty && !phrase && <p className="muted">วันนี้ยังไม่มีบันทึก กดวันที่มีจุดสีในปฏิทินเพื่อดูวันอื่น</p>}
          {phrase && (
            <>
              <p className="eyebrow md-date">{dateLine}</p>
              {/* ใช้การ์ดเดียวกับหน้า /card (key = วัน เพื่อรีเซ็ตเรื่องย่อและหยุดเสียงเมื่อเปลี่ยนวัน) */}
              <PhraseCard key={sel} phrase={phrase} />
            </>
          )}
        </section>
      </div>
    </main>
  )
}