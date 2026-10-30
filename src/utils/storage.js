const PREFIX = 'pap:'

// ---------- โหมดเดโม่ (ใช้พรีเซนต์): เปิดด้วย ?demo=1, ปิดด้วย ?demo=0 ----------
// เก็บสถานะใน sessionStorage (ปิดแท็บแล้วหายเอง) และเก็บบันทึกรายวันของเดโม่แยกคีย์ (papdemo:) ไม่ปนข้อมูลจริง
const DEMO_KEY = 'pap-demo'
const OFFSET_KEY = 'pap-demo-offset' // จำนวนวันที่ "ข้ามไป" ในเดโม่
const INTRO_KEY = 'pap-intro' // เคยดูหน้าแนะนำแล้ว

try {
  const q = new URLSearchParams(window.location.search).get('demo')
  if (q === '1') sessionStorage.setItem(DEMO_KEY, '1')
  if (q === '0') {
    sessionStorage.removeItem(DEMO_KEY)
    demoReset()
  }
} catch {
  /* เบราว์เซอร์ไม่ให้ใช้ storage ก็ข้ามไป */
}

export const isDemo = () => {
  try {
    return sessionStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}

const demoOffset = () => (isDemo() ? Number(sessionStorage.getItem(OFFSET_KEY)) || 0 : 0)

// คำนำหน้าคีย์ของบันทึกรายวัน (โหมดเดโม่ใช้คนละอันกับของจริง)
export const dayPrefix = () => (isDemo() ? 'papdemo:' : PREFIX)

// ข้ามไปวันถัดไป (ในเดโม่)
export function demoAdvance() {
  sessionStorage.setItem(OFFSET_KEY, String(demoOffset() + 1))
}

// ล้างข้อมูลเดโม่ทั้งหมด (ไม่แตะข้อมูลจริง)
export function demoReset() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('papdemo:'))
      .forEach((k) => localStorage.removeItem(k))
    sessionStorage.removeItem(OFFSET_KEY)
    sessionStorage.removeItem(INTRO_KEY)
  } catch {
    /* ไม่เป็นไร */
  }
}

// ---------- หน้าแนะนำ: แสดงครั้งแรกครั้งเดียว (โหมดเดโม่จำแค่ในแท็บนี้) ----------
export function hasSeenIntro() {
  try {
    return (isDemo() ? sessionStorage : localStorage).getItem(INTRO_KEY) === '1'
  } catch {
    return true
  }
}

export function markIntroSeen() {
  try {
    ;(isDemo() ? sessionStorage : localStorage).setItem(INTRO_KEY, '1')
  } catch {
    /* ไม่เป็นไร */
  }
}

// ---------- วันที่ / บันทึกรายวัน ----------
export const todayKey = () => {
  const d = new Date()
  if (isDemo()) d.setDate(d.getDate() + demoOffset()) // เดโม่: วันที่จำลอง
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function loadDay(date = todayKey()) {
  try {
    return JSON.parse(localStorage.getItem(dayPrefix() + date)) || {}
  } catch {
    return {}
  }
}

export function saveDay(patch, date = todayKey()) {
  try {
    localStorage.setItem(dayPrefix() + date, JSON.stringify({ ...loadDay(date), ...patch }))
    return true
  } catch (e) {
    console.warn('Could not save today', e)
    return false
  }
}

export function clearDay(date = todayKey()) {
  localStorage.removeItem(dayPrefix() + date)
}

export function pickRandom(list) {
  if (!list || list.length === 0) return null
  const randomIndex = Math.floor(Math.random() * list.length)
  return list[randomIndex]
}

// เลือก Phrase จากวันที่ (วันเดียวกันได้ตัวเดิมเสมอ)
export function pickByDate(list, date = todayKey()) {
  let h = 0
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return list[h % list.length]
}

// อ่านออกเสียง: onEnd จะถูกเรียกเมื่ออ่านจบหรือถูกหยุด (คืนค่า false ถ้าเบราว์เซอร์ไม่รองรับ)
export function speak(text, { onEnd } = {}) {
  if (!('speechSynthesis' in window)) return false
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  u.onend = onEnd
  u.onerror = onEnd
  speechSynthesis.speak(u)
  return true
}

export function stopSpeak() {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}