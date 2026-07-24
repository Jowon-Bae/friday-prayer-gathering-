import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSearchParams } from 'react-router-dom';
import { songMap } from '../utils/songMap';
import ChatOverlay from '../components/ChatOverlay';

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
    'INST': 'Intro',
    'END': 'Ending',
    'BR2': 'Bridge 한 번 더',
    'KA': 'A key',
    'KB': 'B key',
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
        current_song: '',
        next_song: '',
        current_inear_targets: [],
        current_inear_vol: 0,
        song_trigger: 0
    });
    const [searchParams] = useSearchParams();
    const roomCode = (searchParams.get('room') || localStorage.getItem('roomCode') || 'DEFAULT').toUpperCase().trim();
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const prevTriggerRef = useRef(null);

    useEffect(() => {
        // Only trigger if this is a new value (greater than the last seen value) and not the initial payload
        const isOldTrigger = (Date.now() - state.song_trigger) > 10000;
        if (state.song_trigger && prevTriggerRef.current !== null && state.song_trigger > prevTriggerRef.current && !isOldTrigger) {
            setIsTransitioning(true);
            const transitionTimer = setTimeout(() => {
                setIsTransitioning(false);
            }, 7058);

            const swapTimer = setTimeout(() => {
                setState(prev => {
                    if (prev.next_song) {
                        return {
                            ...prev,
                            current_song: prev.next_song,
                            next_song: ''
                        };
                    }
                    return prev;
                });
            }, 5292); // swap at 6th flash

            return () => {
                clearTimeout(transitionTimer);
                clearTimeout(swapTimer);
            };
        }
        
        // Update the ref to the current trigger value after evaluating
        if (state.song_trigger !== undefined) {
            prevTriggerRef.current = state.song_trigger;
        }
    }, [state.song_trigger]);

    useEffect(() => {
        if (socket.connected) {
            setIsConnected(true);
            socket.emit('update_state', {});
        }

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('join_room', roomCode);
        });
        // If already connected (reconnect/refresh), emit immediately
        if (socket.connected) {
            socket.emit('join_room', roomCode);
        }
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

    const baseKey = state.current_key ? (cueLabelMap[state.current_key] || state.current_key) : '';
    const isFlat = state.current_modifiers && state.current_modifiers.includes('FLAT');
    const displayKey = baseKey ? (isFlat ? baseKey.replace(' key', 'b key') : baseKey) : '';

    const modifierLabelMap = {
        'FLAT': 'b',
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
            style={{
                backgroundColor: state.current_color,
                paddingBottom: 'max(30px, env(safe-area-inset-bottom))',
                paddingTop: 'max(60px, env(safe-area-inset-top))'
            }}
        >
            <div className={`connection-status ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
                {isConnected ? 'LIVE' : 'RECONNECTING...'} · {roomCode}
            </div>

            {isTransitioning && (
                <div className="flash-transition" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'
                }}>
                    <h2 style={{ fontSize: '8vw', fontWeight: '900', color: 'white',
                        textAlign: 'center', lineHeight: 1.2, margin: '0 20px',
                        textShadow: '2px 2px 4px black, -2px -2px 4px black, 2px -2px 4px black, -2px 2px 4px black'
                    }}>
                        다음 곡으로<br/>넘어가겠습니다!
                    </h2>
                </div>
            )}

            <div style={{ display: 'flex', width: '90%', maxWidth: '600px', gap: '15px', marginBottom: '1rem' }}>
                <div className="member-song" style={{ flex: 1, margin: 0, padding: '15px', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.4)' }}>
                    <span className="member-song-label" style={{ fontSize: '1rem', color: '#888' }}>현재 곡</span>
                    <span className="member-song-number" style={{ fontSize: '3.5rem' }}>{state.current_song || '-'}</span>
                    {(songMap[state.current_song] || songMap[parseInt(state.current_song, 10)]) ? (
                        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff', marginTop: '5px', textAlign: 'center' }}>
                            {songMap[state.current_song] || songMap[parseInt(state.current_song, 10)]}
                        </span>
                    ) : null}
                </div>
                
                <div className="member-song" style={{ flex: 1, margin: 0, padding: '15px', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.4)' }}>
                    <span className="member-song-label" style={{ fontSize: '1rem', color: '#888' }}>다음 곡</span>
                    <span className="member-song-number" style={{ fontSize: '3.5rem' }}>{state.next_song || '-'}</span>
                    {(songMap[state.next_song] || songMap[parseInt(state.next_song, 10)]) ? (
                        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff', marginTop: '5px', textAlign: 'center' }}>
                            {songMap[state.next_song] || songMap[parseInt(state.next_song, 10)]}
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="member-cues-container">
                {displayKey && <div className="member-cue">{displayKey}</div>}
                {displayCue && <div className="member-cue">{displayCue}</div>}
                {hasModifiers && state.current_modifiers.map(mod => (
                    <div key={mod} className="member-cue" style={{ textShadow: '0 4px 10px rgba(0,0,0,0.5)', animation: 'flash-text-blink 0.882s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>{modifierLabelMap[mod] || mod}</div>
                ))}
                {isWaiting && <div className="member-cue">WAIT</div>}
            </div>

            {(hasInEarTargets || hasInEarAdj) && (
                <div className="member-cues-container" style={{ marginTop: '0.5rem', backgroundColor: 'rgba(50,50,50,0.5)', borderColor: '#555', minHeight: 'auto', paddingTop: '0.5rem', paddingBottom: '0.5rem', width: '90%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ color: '#aaa', fontSize: '1.2rem', marginBottom: '0.5rem', letterSpacing: '2px', fontWeight: 'bold' }}>IN-EAR CONTROL</div>

                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ccc' }}>제 인이어에</span>
                        {hasInEarTargets && state.current_inear_targets.map(tId => (
                            <span key={tId} style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '8px' }}>
                                {inearTargetMap[tId] || tId}
                            </span>
                        ))}
                        {hasInEarTargets && <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ccc' }}>소리를</span>}
                        {hasInEarAdj && (
                            <>
                                <span style={{ color: state.current_inear_vol > 0 ? '#ff5252' : '#448aff', fontSize: '1.6rem', fontWeight: '900', textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                                    {state.current_inear_vol > 0 ? `+${state.current_inear_vol}` : state.current_inear_vol}
                                </span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ccc' }}>
                                    {state.current_inear_vol > 0 ? '올려주세요' : '내려주세요'}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="member-label" style={{ marginTop: '0.5rem', fontSize: '5vw' }}>BPM</div>
            <div
                className="member-bpm"
                style={state.is_playing ? { animation: `bpm-blink ${60 / state.current_bpm}s infinite` } : {}}
            >
                {state.current_bpm}
            </div>

            <ChatOverlay socket={socket} role="팀원(Member)" />
        </div>
    );
}
