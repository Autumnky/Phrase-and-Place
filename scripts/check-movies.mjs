import { readFile } from 'node:fs/promises'

const MOODS = ['tired', 'lonely', 'overwhelmed', 'lost', 'hopeful', 'happy']
const POS_OK = new Set([
  'noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction',
  'phrasal verb', 'prepositional verb', 'idiom', 'collocation', 'expression',
  'noun phrase', 'verb phrase', 'adjective phrase', 'adverb phrase', 'prepositional phrase', 'determiner phrase',
  'gerund', 'gerund phrase', 'past tense', 'past participle', 'present participle',
])
const list = JSON.parse(await readFile(new URL('../src/data/movies.json', import.meta.url), 'utf8'))
const ids = new Set()
const problems = []
const count = {}

for (const m of list) {
  const tag = `${m.id} ${m.source}`
  if (ids.has(m.id)) problems.push(`${tag}: id ซ้ำ`)
  ids.add(m.id)
  count[m.mood] = (count[m.mood] || 0) + 1
  if (!MOODS.includes(m.mood)) problems.push(`${tag}: mood ไม่ถูกต้อง (${m.mood})`)
  if (!m.sentence || !m.translation || !m.source || !m.year) problems.push(`${tag}: ข้อมูลหลักไม่ครบ`)
  if (!m.synopsis || m.synopsis.length > 220) problems.push(`${tag}: เรื่องย่อว่างหรือยาวเกิน`)
  if ((m.vocabulary || []).length < 2) problems.push(`${tag}: คำศัพท์น้อยกว่า 2 คำ`)
  for (const v of m.vocabulary || []) {
    if (!v.word || !v.meaning || !v.example || !v.exampleTh) problems.push(`${tag}: คำศัพท์ "${v.word}" ข้อมูลไม่ครบ`)
    if (!POS_OK.has(v.pos)) problems.push(`${tag}: คำศัพท์ "${v.word}" pos ไม่ถูกต้องหรือไม่มี (${v.pos})`)
  }
}

console.log('จำนวนต่ออารมณ์:', count, '| รวม', list.length)
console.log(problems.length ? problems.join('\n') : 'ไม่พบปัญหา')