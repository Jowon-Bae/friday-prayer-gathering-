import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { songMap } from '../utils/songMap';
import ChatOverlay from '../components/ChatOverlay';
import { Rnd } from 'react-rnd';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

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

export default function IPadSheet() {
    const [state, setState] = useState({
        current_bpm: 70,
        current_cue: 'WAIT',
        current_key: '',
        current_modifiers: [],
        current_color: '#121212',
        current_song: '',
        next_song: '',
        song_trigger: 0,
        current_inear_targets: [],
        current_inear_vol: 0
    });
    const [searchParams] = useSearchParams();
    const roomCode = (searchParams.get('room') || localStorage.getItem('roomCode') || 'DEFAULT').toUpperCase().trim();
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [transitionPhase, setTransitionPhase] = useState('idle'); // 'idle', 'out', 'in'
    const transitionPhaseRef = useRef(transitionPhase);
    useEffect(() => { transitionPhaseRef.current = transitionPhase; }, [transitionPhase]);
    const [isInterrupt, setIsInterrupt] = useState(false);
    const prevSongRef = useRef(null);
    const [chatImagePreview, setChatImagePreview] = useState(null);
    const [imgError, setImgError] = useState(false);
    const [chatBlink, setChatBlink] = useState(false);
    const chatBlinkTimer = useRef(null);
    const handleNewChatMessage = () => {
        setChatBlink(true);
        if (chatBlinkTimer.current) clearTimeout(chatBlinkTimer.current);
        chatBlinkTimer.current = setTimeout(() => {
            setChatBlink(false);
        }, 7058);
    };
    const [widgetRect, setWidgetRect] = useState({ x: 20, y: 160, width: 370, height: 810 });
    const prevTriggerRef = useRef(0);
    const hasReceivedInitialState = useRef(false);

    useEffect(() => {
        const isOldTrigger = (Date.now() - state.song_trigger) > 10000;
        if (state.song_trigger && state.song_trigger > prevTriggerRef.current && !isOldTrigger) {
            setChatImagePreview(null);
            setIsInterrupt(transitionPhaseRef.current !== 'idle');
            setTransitionPhase('out');
            
            const inTimer = setTimeout(() => {
                setTransitionPhase('in');
            }, 25000);

            const idleTimer = setTimeout(() => {
                setTransitionPhase('idle');
                prevSongRef.current = null;
            }, 27500);

            prevTriggerRef.current = state.song_trigger;

            return () => {
                clearTimeout(inTimer);
                clearTimeout(idleTimer);
            };
        }
        
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
            setState(prev => {
                if (!hasReceivedInitialState.current) {
                    hasReceivedInitialState.current = true;
                    if (newState.song_trigger) {
                        prevTriggerRef.current = newState.song_trigger;
                    }
                } else if (newState.song_trigger && newState.song_trigger > prevTriggerRef.current) {
                    // Capture the previous song EXACTLY before applying the new state!
                    prevSongRef.current = prev.current_song;
                }
                return { ...prev, ...newState };
            });
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('state_update');
        };
    }, []);

    // Detect if a transition is about to start in the next frame
    const isPendingTransition = state.song_trigger && state.song_trigger > prevTriggerRef.current;
    
    // Active song is the one currently playing (or transitioned to).
    // If a transition is pending, freeze the active song to the previous one to prevent a 1-frame flash!
    const activeSong = isPendingTransition ? (prevSongRef.current || state.current_song) : state.current_song;

    // Reset image error state when active song changes
    useEffect(() => {
        setImgError(false);
    }, [activeSong]);

    const displayCue = state.current_cue && state.current_cue !== 'WAIT'
        ? (cueLabelMap[state.current_cue] || state.current_cue)
        : '';

    const baseKey = state.current_key ? (cueLabelMap[state.current_key] || state.current_key) : '';
    const isFlat = state.current_modifiers && state.current_modifiers.includes('FLAT');
    const displayKey = baseKey ? (isFlat ? baseKey.replace(' key', 'b key') : baseKey) : '';

        useEffect(() => {
        let touchStartX = 0;
        let touchStartY = 0;

        const handleTouchStart = (e) => {
            if (e.changedTouches.length > 0) {
                touchStartX = e.changedTouches[0].screenX;
                touchStartY = e.changedTouches[0].screenY;
            }
        };

        const handleTouchEnd = (e) => {
            if (e.changedTouches.length > 0) {
                const touchEndX = e.changedTouches[0].screenX;
                const touchEndY = e.changedTouches[0].screenY;
                
                // Check if swipe started from the left edge (within 40px)
                if (touchStartX < 40) {
                    const deltaX = touchEndX - touchStartX;
                    const deltaY = Math.abs(touchEndY - touchStartY);
                    
                    // If it's a clear horizontal swipe to the right
                    if (deltaX > 80 && deltaY < 60) {
                        window.location.href = '/';
                    }
                }
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { capture: true });
        window.addEventListener('touchend', handleTouchEnd, { capture: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart, { capture: true });
            window.removeEventListener('touchend', handleTouchEnd, { capture: true });
        };
    }, []);

    const keyColorMap = {
        'KA': 'var(--color-key-a)',
        'KB': 'var(--color-key-bb)',
        'KC': 'var(--color-key-c)',
        'KD': 'var(--color-key-d)',
        'KE': 'var(--color-key-e)',
        'KF': 'var(--color-key-f)',
        'KG': 'var(--color-key-g)'
    };
    
    const modifierLabelMap = {
        'FLAT': 'b',
        'ONEMORE': '한 번 더',
        'KEYUP': 'Key up'
    };

    const hasModifiers = state.current_modifiers && state.current_modifiers.length > 0;
    const hasInEarTargets = state.current_inear_targets && state.current_inear_targets.length > 0;
    const hasInEarAdj = state.current_inear_vol !== 0 && state.current_inear_vol !== undefined;
    const imageUrl = activeSong && !imgError ? `/sheets/${activeSong}.jpg` : null;
    
    // Layout constraints so images do not overlap the widget
    const isWidgetOnLeft = (widgetRect.x + widgetRect.width / 2) < (window.innerWidth / 2);
    const availableImageLeft = isWidgetOnLeft ? widgetRect.x + widgetRect.width + 20 : 20;
    const availableImageWidth = isWidgetOnLeft 
        ? `calc(100vw - ${availableImageLeft + 20}px)`
        : `${widgetRect.x - 40}px`;

    // Split view logic
    const prevSong = prevSongRef.current;
    const targetNextSong = state.current_song;
    const showSplitView = transitionPhase !== 'idle' && prevSong && targetNextSong && (prevSong !== targetNextSong);
    const splitPrevUrl = showSplitView ? `/sheets/${prevSong}.jpg` : null;
    const splitNextUrl = showSplitView ? `/sheets/${targetNextSong}.jpg` : null;

    const activeCueColor = state.current_color && state.current_color !== '#121212' ? state.current_color : '#3b82f6';

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100dvh', backgroundColor: '#111', overflow: 'hidden' }}>
            <div className={`connection-status ${isConnected ? 'status-connected' : 'status-disconnected'}`} style={{ zIndex: 10 }}>
                {isConnected ? 'LIVE' : 'RECONNECTING...'} · {roomCode}
            </div>

            {/* MAIN SHEET MUSIC AREA */}
            {chatImagePreview ? (
                <>
                    <TransformWrapper 
                        key={chatImagePreview}
                        initialScale={1} 
                        centerOnInit={true}
                        doubleClick={{ disabled: false }}
                        pinch={{ step: 5 }}
                    >
                        {(() => {
                            return (
                                <TransformComponent 
                                    wrapperStyle={{ 
                                        width: availableImageWidth, 
                                        height: '100dvh', 
                                        position: 'absolute', 
                                        left: isWidgetOnLeft ? `${availableImageLeft}px` : '20px',
                                        top: 0 
                                    }} 
                                    contentStyle={{ width: '100%', height: '100%' }}
                                >
                                    <img 
                                        src={chatImagePreview} 
                                        alt="Chat Preview" 
                                        className="sheet-fade-in"
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                                    />
                                </TransformComponent>
                            );
                        })()}
                    </TransformWrapper>
                    <button 
                        onClick={() => setChatImagePreview(null)}
                        style={{
                            position: 'absolute',
                            top: '100px',
                            right: '40px',
                            zIndex: 100,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '12px',
                            padding: '12px 24px',
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(5px)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        ✕ 악보로 돌아가기
                    </button>
                </>
            ) : showSplitView ? (
                <div className="sheet-container-transition" style={{ 
                    width: availableImageWidth, 
                    left: isWidgetOnLeft ? `${availableImageLeft}px` : '20px',
                }}>
                    {/* LEFT SIDE: NEXT SONG */}
                    <div key={'left-div-' + targetNextSong + '-' + state.song_trigger} className={transitionPhase === 'out' ? 'anim-fade-in-left' : 'anim-slide-in-center'} style={{ overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(59,130,246,0.85)', color: 'white', fontSize: '0.85rem', fontWeight: 'bold', padding: '4px 14px', borderRadius: '20px', zIndex: 2, whiteSpace: 'nowrap', transition: 'opacity 0.8s', opacity: transitionPhase === 'in' ? 0 : 1 }}>{'다음 곡 ' + targetNextSong}</div>
                        <TransformWrapper key={'next-' + targetNextSong} initialScale={1} centerOnInit={false} doubleClick={{ disabled: false }} pinch={{ step: 5 }}>
                            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                                <img src={splitNextUrl} alt={'Next ' + targetNextSong} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} onError={() => setImgError(true)} />
                            </TransformComponent>
                        </TransformWrapper>
                    </div>
                    {/* RIGHT SIDE: CURRENT SONG */}
                    <div key={'right-div-' + prevSong + '-' + state.song_trigger} className={transitionPhase === 'out' ? (isInterrupt ? 'anim-slide-left-to-right' : 'anim-slide-out-right') : 'anim-fade-out-right'} style={{ overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(60,60,60,0.85)', color: 'white', fontSize: '0.85rem', fontWeight: 'bold', padding: '4px 14px', borderRadius: '20px', zIndex: 2, whiteSpace: 'nowrap' }}>{'현재 곡 ' + prevSong}</div>
                        <TransformWrapper key={'prev-' + prevSong} initialScale={1} centerOnInit={false} doubleClick={{ disabled: false }} pinch={{ step: 5 }}>
                            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                                <img src={splitPrevUrl} alt={'Prev ' + prevSong} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
                            </TransformComponent>
                        </TransformWrapper>
                    </div>
                </div>
            ) : imageUrl ? (
                <TransformWrapper 
                    key={activeSong}
                    initialScale={1} 
                    centerOnInit={false}
                    doubleClick={{ disabled: false }}
                    pinch={{ step: 5 }}
                >
                    <TransformComponent 
                        wrapperStyle={{ 
                            width: availableImageWidth, 
                            height: '100dvh', 
                            position: 'absolute', 
                            left: isWidgetOnLeft ? `${availableImageLeft}px` : '20px',
                            top: 0 
                        }} 
                        contentStyle={{ width: '100%', height: '100%' }}
                    >
                        <img 
                            src={imageUrl} 
                            alt={'Sheet Music for Song ' + activeSong}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', animation: 'none' }}
                            onError={() => setImgError(true)}
                        />
                    </TransformComponent>
                </TransformWrapper>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {activeSong ? `악보가 없습니다. (/sheets/${activeSong}.jpg)` : '대기중...'}
                    </div>
                </div>
            )}

            {/* DRAGGABLE & RESIZABLE SIDEBAR WRAPPER */}
            <Rnd
                default={{
                    x: 20,
                    y: 160,
                    width: 370,
                    height: 810,
                }}
                onDrag={(e, d) => setWidgetRect(prev => ({ ...prev, x: d.x, y: d.y }))}
                onResize={(e, direction, ref, delta, position) => {
                    setWidgetRect({
                        x: position.x,
                        y: position.y,
                        width: ref.offsetWidth,
                        height: ref.offsetHeight
                    });
                }}
                minWidth={250}
                minHeight={350}
                dragHandleClassName="drag-handle"
                style={{ zIndex: 5 }}
                enableResizing={{ bottom: true, bottomRight: true, right: true, left: false, top: false, topRight: false, bottomLeft: false, topLeft: false }}
                resizeHandleStyles={{
                    bottom: { height: '35px', bottom: '-35px' },
                    bottomRight: { width: '35px', height: '35px', right: '-15px', bottom: '-35px' },
                    right: { width: '30px', right: '-15px' }
                }}
                resizeHandleComponent={{
                    bottom: (
                        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '5px', zIndex: 9999, position: 'relative' }}>
                            <div style={{ backgroundColor: '#fff', color: '#000', fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
                                ↕ 위아래로 당겨서 크기 조절
                            </div>
                        </div>
                    ),
                    bottomRight: (
                        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', paddingTop: '5px', paddingRight: '5px' }}>
                            <div style={{ width: '0', height: '0', borderBottom: '15px solid #fff', borderLeft: '15px solid transparent', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))', pointerEvents: 'none' }}></div>
                        </div>
                    )
                }}
            >
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* FLASH TRANSITION TEXT (Above the box) */}
                {(transitionPhase !== 'idle') && (
                    <div className="flash-transition" style={{ 
                        position: 'absolute',
                        bottom: 'calc(100% + 15px)',
                        left: 0,
                        backgroundColor: 'var(--color-ch)', 
                        padding: '12px 15px', 
                        borderRadius: '12px',
                        width: '100%',
                        textAlign: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,100,100,0.5)',
                        animation: 'flash-text-blink 1s infinite alternate'
                    }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white', lineHeight: 1.3, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                            다음 곡으로<br/>넘어가겠습니다!
                        </div>
                    </div>
                )}

                {/* FLOATING CUE WIDGET */}
                <div style={{
                    backgroundColor: 'rgba(20, 20, 20, 0.85)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    borderRadius: '20px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    width: '100%', height: 'auto', display: 'flex', flexShrink: 0,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    overflow: 'hidden'
                }}>
                    {/* DRAG HANDLE */}
                    <div className="drag-handle" style={{
                        width: '100%',
                        height: '35px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        cursor: 'grab',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        flexShrink: 0
                    }}>
                        <div style={{ width: '50px', height: '6px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '3px' }}></div>
                    </div>

                    <div style={{ padding: '1.5rem', width: '100%', height: '100%', overflowY: 'auto' }}>
                        <div style={{ fontSize: '1rem', color: 'white', fontWeight: 'bold', marginBottom: '4px' }}>현재 곡</div>
                        <div style={{ fontSize: '4rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>{activeSong || '-'}</div>
                        {(function() {
                            const title = songMap[activeSong] || songMap[parseInt(activeSong, 10)] || '';
                            const charFactor = title.length > 0 ? title.split('').reduce((acc, char) => acc + (char.charCodeAt(0) > 255 ? 1 : 0.6), 0) : 1;
                            return (
                                <div style={{ containerType: 'inline-size', width: '100%', marginBottom: '20px' }}>
                                    <div style={{ 
                                        fontSize: `min(2rem, calc(100cqi / ${Math.max(1, charFactor)}))`, 
                                        color: 'white',
                                        fontWeight: '900',
                                        textAlign: 'left', 
                                        lineHeight: 1.2,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {title}
                                    </div>
                                </div>
                            );
                        })()}

                        <div style={{ height: '1px', width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: '15px' }}></div>
                        <div style={{ fontSize: '1rem', color: 'white', fontWeight: 'bold', marginBottom: '4px' }}>다음 곡</div>
                        <div style={{ fontSize: '2.8rem', fontWeight: 'bold', color: 'white', lineHeight: 1 }}>{state.next_song || '-'}</div>
                        {(function() {
                            const title = songMap[state.next_song] || songMap[parseInt(state.next_song, 10)] || '';
                            const charFactor = title.length > 0 ? title.split('').reduce((acc, char) => acc + (char.charCodeAt(0) > 255 ? 1 : 0.6), 0) : 1;
                            return (
                                <div style={{ containerType: 'inline-size', width: '100%', marginBottom: '20px' }}>
                                    <div style={{ 
                                        fontSize: `min(1.8rem, calc(100cqi / ${Math.max(1, charFactor)}))`, 
                                        color: 'white',
                                        fontWeight: '900',
                                        textAlign: 'left', 
                                        lineHeight: 1.2,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {title}
                                    </div>
                                </div>
                            );
                        })()}
                        <div style={{ height: '1px', width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: '20px' }}></div>

                        {displayKey && <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', backgroundColor: keyColorMap[state.current_key] || 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: '10px', marginBottom: '12px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{displayKey}</div>}
                        {displayCue && <div style={{ fontSize: '3.5rem', fontWeight: '900', color: activeCueColor, textShadow: '0 4px 10px rgba(0,0,0,0.5)', marginBottom: '12px' }}>{displayCue}</div>}
                        
                        {hasModifiers && state.current_modifiers.map(mod => (
                            <div key={mod} style={{ fontSize: '2.2rem', fontWeight: '900', color: '#eab308', textShadow: '0 4px 10px rgba(0,0,0,0.5)', marginBottom: '8px', animation: 'flash-text-blink 0.882s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                                {modifierLabelMap[mod] || mod}
                            </div>
                        ))}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '15px' }}>
                            <span style={{ fontSize: '1.2rem', color: '#888', fontWeight: 'bold' }}>BPM</span>
                            <span style={state.is_playing ? { fontSize: '3rem', fontWeight: '900', color: '#fff', animation: `bpm-blink ${60 / state.current_bpm}s infinite` } : { fontSize: '3rem', fontWeight: '900', color: '#fff' }}>
                                {state.current_bpm}
                            </span>
                        </div>

                        {(hasInEarTargets || hasInEarAdj) && (
                            <div className="member-cues-container" style={{ marginTop: '20px', backgroundColor: 'rgba(50,50,50,0.5)', borderRadius: '15px', border: '1px solid #555', padding: '15px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ color: '#aaa', fontSize: '1rem', marginBottom: '10px', letterSpacing: '2px', fontWeight: 'bold' }}>IN-EAR CONTROL</div>

                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ccc' }}>제 인이어에</span>
                                    {hasInEarTargets && state.current_inear_targets.map(tId => (
                                        <span key={tId} style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '8px' }}>
                                            {inearTargetMap[tId] || tId}
                                        </span>
                                    ))}
                                    {hasInEarTargets && <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ccc' }}>소리를</span>}
                                    {hasInEarAdj && (
                                        <>
                                            <span style={{ color: state.current_inear_vol > 0 ? '#ef4444' : '#3b82f6', fontSize: '1.6rem', fontWeight: '900', textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
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
                    </div>
                </div>
            
                {/* CHAT WIDGET */}
                <div style={{
                    marginTop: '15px',
                    width: '100%',
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '20px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    overflow: 'hidden'
                }}>
                    <div className={`drag-handle ${chatBlink ? 'chat-blink-active' : ''}`} style={{
                        width: '100%', height: '35px', 
                        backgroundColor: 'rgba(255,255,255,0.1)', 
                        cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        color: 'white', fontWeight: 'bold'
                    }}>
                        💬 실시간 팀 채팅
                    </div>
                    <div style={{ flex: 1, backgroundColor: 'rgba(30, 30, 30, 0.9)', position: 'relative', minHeight: 0, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column' }}>
                            <ChatOverlay socket={socket} role="아이패드(iPad)" inline={true} onImageClick={setChatImagePreview} onNewMessage={handleNewChatMessage} />
                        </div>
                    </div>
                </div>
                </div>
            </Rnd>

        </div>
    );
}
