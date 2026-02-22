import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function InEar() {
    const navigate = useNavigate();

    return (
        <div style={{
            height: '100%',
            backgroundColor: '#121212',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem'
        }}>
            <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>인이어(In-Ear) 조정</h1>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                flex: 1
            }}>
                <button className="cue-btn" style={{ backgroundColor: '#2a2a2a' }} onClick={() => alert('보컬 인이어 조절')}>
                    보컬 인이어 (Vocal)
                </button>
                <button className="cue-btn" style={{ backgroundColor: '#2a2a2a' }} onClick={() => alert('건반 인이어 조절')}>
                    건반 인이어 (Keyboard)
                </button>
                <button className="cue-btn" style={{ backgroundColor: '#2a2a2a' }} onClick={() => alert('기타 인이어 조절')}>
                    기타/베이스 인이어 (Guitar/Bass)
                </button>
                <button className="cue-btn" style={{ backgroundColor: '#2a2a2a' }} onClick={() => alert('드럼 인이어 조절')}>
                    드럼 인이어 (Drum)
                </button>
            </div>

            <button
                className="home-btn"
                style={{ backgroundColor: '#444', marginTop: '2rem', padding: '1rem', width: '100%', textAlign: 'center', fontWeight: 'bold' }}
                onClick={() => navigate('/master')}
            >
                ← 마스터 화면으로 돌아가기
            </button>
        </div>
    );
}
