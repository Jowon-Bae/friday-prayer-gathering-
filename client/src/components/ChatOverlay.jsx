import React, { useState, useEffect, useRef } from 'react';
import './ChatOverlay.css';

export default function ChatOverlay({ socket, role, inline = false, onImageClick, onNewMessage }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState(null); // stores the msg object of the image
    const [dragOffset, setDragOffset] = useState(0);              // for swipe-down to dismiss
    const [typingUsers, setTypingUsers] = useState([]);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const touchStartY = useRef(0);

    useEffect(() => {
        if (!socket) return;

        const handleHistory = (history) => {
            setMessages(history);
        };

        const handleNewMessage = (msg) => {
            setMessages(prev => [...prev, msg]);
            if (!isOpen) {
                setUnreadCount(prev => prev + 1);
            }
            if (msg.role !== role) {
                if (onNewMessage) onNewMessage();
            }
        };

        const handleDelete = (msgId) => {
            setMessages(prev => prev.filter(m => m.id !== msgId));
        };

        const handleUserTyping = (data) => {
            const label = data.name ? `${data.name} (${data.role})` : data.role;
            setTypingUsers(prev => prev.includes(label) ? prev : [...prev, label]);
        };
        const handleUserStoppedTyping = (data) => {
            const label = data.name ? `${data.name} (${data.role})` : data.role;
            setTypingUsers(prev => prev.filter(u => u !== label));
        };

        socket.on('chat_history', handleHistory);
        socket.on('chat_message', handleNewMessage);
        socket.on('chat_deleted', handleDelete);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stopped_typing', handleUserStoppedTyping);

        return () => {
            socket.off('chat_history', handleHistory);
            socket.off('chat_message', handleNewMessage);
            socket.off('chat_deleted', handleDelete);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stopped_typing', handleUserStoppedTyping);
        };
    }, [socket, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
            scrollToBottom();
        }
    }, [isOpen, messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const sendMessage = (e) => {
        if (e) e.preventDefault();
        if (!inputValue.trim()) return;

        const senderName = sessionStorage.getItem('confirmedName') || '익명';
        socket.emit('send_chat', {
            text: inputValue.trim(),
            role: role,
            senderName: senderName
        });
        // Stop typing indicator
        clearTimeout(typingTimeoutRef.current);
        isTypingRef.current = false;
        socket.emit('typing_stop', { name: senderName, role });
        setInputValue('');
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            alert('파일 크기는 10MB를 초과할 수 없습니다.');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Determine the correct server URL
            const isCloudflare = window.location.hostname.includes('trycloudflare.com');
            const serverUrl = import.meta.env.PROD ? '' : (isCloudflare
                ? `https://outside-concepts-mouse-hypothesis.trycloudflare.com`
                : `http://${window.location.hostname}:3001`);

            const response = await fetch(`${serverUrl}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();

            // Send the file info as a chat message
            socket.emit('send_chat', {
                text: '', // No text for pure file uploads
                fileUrl: `${serverUrl}${data.url}`,
                fileName: data.originalName,
                fileType: data.mimetype,
                role: role,
                senderName: sessionStorage.getItem('confirmedName') || '익명'
            });

        } catch (error) {
            console.error('File upload error:', error);
            alert('파일 업로드에 실패했습니다.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
        }
    };

    const deleteMessage = (msgId) => {
        if (window.confirm('정말 이 메시지(파일)를 삭제하시겠습니까?')) {
            socket.emit('delete_chat', msgId);
            if (fullscreenImage && fullscreenImage.id === msgId) {
                closeFullscreen();
            }
        }
    };

    // Fullscreen Image Handlers
    const openFullscreen = (msg) => {
        if (onImageClick) {
            onImageClick(msg.fileUrl);
        } else {
            setFullscreenImage(msg);
        }
    };
    const closeFullscreen = () => {
        setFullscreenImage(null);
        setDragOffset(0);
    };

    const handleTouchStart = (e) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
        if (!fullscreenImage) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;
        if (diff > 0) {
            setDragOffset(diff);
        }
    };

    const handleTouchEnd = () => {
        if (dragOffset > 100) { // Dragged down more than 100px
            closeFullscreen();
        } else {
            setDragOffset(0); // Snap back
        }
    };

    // Use formatting for display based on timestamp
    const formatTime = (isoString) => {
        const d = new Date(isoString);
        let h = d.getHours();
        let m = d.getMinutes();
        const ampm = h >= 12 ? '오후' : '오전';
        h = h % 12;
        h = h ? h : 12;
        m = m < 10 ? '0' + m : m;
        return `${ampm} ${h}:${m}`;
    };

    return (
        <>
            {/* Floating Action Button */}
            {!inline && (
                <button className={`chat-fab ${isOpen ? 'open' : ''}`} onClick={toggleChat}>
                {isOpen ? '✕' : '💬'}
                {!isOpen && unreadCount > 0 && (
                    <span className="chat-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>
            )}

            {/* Chat Drawer/Overlay */}
            <div className={`chat-overlay ${isOpen || inline ? 'active' : ''} ${inline ? 'inline' : ''}`}>
                <div className="chat-header">
                    <h2>팀 채팅방</h2>
                    {!inline && <button className="chat-close" onClick={toggleChat}>✕</button>}
                </div>

                <div className="chat-messages">
                    {messages.length === 0 ? (
                        <div className="chat-empty">메시지가 없습니다.</div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.role === role;
                            const isImage = msg.fileType && msg.fileType.startsWith('image/');
                            return (
                                <div key={msg.id || idx} className={`chat-bubble-wrapper ${isMe ? 'mine' : 'theirs'}`}>
                                    {!isMe && <div className="chat-role">{msg.senderName ? `${msg.senderName} (${msg.role})` : msg.role}</div>}
                                    <div className="chat-bubble-row">
                                        <div className={`chat-bubble ${isMe ? 'mine' : 'theirs'}`}>
                                            {msg.fileUrl ? (
                                                <div className="chat-attachment">
                                                    {isImage ? (
                                                        <div onClick={() => openFullscreen(msg)} style={{ cursor: 'pointer' }}>
                                                            <img src={msg.fileUrl} alt={msg.fileName} className="chat-image-preview" />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="chat-file-info">
                                                                <span style={{ fontSize: '1.2rem', marginRight: '6px' }}>📄</span>
                                                                <span className="truncate">{msg.fileName}</span>
                                                            </div>
                                                            <div className="chat-attachment-actions">
                                                                <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noopener noreferrer" className="chat-action-btn download-btn">
                                                                    ⬇️ 다운로드
                                                                </a>
                                                                {isMe && (
                                                                    <button onClick={() => deleteMessage(msg.id)} className="chat-action-btn delete-btn">
                                                                        🗑️ 취소/삭제
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}

                                                    {msg.text && <div style={{ marginTop: '8px' }}>{msg.text}</div>}
                                                </div>
                                            ) : (
                                                msg.text
                                            )}
                                        </div>
                                        <div className="chat-time">{formatTime(msg.timestamp)}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>


                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div style={{ padding: '4px 12px', fontSize: '0.78rem', color: '#aaa', fontStyle: 'italic', minHeight: '22px' }}>
                        {typingUsers.join(', ')}님이 메시지를 작성 중...
                    </div>
                )}

                <form className="chat-input-area" onSubmit={sendMessage}>
                    <button
                        type="button"
                        className="chat-attach-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        📎
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                        accept="image/*,application/pdf"
                    />
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => {
                        setInputValue(e.target.value);
                        const senderName = sessionStorage.getItem('confirmedName') || '익명';
                        if (!isTypingRef.current) {
                            isTypingRef.current = true;
                            socket.emit('typing_start', { name: senderName, role });
                        }
                        clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                            isTypingRef.current = false;
                            socket.emit('typing_stop', { name: senderName, role });
                        }, 2000);
                    }}
                        placeholder={isUploading ? "파일 업로드 중..." : "메시지를 입력하세요..."}
                        className="chat-input"
                        disabled={isUploading}
                    />
                    <button type="submit" className="chat-send-btn" disabled={isUploading}>전송</button>
                </form>
            </div>

            {/* Backdrop to close when clicking outside */}
            {!inline && isOpen && <div className="chat-backdrop" onClick={toggleChat}></div>}

            {/* Fullscreen Image Viewer Modal */}
            {fullscreenImage && (
                <div
                    className="chat-fullscreen-modal"
                    style={{ backgroundColor: `rgba(0, 0, 0, ${Math.max(0, 0.9 - (dragOffset / 500))})` }}
                >
                    <div
                        className="chat-fullscreen-content"
                        style={{ transform: `translateY(${dragOffset}px)` }}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <button className="chat-fullscreen-close" onClick={closeFullscreen}>✕</button>

                        <img
                            src={fullscreenImage.fileUrl}
                            alt={fullscreenImage.fileName}
                            className="chat-fullscreen-img"
                        />

                        {/* Actions overlayed at the bottom of the fullscreen image */}
                        <div className="chat-fullscreen-actions">
                            <a href={fullscreenImage.fileUrl} download={fullscreenImage.fileName} target="_blank" rel="noopener noreferrer" className="chat-action-btn download-btn shadow-strong">
                                ⬇️ 사진 다운로드
                            </a>
                            {fullscreenImage.role === role && (
                                <button onClick={() => deleteMessage(fullscreenImage.id)} className="chat-action-btn delete-btn shadow-strong">
                                    🗑️ 발송 취소 (삭제)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            </>
    );
}
