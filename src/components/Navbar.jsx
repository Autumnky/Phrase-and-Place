import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { loadDay } from '../utils/storage'
import * as history from '../utils/history'

const ITEMS = [
  { to: '/', label: 'Intro', icon: '✿' },
  { to: '/my-days', label: 'My Days', icon: '✦', need: 'any' },
  { to: '/visionboard', label: 'Vision Board', icon: '꒰ ꒱', need: 'today' }, // ถ้าแก้เป็น 'any' ไปแล้ว ให้คงตามที่แก้
]

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [warn, setWarn] = useState(false)

  // คำนวณใหม่ทุกครั้งที่เปลี่ยนหน้า (เช่น เพิ่งเลือก mood เสร็จ)
    const hasToday = !!loadDay().phraseId
    let past = 0
    try {
    const r = history.pastPhrases?.()
    past = Array.isArray(r) ? r.length : r && typeof r === 'object' ? Object.keys(r).length : 0
    } catch { /* ใช้ค่าเริ่มต้น */ }
    const hasAny = hasToday || past > 0

  useEffect(() => {
    if (!warn) return
    const onKey = (e) => e.key === 'Escape' && setWarn(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [warn])

  const go = (item) => {
    const ok = !item.need || (item.need === 'any' ? hasAny : hasToday)
    if (!ok) return setWarn(true)
    navigate(item.to)
  }

  return (
    <>
      <nav className="navbar" aria-label="Main">
        <button className="nav-logo" onClick={() => navigate('/')} aria-label="Phrase and Place">
          <Logo height={26} />
        </button>
        <div className="nav-links">
          {ITEMS.map((it) => {
            const ok = !it.need || (it.need === 'any' ? hasAny : hasToday)
            return (
              <button
                key={it.to}
                className={'nav-link' + (pathname === it.to ? ' on' : '') + (ok ? '' : ' locked')}
                aria-current={pathname === it.to ? 'page' : undefined}
                aria-disabled={!ok}
                onClick={() => go(it)}
              >
                <span className="nav-ico" aria-hidden="true">{it.icon}</span>
                <span>{it.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {warn && (
        <div className="nav-modal" role="presentation" onClick={() => setWarn(false)}>
          <div className="nav-modal-box" role="dialog" aria-modal="true" aria-labelledby="nm-t" onClick={(e) => e.stopPropagation()}>
            <button className="nav-modal-x" onClick={() => setWarn(false)} aria-label="Close">×</button>
            <h2 id="nm-t">คุณยังไม่สามารถใช้หน้านี้ได้</h2>
            <p>โปรดเลือกความรู้สึกของวันนี้ก่อน แล้วคุณจะสามารถใช้หน้านี้ได้</p>
            <button
              className="cta"
              onClick={() => { setWarn(false); navigate(hasToday ? '/card' : '/mood-check-in') }}
            >
              เริ่มเลย
            </button>
          </div>
        </div>
      )}
    </>
  )
}