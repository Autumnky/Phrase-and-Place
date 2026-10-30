import { useState } from 'react'
import { demoAdvance, demoReset, isDemo, todayKey } from '../utils/storage'
import { clearDemoBoard } from '../utils/boardStore'

const OPEN_KEY = 'pap-demo-panel' // จำว่าแผงเปิดอยู่ไหม (อยู่ในแท็บนี้ รอดตอนโหลดหน้าใหม่)

// แผงควบคุมโหมดเดโม่ (เห็นเฉพาะเมื่อเปิดด้วย ?demo=1) พับเก็บได้
// ใช้โหลดหน้าใหม่ทุกครั้งที่เปลี่ยนวัน เพื่อให้สถานะของแอปรีเซ็ตเป็นของวันใหม่ทั้งหมด
export default function DemoPanel() {
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(OPEN_KEY) === '1'
    } catch {
      return false
    }
  })

  if (!isDemo()) return null

  const toggle = () => {
    const next = !open
    setOpen(next)
    try {
      sessionStorage.setItem(OPEN_KEY, next ? '1' : '0')
    } catch {
      /* ไม่เป็นไร */
    }
  }

  const nextDay = () => {
    demoAdvance()
    window.location.assign('/mood-check-in')
  }
  const reset = async () => {
    demoReset()
    await clearDemoBoard()
    window.location.assign('/')
  }
  const exit = () => window.location.assign('/?demo=0')

  // พับอยู่: เหลือปุ่มเล็ก ๆ ปุ่มเดียว
  if (!open) {
    return (
      <button className="demo-toggle" onClick={toggle} aria-expanded="false" aria-label="เปิดแผงเดโม่">
        Demo
      </button>
    )
  }

  return (
    <aside className="demo-panel" aria-label="Demo controls">
      <div className="demo-head">
        <span className="demo-day">Demo · วันนี้คือ {todayKey()}</span>
        <button className="demo-close" onClick={toggle} aria-expanded="true" aria-label="ซ่อนแผงเดโม่">
          ซ่อน
        </button>
      </div>
      <button className="demo-next" onClick={nextDay}>Next day →</button>
      <button onClick={reset}>Reset demo</button>
      <button onClick={exit}>Exit demo</button>
    </aside>
  )
}