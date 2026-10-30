import { readFile, writeFile } from 'node:fs/promises'

// ชนิดของคำ/วลี (รหัสย่อ → ชื่อเต็มที่จะเก็บใน JSON)
const L = {
  n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition', pron: 'pronoun', conj: 'conjunction',
  pv: 'phrasal verb', prv: 'prepositional verb', idm: 'idiom', col: 'collocation', exp: 'expression',
  np: 'noun phrase', vp: 'verb phrase', ap: 'adjective phrase', advp: 'adverb phrase', pp: 'prepositional phrase', dp: 'determiner phrase',
  ger: 'gerund', gp: 'gerund phrase', pt: 'past tense', pap: 'past participle', prp: 'present participle',
}

// ลำดับในอาร์เรย์ = ลำดับคำศัพท์ในแต่ละเรื่อง (คำที่ 1, คำที่ 2)
const POS = {
  m001: ['v', 'adv'], m002: ['pv', 'pap'], m003: ['n', 'n'], m004: ['n', 'prep'],
  m005: ['n', 'adv'], m006: ['advp', 'v'], m007: ['v', 'adj'], m008: ['adj', 'n'],
  m009: ['np', 'adv'], m010: ['vp', 'np'], m011: ['n', 'v'], m012: ['adv', 'vp'],
  m013: ['np', 'pron'], m014: ['n', 'adj'], m015: ['np', 'vp'], m016: ['np', 'n'],
  m017: ['v', 'n'], m018: ['vp', 'n'], m019: ['ger', 'pp'], m020: ['pt', 'adj'],
  m021: ['exp', 'n'], m022: ['v', 'pv'], m023: ['v', 'adj'], m024: ['gp', 'idm'],
  m025: ['n', 'v'], m026: ['n', 'adv'], m027: ['v', 'adj'], m028: ['v', 'np'],
  m029: ['ap', 'vp'], m030: ['n', 'adj'], m031: ['pv', 'pv'], m032: ['n', 'n'],
  m033: ['v', 'adj'], m034: ['v', 'n'], m035: ['col', 'vp'], m036: ['np', 'v'],
  m037: ['np', 'n'], m038: ['v', 'v'], m039: ['np', 'n'], m040: ['adj', 'prv'],
  m041: ['conj', 'n'], m042: ['v', 'adj'], m043: ['vp', 'n'], m044: ['col', 'prv'],
  m045: ['adj', 'adv'], m046: ['n', 'n'], m047: ['idm', 'idm'], m048: ['n', 'vp'],
  m049: ['np', 'advp'], m050: ['adv', 'adj'], m051: ['n', 'gp'], m052: ['adj', 'n'],
  m053: ['v', 'n'], m054: ['v', 'n'], m055: ['n', 'v'], m056: ['adv', 'adj'],
  m057: ['pv', 'pp'], m058: ['ap', 'pv'], m059: ['adj', 'adv'], m060: ['dp', 'n'],
  m061: ['dp', 'dp'], m062: ['adj', 'prp'], m063: ['adv', 'n'], m064: ['n', 'n'],
  m065: ['pv', 'n'], m066: ['n', 'pv'], m067: ['np', 'v'], m068: ['v', 'v'],
  m069: ['v', 'pron'], m070: ['adj', 'vp'], m071: ['prp', 'prp'], m072: ['adj', 'vp'],
  m073: ['adj', 'adv'], m074: ['adv', 'adj'], m075: ['v', 'adv'], m076: ['pron', 'v'],
  m077: ['adv', 'n'], m078: ['adv', 'adj'], m079: ['n', 'pap'], m080: ['v', 'n'],
  m081: ['vp', 'pron'], m082: ['pp', 'adj'], m083: ['ap', 'ger'], m084: ['adj', 'pap'],
  m085: ['np', 'n'], m086: ['adj', 'ap'], m087: ['col', 'v'], m088: ['adv', 'adj'],
  m089: ['adj', 'adj'], m090: ['vp', 'np'], m091: ['pv', 'n'], m092: ['exp', 'idm'],
  m093: ['ger', 'adj'], m094: ['adj', 'v'], m095: ['adj', 'pv'], m096: ['col', 'pp'],
}

const FILE = new URL('../src/data/movies.json', import.meta.url)
const movies = JSON.parse(await readFile(FILE, 'utf8'))
const problems = []
let added = 0

for (const m of movies) {
  const codes = POS[m.id]
  if (!codes) { problems.push(`${m.id} ${m.source}: ไม่มีข้อมูลใน POS (ข้าม)`); continue }
  if (codes.length !== m.vocabulary.length) { problems.push(`${m.id} ${m.source}: จำนวนคำศัพท์ไม่ตรง (ข้าม)`); continue }
  m.vocabulary.forEach((v, i) => {
    if (!L[codes[i]]) { problems.push(`${m.id} ${v.word}: รหัส "${codes[i]}" ไม่ถูกต้อง`); return }
    v.pos = L[codes[i]]
    added++
  })
}

await writeFile(FILE, JSON.stringify(movies, null, 2))
console.log(`เติม pos แล้ว ${added} คำ`)
if (problems.length) console.log('\nข้อควรดู:\n' + problems.join('\n'))