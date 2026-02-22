import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Master from './pages/Master';
import Member from './pages/Member';
import InEar from './pages/InEar';
import SplashScreen from './components/SplashScreen';
import './index.css';

function App() {
    const [showSplash, setShowSplash] = useState(true);

    return (
        <>
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/master" element={<Master />} />
                    <Route path="/member" element={<Member />} />
                    <Route path="/inear" element={<InEar />} />
                </Routes>
            </BrowserRouter>
        </>
    );
}

function Home() {
    return (
        <div className="home-container">
            <img src="/logo_inverted.png" alt="App Icon" className="home-logo" />
            <h1>Seouldream Church<br />금요기도집회 예배팀<br />Cue System</h1>
            <div className="home-links">
                <Link to="/master" className="home-btn master-btn">Master Mode (인도자)</Link>
                <Link to="/member" className="home-btn member-btn">Member Mode (팀원)</Link>
            </div>
        </div>
    );
}

export default App;
