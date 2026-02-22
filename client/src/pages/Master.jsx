import React, { useState, useEffect, useRef } from 'react';
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

// Group 1: Song Sections
const sections = [
    { id: 'V1', label: 'V1', color: 'var(--color-v1)' },
    { id: 'V2', label: 'V2', color: 'var(--color-v2)' },
    { id: 'CH', label: 'Ch', color: 'var(--color-ch)' },
    { id: 'BR', label: 'Br', color: 'var(--color-br)' },
    { id: 'INST', label: 'Inst.', color: 'var(--color-inst)' },
    { id: 'END', label: 'Ending', color: 'var(--color-end)' }
];

// Group 2: Musical Keys
const keyCues = [
    { id: 'KA', label: 'A key', color: 'var(--color-key-a)' },
    { id: 'KBb', label: 'Bb key', color: 'var(--color-key-bb)' },
    { id: 'KC', label: 'C key', color: 'var(--color-key-c)' },
    { id: 'KD', label: 'D key', color: 'var(--color-key-d)' },
    { id: 'KE', label: 'E key', color: 'var(--color-key-e)' },
    { id: 'KF', label: 'F key', color: 'var(--color-key-f)' },
    { id: 'KG', label: 'G key', color: 'var(--color-key-g)' }
];

// Group 3: Modifiers (Toggleable, Multiple allowed)
const modifiers = [
    { id: 'ONEMORE', label: '한 번 더', color: 'var(--color-onemore)' },
    { id: 'KEYUP', label: 'Key up', color: 'var(--color-keyup)' }
];

export default function Master() {
    const navigate = useNavigate();
    const [bpm, setBpm] = useState(70); // default to 70
    const [activeSection, setActiveSection] = useState('');
    const [activeKey, setActiveKey] = useState('');
    const [activeModifiers, setActiveModifiers] = useState([]);
    const [songNum, setSongNum] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);

    // For continuous button press
    const holdTimeoutRef = useRef(null);
    const holdIntervalRef = useRef(null);

    useEffect(() => {
        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        socket.on('state_update', (state) => {
            setBpm(state.current_bpm);
            setActiveSection(state.current_cue);
            if (state.current_key !== undefined) setActiveKey(state.current_key);
            if (state.current_song !== undefined) setSongNum(state.current_song);
            if (state.current_modifiers !== undefined) setActiveModifiers(state.current_modifiers);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('state_update');
            stopHold();
        };
    }, []);

    const changeBpm = (delta) => {
        setBpm(prev => {
            const newBpm = prev + delta;
            socket.emit('update_state', { current_bpm: newBpm });
            return newBpm;
        });
    };

    const startHold = (delta) => {
        changeBpm(delta);
        holdTimeoutRef.current = setTimeout(() => {
            holdIntervalRef.current = setInterval(() => {
                changeBpm(delta);
            }, 100);
        }, 400);
    };

    const stopHold = () => {
        if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };

    const selectSection = (cue, color) => {
        setActiveSection(cue);
        socket.emit('update_state', { current_cue: cue, current_color: color });
    };

    const selectKey = (keyId) => {
        // Toggle off if already selected, otherwise turn on
        const newKey = activeKey === keyId ? '' : keyId;
        setActiveKey(newKey);
        socket.emit('update_state', { current_key: newKey });
    };

    const toggleModifier = (modId) => {
        setActiveModifiers(prev => {
            const next = prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId];
            socket.emit('update_state', { current_modifiers: next });
            return next;
        });
    };

    const handleSongChange = (e) => {
        const val = e.target.value;
        setSongNum(val);
        socket.emit('update_state', { current_song: val });
    };

    return (
        <div className="master-container">
            <div className={`connection-status ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
                {isConnected ? 'ONLINE' : 'OFFLINE'}
            </div>

            <div className="song-control">
                <span className="song-label">곡 번호 입력:</span>
                <input
                    type="text"
                    className="song-input"
                    placeholder="예: 434"
                    value={songNum}
                    onChange={handleSongChange}
                />
            </div>

            <div className="tempo-control">
                <div className="tempo-column">
                    <button className="tempo-btn" onClick={() => changeBpm(-10)}>-10</button>
                    <button
                        className="tempo-btn tempo-btn-main"
                        onMouseDown={() => startHold(-1)}
                        onMouseUp={stopHold}
                        onMouseLeave={stopHold}
                        onTouchStart={(e) => { e.preventDefault(); startHold(-1); }}
                        onTouchEnd={(e) => { e.preventDefault(); stopHold(); }}
                    >-1</button>
                </div>

                <div className="tempo-display">
                    <span className="tempo-label">TEMPO</span>
                    <span className="tempo-number">{bpm}</span>
                </div>

                <div className="tempo-column">
                    <button className="tempo-btn" onClick={() => changeBpm(10)}>+10</button>
                    <button
                        className="tempo-btn tempo-btn-main"
                        onMouseDown={() => startHold(1)}
                        onMouseUp={stopHold}
                        onMouseLeave={stopHold}
                        onTouchStart={(e) => { e.preventDefault(); startHold(1); }}
                        onTouchEnd={(e) => { e.preventDefault(); stopHold(); }}
                    >+1</button>
                </div>
            </div>

            <div className="cue-grid">
                {keyCues.map(kCue => (
                    <button
                        key={kCue.id}
                        className={`cue-btn`}
                        style={{
                            backgroundColor: kCue.color,
                            opacity: activeKey === kCue.id ? 1 : 0.6,
                            border: activeKey === kCue.id ? '4px solid white' : 'none',
                            fontSize: '1.8rem',
                            whiteSpace: 'pre-line'
                        }}
                        onClick={() => selectKey(kCue.id)}
                    >
                        {kCue.label}
                    </button>
                ))}

                <div className="cue-divider"></div>

                {sections.map(sec => (
                    <button
                        key={sec.id}
                        className={`cue-btn cue-${sec.id.toLowerCase()}`}
                        style={{
                            backgroundColor: sec.color,
                            opacity: activeSection === sec.id ? 1 : 0.6,
                            border: activeSection === sec.id ? '4px solid white' : 'none',
                            fontSize: '1.8rem',
                            whiteSpace: 'pre-line'
                        }}
                        onClick={() => selectSection(sec.id, sec.color)}
                    >
                        {sec.label}
                    </button>
                ))}

                <div className="cue-divider"></div>

                {modifiers.map(mod => (
                    <button
                        key={mod.id}
                        className={`cue-btn`}
                        style={{
                            backgroundColor: mod.color,
                            opacity: activeModifiers.includes(mod.id) ? 1 : 0.6,
                            border: activeModifiers.includes(mod.id) ? '4px solid white' : 'none',
                            fontSize: '1.8rem',
                            whiteSpace: 'pre-line'
                        }}
                        onClick={() => toggleModifier(mod.id)}
                    >
                        {mod.label}
                    </button>
                ))}

                <div className="cue-divider"></div>

                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                    <button
                        className="cue-btn"
                        style={{
                            backgroundColor: '#2a2a2a',
                            width: '100%',
                            fontSize: '1.5rem',
                            padding: '1.5rem',
                            border: '2px solid #444',
                        }}
                        onClick={() => navigate('/inear')}
                    >
                        인이어 조정 (In-Ear Control)
                    </button>
                </div>
            </div>
        </div>
    );
}
