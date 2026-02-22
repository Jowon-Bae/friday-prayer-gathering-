import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

export default function SplashScreen({ onComplete }) {
    const [stage, setStage] = useState('spinning');

    useEffect(() => {
        // 1. Logo spins for exactly 3 seconds
        const flashTimer = setTimeout(() => {
            setStage('flashing');
        }, 3000);

        // 2. Flash effect slowly builds up and then we wait 1s before taking it away
        const flashEndTimer = setTimeout(() => {
            setStage('done-flashing');
        }, 4000);

        // 3. Wait 1s for the flash to smoothly dissolve back to normal, then fade screen
        const fadeTimer = setTimeout(() => {
            setStage('fading');
        }, 5000);

        // 4. Fading finishes after 0.5s, unmount
        const removeTimer = setTimeout(() => {
            onComplete();
        }, 5500);

        return () => {
            clearTimeout(flashTimer);
            clearTimeout(flashEndTimer);
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
                <h2 className="splash-title">Seouldream Church<br />금요기도집회 예배팀<br />Cue System</h2>
            </div>
        </div>
    );
}
