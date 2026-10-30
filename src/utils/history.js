import movies from '../data/movies.json'
import { dayPrefix, isDemo, pickByDate, todayKey } from './storage'

const byId = Object.fromEntries(movies.map((m) => [m.id, m]))
const pad = (n) => String(n).padStart(2, '0')
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// ประโยคที่เคยได้ในวันก่อน ๆ: ใหม่ → เก่า ไม่รวมวันนี้ [{ date: 'YYYY-MM-DD', phrase }]
// โหมดเดโม่: มีข้อมูลตัวอย่าง 10 วันก่อนวันจริงของเครื่อง (ชุดเดียวกับหน้า Revisit past phrases)
export function pastPhrases() {
  const today = todayKey()
  const log = {}

  if (isDemo()) {
    const moods = ['lost', 'tired', 'hopeful', 'happy', 'overwhelmed', 'lonely', 'lost', 'tired', 'hopeful', 'lonely']
    const now = new Date()
    moods.forEach((mood, i) => {
      const key = keyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i + 1)))
      const chosen = pickByDate(movies.filter((m) => m.mood === mood), key)
      if (chosen) log[key] = chosen
    })
  }

  // บันทึกจริง (โหมดเดโม่อ่านจากคีย์ของเดโม่ ไม่ปนข้อมูลจริง)
  const prefix = dayPrefix()
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(prefix)) continue
      const date = k.slice(prefix.length)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
      const day = JSON.parse(localStorage.getItem(k))
      const p = day?.phraseId && byId[day.phraseId]
      if (p) log[date] = p
    }
  } catch {
    /* อ่านไม่ได้ ใช้รายการว่าง */
  }

  return Object.keys(log)
    .filter((d) => d < today)
    .sort()
    .reverse()
    .map((date) => ({ date, phrase: log[date] }))
}