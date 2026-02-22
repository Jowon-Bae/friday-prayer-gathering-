import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const inearAdjustments = [
    { id: 'UP', label: '+1', color: '#d32f2f' },
    { id: 'DOWN', label: '-1', color: '#1976d2' }
];

export default function InEar() {
    const navigate = useNavigate();
    const [targets, setTargets] = useState([]);
    const [adjustments, setAdjustments] = useState([]);
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        socket.on('state_update', (state) => {
            if (state.current_inear_targets !== undefined) setTargets(state.current_inear_targets);
            if (state.current_inear_modifiers !== undefined) setAdjustments(state.current_inear_modifiers);
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

    const toggleAdjustment = (aId) => {
        setAdjustments(prev => {
            const next = prev.includes(aId) ? prev.filter(x => x !== aId) : [...prev, aId];
            socket.emit('update_state', { current_inear_modifiers: next });
            return next;
        });
    };

    const clearInEar = () => {
        setTargets([]);
        setAdjustments([]);
        socket.emit('update_state', { current_inear_targets: [], current_inear_modifiers: [] });
    };

    return (
        <div className="master-container" style={{ padding: '1rem', overflowY: 'auto' }}>
            <div className={`connection-status ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
                {isConnected ? 'ONLINE' : 'OFFLINE'}
            </div>

            <h1 style={{ textAlign: 'center', margin: '0.5rem 0 1.5rem', fontSize: '1.5rem' }}>인이어(In-Ear) 조정</h1>

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

                {inearAdjustments.map(a => (
                    <button
                        key={a.id}
                        className="cue-btn"
                        style={{
                            backgroundColor: a.color,
                            opacity: adjustments.includes(a.id) ? 1 : 0.6,
                            border: adjustments.includes(a.id) ? '4px solid white' : 'none',
                            fontSize: '1.8rem',
                            fontWeight: 'bold'
                        }}
                        onClick={() => toggleAdjustment(a.id)}
                    >
                        {a.label}
                    </button>
                ))}
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
                    onClick={() => navigate('/master')}
                >
                    ← 마스터 복귀
                </button>
            </div>
        </div>
    );
}
