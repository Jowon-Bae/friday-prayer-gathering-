import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const isCloudflare = window.location.hostname.includes('trycloudflare.com');
const serverUrl = import.meta.env.PROD ? '' : (isCloudflare
    ? `https://outside-concepts-mouse-hypothesis.trycloudflare.com`
    : `http://${window.location.hostname}:3001`);
const socket = io(serverUrl, {
    extraHeaders: {
        "Bypass-Tunnel-Reminder": "true"
    }
});

const cueLabelMap = {
    'V1': 'Verse 1',
    'V2': 'Verse 2',
    'CH': 'Chorus',
    'BR': 'Bridge',
    'INST': 'Instrument',
    'END': 'Ending',
    'BR2': 'Bridge 한 번 더',
    'KA': 'A key',
    'KBb': 'Bb key',
    'KC': 'C key',
    'KD': 'D key',
    'KE': 'E key',
    'KF': 'F key',
    'KG': 'G key'
};

export default function Member() {
    const [state, setState] = useState({
        current_bpm: 70, // matches new default
        current_cue: 'WAIT',
        current_key: '',
        current_modifiers: [],
        current_color: '#121212'
    });
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        socket.on('state_update', (newState) => {
            setState(prev => ({ ...prev, ...newState }));
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('state_update');
        };
    }, []);

    const displayCue = state.current_cue && state.current_cue !== 'WAIT'
        ? (cueLabelMap[state.current_cue] || state.current_cue)
        : '';

    const displayKey = state.current_key
        ? (cueLabelMap[state.current_key] || state.current_key)
        : '';

    const modifierLabelMap = {
        'ONEMORE': '한 번 더',
        'KEYUP': 'Key up'
    };

    const hasModifiers = state.current_modifiers && state.current_modifiers.length > 0;

    return (
        <div
            className="member-container"
            style={{ backgroundColor: state.current_color }}
        >
            <div className={`connection-status ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
                {isConnected ? 'LIVE' : 'RECONNECTING...'}
            </div>

            {state.current_song && (
                <div className="member-song">
                    <span className="member-song-label">SONG NO.</span>
                    <span className="member-song-number">{state.current_song}</span>
                </div>
            )}

            <div className="member-cues-container">
                {displayKey && <div className="member-cue">{displayKey}</div>}
                {displayCue && <div className="member-cue">{displayCue}</div>}
                {hasModifiers && state.current_modifiers.map(mod => (
                    <div key={mod} className="member-cue text-outline-black">{modifierLabelMap[mod] || mod}</div>
                ))}
                {!displayCue && !displayKey && !hasModifiers && <div className="member-cue">WAIT</div>}
            </div>

            <div className="member-label">BPM</div>
            <div className="member-bpm">{state.current_bpm}</div>
        </div>
    );
}
