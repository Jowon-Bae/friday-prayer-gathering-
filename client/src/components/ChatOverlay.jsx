import React, { useState, useEffect, useRef } from 'react';
import './ChatOverlay.css';

export default function ChatOverlay({ socket, role }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

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
        };

        const handleDelete = (msgId) => {
            setMessages(prev => prev.filter(m => m.id !== msgId));
        };

        socket.on('chat_history', handleHistory);
        socket.on('chat_message', handleNewMessage);
        socket.on('chat_deleted', handleDelete);

        return () => {
            socket.off('chat_history', handleHistory);
            socket.off('chat_message', handleNewMessage);
            socket.off('chat_deleted', handleDelete);
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

        socket.emit('send_chat', {
            text: inputValue.trim(),
            role: role
        });
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
                role: role
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
            <button className={`chat-fab ${isOpen ? 'open' : ''}`} onClick={toggleChat}>
                {isOpen ? '✕' : '💬'}
                {!isOpen && unreadCount > 0 && (
                    <span className="chat-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {/* Chat Drawer/Overlay */}
            <div className={`chat-overlay ${isOpen ? 'active' : ''}`}>
                <div className="chat-header">
                    <h2>팀 채팅방</h2>
                    <button className="chat-close" onClick={toggleChat}>✕</button>
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
                                    {!isMe && <div className="chat-role">{msg.role}</div>}
                                    <div className="chat-bubble-row">
                                        <div className={`chat-bubble ${isMe ? 'mine' : 'theirs'}`}>
                                            {msg.fileUrl ? (
                                                <div className="chat-attachment">
                                                    {isImage ? (
                                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                                            <img src={msg.fileUrl} alt={msg.fileName} className="chat-image-preview" />
                                                        </a>
                                                    ) : (
                                                        <div className="chat-file-info">
                                                            <span style={{ fontSize: '1.2rem', marginRight: '6px' }}>📄</span>
                                                            <span className="truncate">{msg.fileName}</span>
                                                        </div>
                                                    )}

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
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isUploading ? "파일 업로드 중..." : "메시지를 입력하세요..."}
                        className="chat-input"
                        disabled={isUploading}
                    />
                    <button type="submit" className="chat-send-btn" disabled={isUploading}>전송</button>
                </form>
            </div>

            {/* Backdrop to close when clicking outside */}
            {isOpen && <div className="chat-backdrop" onClick={toggleChat}></div>}
        </>
    );
}
