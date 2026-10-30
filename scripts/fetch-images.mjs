import { readFile, writeFile, mkdir, access } from 'node:fs/promises'

const KEY = process.env.TMDB_KEY
if (!KEY) {
  console.error('ตั้งค่า TMDB_KEY ก่อนรัน')
  process.exit(1)
}

const MOVIES = new URL('../src/data/movies.json', import.meta.url)
const OUT = new URL('../public/images/', import.meta.url)
const API = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p/w1280'
const FORCE = process.env.FORCE === '1' // FORCE=1 = ดาวน์โหลดใหม่ทับของเดิม

const exists = (u) => access(u).then(() => true, () => false)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(path, params = {}) {
  const url = new URL(API + path)
  url.search = new URLSearchParams({ api_key: KEY, ...params })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json()
}

await mkdir(OUT, { recursive: true })
const movies = JSON.parse(await readFile(MOVIES, 'utf8'))
const failed = []

for (const m of movies) {
  const file = new URL(`${m.id}.jpg`, OUT)
  if (!FORCE && (await exists(file))) {
    console.log('ข้าม (มีแล้ว)', m.id, m.source)
    continue
  }
  try {
    const { results } = await api('/search/movie', { query: m.source, year: m.year })
    const hit = results[0]
    if (!hit) throw new Error('ไม่พบหนังนี้ใน TMDB')

    // ภาพฉากที่ไม่มีตัวหนังสือ เลือกอันที่คะแนนสูงสุด ถ้าไม่มีใช้ backdrop/โปสเตอร์หลัก
    const imgs = await api(`/movie/${hit.id}/images`, { include_image_language: 'null' })
    const still = [...(imgs.backdrops || [])].sort((a, b) => b.vote_average - a.vote_average)[0]
    const path = still?.file_path || hit.backdrop_path || hit.poster_path
    if (!path) throw new Error('ไม่มีรูปให้ใช้')

    const res = await fetch(IMG + path)
    if (!res.ok) throw new Error(`ดาวน์โหลดไม่ได้ ${res.status}`)
    await writeFile(file, Buffer.from(await res.arrayBuffer()))
    console.log('OK  ', m.id, m.source, `(${m.year})`, '→', hit.title, hit.release_date) // เทียบว่าจับคู่ถูกเรื่อง
  } catch (e) {
    console.log('FAIL', m.id, m.source, '-', e.message)
    failed.push(`${m.id} ${m.source}`)
  }
  await sleep(250)
}

console.log(failed.length ? `\nไม่สำเร็จ ${failed.length} เรื่อง:\n${failed.join('\n')}` : '\nเสร็จครบทุกเรื่อง')