import { useEffect } from 'react'
import { MOODS } from '../data/moods'

export default function Finding({ mood, onDone, ms = 2000 }) {
  const color = MOODS.find((m) => m.id === mood)?.color

  useEffect(() => {
    const t = setTimeout(onDone, ms)
    return () => clearTimeout(t)
  }, [onDone, ms])

  return (
    <main className="page finding" role="status" aria-live="polite">
      <div className="pulse" style={{ background: color }} />
      <p>กำลังค้นหาหนังที่ตรงกับความรู้สึกของคุณในวันนี้</p>
    </main>
  )
}