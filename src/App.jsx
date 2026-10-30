import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import movies from './data/movies.json'
import MoodCheckIn from './components/MoodCheckIn'
import Finding from './components/Finding'
import PhraseCard from './components/PhraseCard'
import VisionBoard from './components/VisionBoard'
import MyDays from './components/MyDays'
import Intro from './components/Intro'
import DemoPanel from './components/DemoPanel'
import Backdrop from './components/Backdrop'
import Navbar from './components/Navbar'

import { loadDay, saveDay, pickRandom } from './utils/storage'

function getTodayPhrase() {
  const day = loadDay()
  return day.phraseId ? movies.find((m) => m.id === day.phraseId) : null
}

function AppRoutes() {
  const navigate = useNavigate()
  const [phrase, setPhrase] = useState(getTodayPhrase)

  const handleMood = (mood) => {
    const chosen = pickRandom(movies.filter((m) => m.mood === mood))
    saveDay({ mood, phraseId: chosen.id })
    setPhrase(chosen)
    navigate('/finding')
  }

  const showCard = useCallback(() => navigate('/card'), [navigate])

  return (
    <Routes>
      {/* หน้าแรกเป็น Intro เสมอ ทุกครั้งที่เปิดเว็บ */}
      <Route
        path="/"
        element={
          <Intro
            onStart={() => navigate(phrase ? '/card' : '/mood-check-in')}
          />
        }
      />

      {/* ลิงก์เก่า /about ส่งกลับไปหน้าแรก */}
      <Route path="/about" element={<Navigate to="/" replace />} />

      <Route path="/mood-check-in" element={<MoodCheckIn onSelect={handleMood} />} />

      <Route
        path="/finding"
        element={phrase ? <Finding mood={phrase.mood} onDone={showCard} /> : <Navigate to="/mood-check-in" />}
      />

      <Route
        path="/visionboard"
        element={<VisionBoard phrase={phrase} onBack={() => navigate(phrase ? '/card' : '/my-days')} />}
      />

      <Route
        path="/my-days"
        element={
          <MyDays
            onBack={() => navigate(phrase ? '/card' : '/')}         />
        }
      />

      <Route
        path="/card"
        element={
          phrase ? (
            <main className="page">
              <PhraseCard phrase={phrase} />
              <p className="tmdb-credit">
                Movie images and details from{' '}
                <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">TMDB</a>.
                {' '}This product uses the TMDB API but is not endorsed or certified by TMDB.
              </p>
              <div className="actions">
                <button className="cta" onClick={() => navigate('/visionboard')}>Make my vision board</button>
                <button className="cta ghost" onClick={() => navigate('/my-days')}>Look back at My Days</button>
              </div>
            </main>
          ) : <Navigate to="/mood-check-in" />
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Backdrop />
      <Navbar />  
      <AppRoutes />
      <DemoPanel />
    </BrowserRouter>
  )
}