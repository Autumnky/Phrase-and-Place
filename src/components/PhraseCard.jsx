import { useEffect, useState } from 'react'
import { MOODS } from '../data/moods'
import { speak, stopSpeak } from '../utils/storage'

const MOMENT_PREFIX = 'ในวันที่คุณ'

// ไอคอนเล่นเสียง: ปกติเป็น ▷ ตอนกำลังอ่านเปลี่ยนเป็นแท่งคลื่นเสียงที่ขยับ
function PlayIcon({ playing }) {
  return playing ? (
    <span className="eq" aria-hidden="true"><i /><i /><i /></span>
  ) : (
    <span className="play" aria-hidden="true">▷</span>
  )
}

export default function PhraseCard({ phrase }) {
  const mood = MOODS.find((m) => m.id === phrase.mood)
  const [open, setOpen] = useState(false) // เรื่องย่อ: แผ่นที่เลื่อนขึ้นมาบนรูป ไม่ดันขนาดการ์ด
  const [playing, setPlaying] = useState(null) // key ของปุ่มที่กำลังอ่านเสียงอยู่
  const momentEnd = phrase.themeTh
  useEffect(() => () => stopSpeak(), []) // ออกจากหน้านี้ให้หยุดเสียง

  const play = (key, text) => {
    if (playing === key) { // กดซ้ำ = หยุด
      stopSpeak()
      setPlaying(null)
      return
    }
    setPlaying(key)
    const ok = speak(text, { onEnd: () => setPlaying((cur) => (cur === key ? null : cur)) })
    if (!ok) setPlaying(null)
  }
  const cls = (base, key) => base + (playing === key ? ' playing' : '')

  return (
    <article className="card" style={{ '--mc': mood.color }}>

      <div className="photo" style={{ background: `linear-gradient(160deg, ${mood.color}, #2f4f46)` }}>
        <img src={phrase.image} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <span className="caption">{phrase.source} · {phrase.year}</span>

        <div className={'sheet' + (open ? ' open' : '')} id="synopsis" aria-hidden={!open}>
          <button className="sheet-x" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} aria-label="ปิดเรื่องย่อ">×</button>
          <p className="sheet-title">{phrase.source} <span>({phrase.year})</span></p>
          <p className="sheet-text">{phrase.synopsis}</p>
        </div>
      </div>

      <div className="body">
        {/* กลุ่ม 1: ประโยค (โพสต์อิทอยู่แถวเดียวกับปุ่ม Listen ชิดขวา) */}
        <section>
          <p className="eyebrow">For your <b>{mood.en.toLowerCase()}</b> day</p>
          <p className="moment">{momentEnd ? MOMENT_PREFIX + momentEnd : phrase.theme}</p>
          <h2 className="quote">“{phrase.sentence}”</h2>
          <p className="th">{phrase.translation}</p>
          <button className={cls('listen', 'sentence')} onClick={() => play('sentence', phrase.sentence)} aria-pressed={playing === 'sentence'}>
            <PlayIcon playing={playing === 'sentence'} /> Listen
          </button>
        </section>

        {/* กลุ่ม 2: ที่มา (กดเพื่อดูเรื่องย่อ) */}
        <button className="source" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="synopsis">
          <span className="src-label">From</span>
          <b>{phrase.source}</b>
          <span className="src-year">({phrase.year})</span>
          <span className="src-toggle">เรื่องย่อ</span>
        </button>

        {/* กลุ่ม 3: คำศัพท์ */}
        <section className="vocab">
          <h3 className="eyebrow">A word to keep</h3>
          <ul>
            {phrase.vocabulary.map((v, i) => (
              <li key={v.word} className="word-card">
                <div className="wordhead">
                  <button className={cls('wbtn', `word-${i}`)} onClick={() => play(`word-${i}`, v.word)} aria-pressed={playing === `word-${i}`} aria-label={`Listen to ${v.word}`}>
                    <PlayIcon playing={playing === `word-${i}`} /> {v.word}
                  </button>
                  {v.pos && <span className="pos">{v.pos}</span>}
                  <span className="th">{v.meaning}</span>
                </div>
                <div className="eg">
                  <button className={cls('ex', `ex-${i}`)} onClick={() => play(`ex-${i}`, v.example)} aria-pressed={playing === `ex-${i}`} aria-label="Listen to the example">
                    <PlayIcon playing={playing === `ex-${i}`} /> “{v.example}”
                  </button>
                  <p className="th">{v.exampleTh}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  )
}