import React, { useState, useEffect, useRef } from 'react';
import chatWebSocketService from '../services/chatWebSocketService';
import { chatApiService } from '../services/chatApiService';
import { authApiService } from '../services/authApiService';
import { useChatStore } from '../store/chatStore';
import '../styles/chat.css';

const StudentChat = () => {
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const { messages, connected } = useChatStore();
    const messagesEndRef = useRef(null);
    const hasInitialized = useRef(false); // Prevent double initialization

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Connect to WebSocket and load initial messages - ONLY ONCE
    useEffect(() => {
        // Prevent double initialization (React Strict Mode in dev)
        if (hasInitialized.current) {
            return;
        }
        hasInitialized.current = true;

        const jwtToken = localStorage.getItem('jwtToken');
        
        if (!jwtToken) {
            console.error('No JWT token found');
            return;
        }

        // Initialize WebSocket connection
        const initializeChat = async () => {
            try {
                // Get current user info first
                const user = await authApiService.getCurrentUser();
                setCurrentUser(user);
                console.log('✅ Current user loaded:', user);

                // Check if user has ROLE_STUDENT
                if (!user.isStudent) {
                    console.error('❌ User is not a student');
                    alert('Access denied: You must be a student to access this chat');
                    return;
                }

                if (!user.studentId) {
                    console.error('❌ Student ID not found');
                    alert('Student information not found');
                    return;
                }

                await chatWebSocketService.connect(jwtToken, 'STUDENT', user.id);
                console.log('✅ WebSocket connected, loading messages...');
                await loadStudentMessages();
            } catch (err) {
                console.error('❌ Connection failed:', err);
                hasInitialized.current = false; // Allow retry
            }
        };

        initializeChat();

        // Cleanup only on component unmount
        return () => {
            console.log('🔌 Component unmounting, disconnecting WebSocket');
            chatWebSocketService.disconnect();
            hasInitialized.current = false;
        };
    }, []); // ✅ Empty dependency array - run only once!

    const loadStudentMessages = async () => {
        try {
            setLoadingMessages(true);
            const response = await chatApiService.getStudentMessages({ page: 0, size: 50 });
            const messageContent = response.data?.data?.content || response.data?.data || [];
            
            // ⭐ IMPORTANT: Reverse messages to show oldest first, latest at bottom
            const reversedMessages = [...messageContent].reverse();
            
            console.log('📨 Loaded student messages:', messageContent.length);
            console.log('📊 Message order:', reversedMessages.map(m => ({
                id: m.id,
                sender: m.senderType,
                time: m.createdAt
            })));
            
            useChatStore.setState({ messages: reversedMessages });
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
                studentId: currentUser.studentId
            };

            console.log('📤 Sending message with payload:', payload);

            // Try WebSocket first
            const sent = chatWebSocketService.sendToMentors(
                payload.message,
                payload.fileUrl,
                payload.questionId,
                payload
            );
            
            if (!sent) {
                // Fallback to HTTP
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

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h2>Chat with Mentors</h2>
                <div className={`status ${connected ? 'connected' : 'disconnected'}`}>
                    {connected ? '🟢 Connected' : '🔴 Disconnected'}
                </div>
            </div>

            <div className="messages-container">
                {loadingMessages ? (
                    <div className="loading">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="empty-state">No messages yet</div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} className={`message ${msg.senderType?.toLowerCase() || 'student'}`}>
                            <div className="message-header">
                                <strong>
                                    {msg.senderType === 'MENTOR' ? msg.mentorName || 'Mentor' : 'You'}
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
                            {msg.isRead && msg.senderType === 'MENTOR' && (
                                <span className="read-status">✓ Read</span>
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
        </div>
    );
};

export default StudentChat;