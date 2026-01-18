import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import GlobalPlayer from './components/layout/GlobalPlayer'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import PlayPage from './pages/PlayPage'
import StakePage from './pages/StakePage'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-brutalist-bg">
        <Header />
        
        <main className="flex-1 pb-32">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/play/:musicId" element={<PlayPage />} />
            <Route path="/stake" element={<StakePage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>

        <GlobalPlayer />
      </div>
    </BrowserRouter>
  )
}

export default App
