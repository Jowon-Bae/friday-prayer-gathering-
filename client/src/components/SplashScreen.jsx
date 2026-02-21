import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

export default function SplashScreen({ onComplete }) {
    const [stage, setStage] = useState('spinning'); // spinning -> flashing -> fading

    useEffect(() => {
        // 1. Logo spins for exactly 3 seconds (was 2s)
        const flashTimer = setTimeout(() => {
            setStage('flashing');
        }, 3000);

        // 2. Flash effect lasts for 1.0s, then start fading
        const fadeTimer = setTimeout(() => {
            setStage('fading');
        }, 4000);

        // 3. Fading finishes after 0.5s, unmount
        const removeTimer = setTimeout(() => {
            onComplete();
        }, 4500);

        return () => {
            clearTimeout(flashTimer);
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, [onComplete]);

    return (
        <div className={`splash-container ${stage === 'fading' ? 'splash-fade' : ''}`}>
            <div className="splash-logo-wrapper">
                <img
                    src="/logo.png"
                    alt="App Logo"
                    className={`splash-logo ${stage === 'flashing' ? 'splash-flash' : ''}`}
                />
                <h2 className="splash-title">Seouldream Church<br />Friday Prayer Gathering</h2>
            </div>
        </div>
    );
}
