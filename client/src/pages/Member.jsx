import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { songMap } from '../utils/songMap';

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

const inearTargetMap = {
    'WL': '예배인도자',
    'CLICK': '클릭',
    'SINGER': '싱어',
    'PRAY': '기도인도자',
    'PREACH': '설교자',
    'KEYMAIN': '메인 건반',
    'KEY21': '세컨1 건반',
    'KEY22': '세컨2 건반',
    'DRUM': '드럼',
    'BASS': '베이스',
    'ELEC': '일렉'
};

export default function Member() {
    const [state, setState] = useState({
        current_bpm: 70, // matches new default
        current_cue: 'WAIT',
        current_key: '',
        current_modifiers: [],
        current_color: '#121212',
        current_inear_targets: [],
        current_inear_vol: 0
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
    const hasInEarTargets = state.current_inear_targets && state.current_inear_targets.length > 0;
    const hasInEarAdj = state.current_inear_vol !== 0;
    const isWaiting = !displayCue && !displayKey && !hasModifiers;

    return (
        <div
            className="member-container"
            style={{ backgroundColor: state.current_color, paddingBottom: '2rem' }}
        >
            <div className={`connection-status ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
                {isConnected ? 'LIVE' : 'RECONNECTING...'}
            </div>

            {state.current_song && (
                <div className="member-song">
                    <span className="member-song-label">SONG NO.</span>
                    <span className="member-song-number">{state.current_song}</span>
                    {songMap[state.current_song] && (
                        <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', marginTop: '10px' }}>
                            {songMap[state.current_song]}
                        </span>
                    )}
                </div>
            )}

            <div className="member-cues-container">
                {displayKey && <div className="member-cue">{displayKey}</div>}
                {displayCue && <div className="member-cue">{displayCue}</div>}
                {hasModifiers && state.current_modifiers.map(mod => (
                    <div key={mod} className="member-cue text-outline-black">{modifierLabelMap[mod] || mod}</div>
                ))}
                {isWaiting && <div className="member-cue">WAIT</div>}
            </div>

            {(hasInEarTargets || hasInEarAdj) && (
                <div className="member-cues-container" style={{ marginTop: '1.5rem', backgroundColor: 'rgba(50,50,50,0.5)', borderColor: '#555', minHeight: 'auto', paddingTop: '1.5rem', paddingBottom: '1.5rem', width: '90%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ color: '#aaa', fontSize: '1.5rem', marginBottom: '1rem', letterSpacing: '2px', fontWeight: 'bold' }}>IN-EAR CONTROL</div>

                    {hasInEarTargets && (
                        <>
                            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', marginBottom: '10px', color: 'white' }}>제 인이어에</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '5px' }}>
                                {state.current_inear_targets.map(tId => (
                                    <div key={tId} className="member-cue" style={{ backgroundColor: 'transparent', color: '#111', fontSize: '2.5rem', padding: '0.2rem 1rem', margin: '0' }}>
                                        {inearTargetMap[tId] || tId}
                                    </div>
                                ))}
                            </div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', marginTop: '10px', marginBottom: '10px', color: 'white' }}>소리를</div>
                        </>
                    )}

                    {hasInEarAdj && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="member-cue" style={{ backgroundColor: 'transparent', color: state.current_inear_vol > 0 ? '#d32f2f' : '#1976d2', fontSize: '3.5rem', padding: '0.2rem 1rem', margin: '0 0 10px 0' }}>
                                {state.current_inear_vol > 0 ? `+${state.current_inear_vol}` : state.current_inear_vol}
                            </div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'white' }}>
                                {state.current_inear_vol > 0 ? '올려주세요' : '내려주세요'}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="member-label" style={{ marginTop: '2rem' }}>BPM</div>
            <div className="member-bpm">{state.current_bpm}</div>
        </div>
    );
}
