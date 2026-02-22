import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const inearTargets = [
    { id: 'WL', label: '예배인도자', color: '#1f1f1f' },
    { id: 'CLICK', label: '클릭', color: '#1f1f1f' },
    { id: 'SINGER', label: '싱어', color: '#1f1f1f' },
    { id: 'PRAY', label: '기도인도자', color: '#1f1f1f' },
    { id: 'PREACH', label: '설교자', color: '#1f1f1f' },
    { id: 'KEYMAIN', label: '메인 건반', color: '#1f1f1f' },
    { id: 'KEY21', label: '세컨1 건반', color: '#1f1f1f' },
    { id: 'KEY22', label: '세컨2 건반', color: '#1f1f1f' },
    { id: 'DRUM', label: '드럼', color: '#1f1f1f' },
    { id: 'BASS', label: '베이스', color: '#1f1f1f' },
    { id: 'ELEC', label: '일렉', color: '#1f1f1f' }
];

export default function InEar() {
    const navigate = useNavigate();
    const [targets, setTargets] = useState([]);
    const [vol, setVol] = useState(0);
    const [isConnected, setIsConnected] = useState(socket.connected);

    // To show preview, we also listen to member state
    const [memberState, setMemberState] = useState({
        current_bpm: 70,
        current_cue: 'WAIT',
        current_key: '',
        current_modifiers: [],
        current_color: '#121212',
        current_song: ''
    });

    useEffect(() => {
        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        socket.on('state_update', (state) => {
            if (state.current_inear_targets !== undefined) setTargets(state.current_inear_targets);
            if (state.current_inear_vol !== undefined) setVol(state.current_inear_vol);
            setMemberState(prev => ({ ...prev, ...state }));
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('state_update');
        };
    }, []);

    const toggleTarget = (tId) => {
        setTargets(prev => {
            const next = prev.includes(tId) ? prev.filter(x => x !== tId) : [...prev, tId];
            socket.emit('update_state', { current_inear_targets: next });
            return next;
        });
    };

    const changeVol = (delta) => {
        setVol(prev => {
            const next = prev + delta;
            socket.emit('update_state', { current_inear_vol: next });
            return next;
        });
    };

    const clearInEar = () => {
        setTargets([]);
        setVol(0);
        socket.emit('update_state', { current_inear_targets: [], current_inear_vol: 0 });
    };

    const handleReturn = () => {
        clearInEar();
        navigate('/master');
    };

    // Derived values for preview
    const cueLabelMap = { 'V1': 'Verse 1', 'V2': 'Verse 2', 'CH': 'Chorus', 'BR': 'Bridge', 'INST': 'Instrument', 'END': 'Ending', 'BR2': 'Bridge 한 번 더', 'KA': 'A key', 'KBb': 'Bb key', 'KC': 'C key', 'KD': 'D key', 'KE': 'E key', 'KF': 'F key', 'KG': 'G key' };
    const modifierLabelMap = { 'ONEMORE': '한 번 더', 'KEYUP': 'Key up' };

    const displayCue = memberState.current_cue && memberState.current_cue !== 'WAIT' ? (cueLabelMap[memberState.current_cue] || memberState.current_cue) : '';
    const displayKey = memberState.current_key ? (cueLabelMap[memberState.current_key] || memberState.current_key) : '';
    const hasModifiers = memberState.current_modifiers && memberState.current_modifiers.length > 0;
    const isWaiting = !displayCue && !displayKey && !hasModifiers;

    const inearTargetMap = { 'WL': '예배인도자', 'CLICK': '클릭', 'SINGER': '싱어', 'PRAY': '기도인도자', 'PREACH': '설교자', 'KEYMAIN': '메인 건반', 'KEY21': '세컨1 건반', 'KEY22': '세컨2 건반', 'DRUM': '드럼', 'BASS': '베이스', 'ELEC': '일렉' };
    const hasInEarTargets = targets && targets.length > 0;
    const hasInEarAdj = vol !== 0;

    return (
        <div className="master-container" style={{ padding: '1rem', overflowY: 'auto' }}>
            <div className={`connection-status ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
                {isConnected ? 'ONLINE' : 'OFFLINE'}
            </div>

            <h1 style={{ textAlign: 'center', margin: '0.5rem 0 0.5rem', fontSize: '1.5rem' }}>인이어(In-Ear) 조정</h1>

            {/* PREVIEW BOX */}
            <div style={{
                backgroundColor: memberState.current_color || '#121212',
                border: '2px dashed #666',
                borderRadius: '8px',
                padding: '0.5rem 1rem 1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                minHeight: '150px'
            }}>
                <div style={{ position: 'absolute', top: '-10px', left: '10px', backgroundColor: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>화면 미리보기</div>

                {memberState.current_song && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div>SONG NO. {memberState.current_song}</div>
                        {songMap[memberState.current_song] && (
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginTop: '3px' }}>
                                {songMap[memberState.current_song]}
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', marginTop: '10px' }}>
                    {displayKey && <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{displayKey}</div>}
                    {displayCue && <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{displayCue}</div>}
                    {hasModifiers && memberState.current_modifiers.map(mod => (
                        <div key={mod} style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffeb3b' }}>{modifierLabelMap[mod] || mod}</div>
                    ))}
                    {isWaiting && <div style={{ fontSize: '1.2rem', opacity: 0.6 }}>WAIT</div>}
                </div>

                {(hasInEarTargets || hasInEarAdj) && (
                    <div style={{ marginTop: '10px', backgroundColor: 'rgba(50,50,50,0.5)', width: '90%', padding: '10px', borderRadius: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ color: '#aaa', fontSize: '1.2rem', marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold' }}>IN-EAR CONTROL</div>

                        {hasInEarTargets && (
                            <>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '5px', color: 'white' }}>제 인이어에</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '5px' }}>
                                    {targets.map(tId => (
                                        <div key={tId} style={{ backgroundColor: 'transparent', color: '#111', padding: '0', borderRadius: '4px', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {inearTargetMap[tId] || tId}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '5px', marginBottom: '5px', color: 'white' }}>소리를</div>
                            </>
                        )}

                        {hasInEarAdj && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ backgroundColor: 'transparent', color: vol > 0 ? '#d32f2f' : '#1976d2', padding: '0', borderRadius: '4px', fontSize: '2rem', fontWeight: 'bold', display: 'inline-block', marginBottom: '5px' }}>
                                    {vol > 0 ? `+${vol}` : vol}
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>
                                    {vol > 0 ? '올려주세요' : '내려주세요'}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="cue-grid">
                {inearTargets.map(t => (
                    <button
                        key={t.id}
                        className="cue-btn"
                        style={{
                            backgroundColor: t.color,
                            opacity: targets.includes(t.id) ? 1 : 0.6,
                            border: targets.includes(t.id) ? '4px solid white' : 'none',
                            fontSize: '1.3rem'
                        }}
                        onClick={() => toggleTarget(t.id)}
                    >
                        {t.label}
                    </button>
                ))}

                <div className="cue-divider"></div>

                <div style={{ display: 'flex', gap: '1rem', gridColumn: '1 / -1' }}>
                    <button
                        className="cue-btn"
                        style={{
                            flex: 1,
                            backgroundColor: '#d32f2f',
                            opacity: vol > 0 ? 1 : 0.6,
                            border: vol > 0 ? '4px solid white' : 'none',
                            fontSize: '2rem',
                            fontWeight: 'bold'
                        }}
                        onClick={() => changeVol(1)}
                    >
                        +1
                    </button>
                    <button
                        className="cue-btn"
                        style={{
                            flex: 1,
                            backgroundColor: '#1976d2',
                            opacity: vol < 0 ? 1 : 0.6,
                            border: vol < 0 ? '4px solid white' : 'none',
                            fontSize: '2rem',
                            fontWeight: 'bold'
                        }}
                        onClick={() => changeVol(-1)}
                    >
                        -1
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
                <button
                    className="cue-btn"
                    style={{ flex: 1, backgroundColor: '#444', fontSize: '1.2rem', padding: '1rem' }}
                    onClick={clearInEar}
                >
                    지우기 (CLEAR)
                </button>
                <button
                    className="cue-btn"
                    style={{ flex: 1, backgroundColor: '#2a2a2a', fontSize: '1.2rem', padding: '1rem', border: '2px solid #555' }}
                    onClick={handleReturn}
                >
                    ← 마스터 복귀
                </button>
            </div>
        </div>
    );
}
