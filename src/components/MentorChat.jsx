import React, { useState, useEffect, useRef } from 'react';
import chatWebSocketService from '../services/chatWebSocketService';
import { chatApiService } from '../services/chatApiService';
import { authApiService } from '../services/authApiService';
import { useChatStore } from '../store/chatStore';
import '../styles/chat.css';

const MentorChat = () => {
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [chatRooms, setChatRooms] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const { messages, connected } = useChatStore();
    const messagesEndRef = useRef(null);
    const hasInitialized = useRef(false);

    // Connect to WebSocket - ONLY ONCE
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const jwtToken = localStorage.getItem('jwtToken');
        if (!jwtToken) {
            console.error('No JWT token found');
            return;
        }

        const initializeChat = async () => {
            try {
                // Get current user info first
                const user = await authApiService.getCurrentUser();
                setCurrentUser(user);
                console.log('✅ Current mentor loaded:', user);

                // Check if user has ROLE_MENTOR
                if (!user.isMentor) {
                    console.error('❌ User is not a mentor');
                    alert('Access denied: You must be a mentor to access this chat');
                    return;
                }

                await chatWebSocketService.connect(jwtToken, 'MENTOR', null);
                console.log('✅ Mentor WebSocket connected');
                await loadChatRooms();
            } catch (err) {
                console.error('❌ Connection failed:', err);
                hasInitialized.current = false;
            }
        };

        initializeChat();

        return () => {
            console.log('🔌 Component unmounting, disconnecting WebSocket');
            chatWebSocketService.disconnect();
            hasInitialized.current = false;
        };
    }, []);

    // Listen for new messages and update chat rooms
    useEffect(() => {
        if (messages.length > 0) {
            // Reload chat rooms when new message arrives
            loadChatRooms();
        }
    }, [messages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, selectedStudentId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load all chat rooms with latest messages
    const loadChatRooms = async () => {
        try {
            setLoadingRooms(true);
            const response = await chatApiService.getChatRooms({ page: 0, size: 50 });
            const rooms = response.data?.data?.content || response.data?.data || [];
            setChatRooms(rooms);
            console.log('✅ Loaded chat rooms:', rooms.length);
        } catch (error) {
            console.error('Error loading chat rooms:', error);
        } finally {
            setLoadingRooms(false);
        }
    };

    const handleSelectStudent = async (studentId) => {
        setSelectedStudentId(studentId);
        setLoadingMessages(true);

        try {
            const response = await chatApiService.getConversation(studentId, { page: 0, size: 50 });
            const messageContent = response.data?.data?.content || response.data?.data || [];
            
            // ⭐ IMPORTANT: Reverse messages to show oldest first, latest at bottom
            const reversedMessages = [...messageContent].reverse();
            
            console.log('📨 Loaded messages:', messageContent.length);
            console.log('📊 Message order:', reversedMessages.map(m => ({
                id: m.id,
                sender: m.senderType,
                time: m.createdAt
            })));
            
            useChatStore.setState({
                messages: reversedMessages,
                currentStudentId: studentId
            });

            console.log('🔍 messages:', reversedMessages);

            // Mark messages as read when opening conversation
            messageContent
                .filter(msg => msg.senderType === 'STUDENT' && !msg.isRead)
                .forEach(msg => {
                    chatWebSocketService.markAsRead(msg.id);
                });

            // Reload rooms to update unread count
            await loadChatRooms();
        } catch (error) {
            console.error('Error loading conversation:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!messageText.trim()) {
            alert('Message cannot be empty');
            return;
        }

        if (!connected) {
            alert('Not connected to server');
            return;
        }

        if (!selectedStudentId) {
            alert('Please select a student');
            return;
        }

        if (!currentUser) {
            alert('User information not loaded');
            return;
        }

        setLoading(true);
        try {
            // Prepare message payload with user IDs
            const payload = {
                message: messageText,
                fileUrl: null,
                questionId: null,
                userId: currentUser.userId,
                mentorId: currentUser.mentorId || currentUser.userId
            };

            console.log('📤 Sending message with payload:', payload);

            const sent = chatWebSocketService.sendToStudent(
                selectedStudentId,
                payload.message,
                payload.fileUrl,
                payload.questionId,
                payload
            );

            if (!sent) {
                await chatApiService.sendMessage(payload);
            }

            setMessageText('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } finally {
            setLoading(false);
        }
    };

    const getStudentMessages = () => {
        console.log('🔍 selectedStudentId:', selectedStudentId);
        return messages.filter(m => m.student?.id === selectedStudentId);
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="mentor-chat-container">
            <div className="mentor-chat-header">
                <h2>Mentor Chat</h2>
                <div className={`status ${connected ? 'connected' : 'disconnected'}`}>
                    {connected ? '🟢 Connected' : '🔴 Disconnected'}
                </div>
            </div>

            <div className="mentor-chat-layout">
                {/* Chat Rooms List */}
                <div className="chat-rooms-sidebar">
                    <div className="sidebar-header">
                        <h3>Conversations</h3>
                        <button 
                            onClick={loadChatRooms} 
                            className="refresh-btn"
                            disabled={loadingRooms}
                        >
                            🔄
                        </button>
                    </div>

                    <div className="chat-rooms-list">
                        {loadingRooms ? (
                            <div className="loading">Loading chats...</div>
                        ) : chatRooms.length === 0 ? (
                            <div className="empty-state">No conversations yet</div>
                        ) : (
                            chatRooms.map(room => (
                                <div
                                    key={room.studentId}
                                    className={`chat-room-item ${selectedStudentId === room.studentId ? 'active' : ''} ${room.unreadCount > 0 ? 'unread' : ''}`}
                                    onClick={() => handleSelectStudent(room.studentId)}
                                >
                                    <div className="room-avatar">
                                        {room.student?.firstName?.[0] || 'S'}
                                    </div>
                                    <div className="room-info">
                                        <div className="room-header">
                                            <span className="room-name">
                                                {room.student?.firstName || 'Student'} {room.student?.lastName || room.studentId}
                                            </span>
                                            {room.latestMessage && (
                                                <span className="room-time">
                                                    {formatTime(room.latestMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="room-preview">
                                            {room.latestMessage ? (
                                                <span className={room.unreadCount > 0 ? 'unread-preview' : ''}>
                                                    {room.latestMessage.senderType === 'MENTOR' ? 'You: ' : ''}
                                                    {room.latestMessage.message?.substring(0, 50)}
                                                    {room.latestMessage.message?.length > 50 ? '...' : ''}
                                                </span>
                                            ) : (
                                                <span className="no-messages">No messages yet</span>
                                            )}
                                            {room.unreadCount > 0 && (
                                                <span className="unread-badge">{room.unreadCount}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="chat-area">
                    {!selectedStudentId ? (
                        <div className="empty-state">Select a conversation to start chatting</div>
                    ) : (
                        <>
                            <div className="chat-area-header">
                                <h4>
                                    {chatRooms.find(r => r.studentId === selectedStudentId)?.student?.firstName || 'Student'}{' '}
                                    {chatRooms.find(r => r.studentId === selectedStudentId)?.student?.lastName || selectedStudentId}
                                </h4>
                            </div>

                            <div className="messages-container">
                                {loadingMessages ? (
                                    <div className="loading">Loading conversation...</div>
                                ) : getStudentMessages().length === 0 ? (
                                    <div className="empty-state">No messages with this student</div>
                                ) : (
                                    getStudentMessages().map((msg, idx) => (
                                        <div key={idx} className={`message ${msg.senderType?.toLowerCase() || 'student'}`}>
                                            <div className="message-header">
                                                <strong>
                                                    {msg.senderType === 'MENTOR' ? 'You' : msg.studentName || 'Student'}
                                                </strong>
                                                <span className="timestamp">
                                                    {new Date(msg.createdAt).toLocaleString('en-US', {
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="message-body">{msg.message}</div>
                                            {msg.fileUrl && (
                                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="attachment">
                                                    📎 Attachment
                                                </a>
                                            )}
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form onSubmit={handleSendMessage} className="message-form">
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Type your message..."
                                    disabled={loading || !connected}
                                />
                                <button type="submit" disabled={loading || !connected}>
                                    {loading ? 'Sending...' : 'Send'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MentorChat;