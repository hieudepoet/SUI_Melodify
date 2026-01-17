import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/common/Header";
import HomePage from "./pages/HomePage";
import UploadPage from "./pages/UploadPage";
import DiscoverPage from "./pages/DiscoverPage";
import MyMusicPage from "./pages/MyMusicPage";
import ProfilePage from "./pages/ProfilePage";
import ListenPage from "./pages/ListenPage";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/my-music" element={<MyMusicPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/listen/:musicId" element={<ListenPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
