// เก็บ Vision Board ใบเดียวแบบถาวรใน IndexedDB (จุได้มากกว่า localStorage ที่มีราว 5 MB)
import { isDemo } from './storage'

const DB_NAME = 'phrase-and-place'
const STORE = 'kv'
const DEFAULT_BG = '#b98f66'

// โหมดเดโม่ใช้ที่เก็บแยก ไม่ปนกับบอร์ดจริง
const boardKey = () => (isDemo() ? 'board-demo' : 'board')

// บอร์ดเดียว มี 2 หน้าจอ (เลย์เอาต์แยกกัน): desktop และ phone
export const emptyBoard = () => ({
  v: 1,
  format: 'desktop',
  layouts: {
    desktop: { items: [], bg: DEFAULT_BG },
    phone: { items: [], bg: DEFAULT_BG },
  },
})

let dbPromise
function open() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

const run = (db, mode, fn) =>
  new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

// ย้ายบอร์ดเก่าที่เคยเก็บรายวันใน localStorage (pap:YYYY-MM-DD) มาเป็นใบหลัก (ใช้ใบล่าสุดที่มีของอยู่)
function migrateOld() {
  const board = emptyBoard()
  try {
    const keys = Object.keys(localStorage)
      .filter((k) => /^pap:\d{4}-\d{2}-\d{2}$/.test(k))
      .sort()
      .reverse()
    for (const k of keys) {
      const old = JSON.parse(localStorage.getItem(k))?.board
      if (old?.items?.length) {
        board.layouts.desktop = { items: old.items, bg: old.bg ?? DEFAULT_BG }
        break
      }
    }
  } catch {
    /* ไม่มีของเก่า หรืออ่านไม่ได้ ใช้บอร์ดเปล่า */
  }
  return board
}

export async function loadBoard() {
  try {
    const db = await open()
    const saved = await run(db, 'readonly', (s) => s.get(boardKey()))
    if (saved?.layouts) {
      const base = emptyBoard()
      return { ...base, ...saved, layouts: { ...base.layouts, ...saved.layouts } }
    }
  } catch {
    /* ตกไปใช้ของเก่า */
  }
  return isDemo() ? emptyBoard() : migrateOld() // เดโม่เริ่มจากบอร์ดเปล่าเสมอ
}

export async function saveBoard(board) {
  try {
    navigator.storage?.persist?.() // ขอให้เบราว์เซอร์ไม่ลบข้อมูลเองเมื่อพื้นที่ตึง
    const db = await open()
    await run(db, 'readwrite', (s) => s.put(board, boardKey()))
    return true
  } catch {
    return false
  }
}

// ล้างบอร์ดของโหมดเดโม่ (ไม่แตะบอร์ดจริง)
export async function clearDemoBoard() {
  try {
    const db = await open()
    await run(db, 'readwrite', (s) => s.delete('board-demo'))
  } catch {
    /* ไม่เป็นไร */
  }
}