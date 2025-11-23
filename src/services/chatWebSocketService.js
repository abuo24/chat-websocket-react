import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useChatStore } from '../store/chatStore';

class ChatWebSocketService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    connect(jwtToken, userType, userId) {
        // Prevent multiple connections
        if (this.isConnected && this.client && this.client.connected) {
            console.log('⚠️ Already connected, skipping...');
            return Promise.resolve();
        }

        // If client exists but not connected, clean it up
        if (this.client) {
            console.log('🔄 Cleaning up existing client...');
            try {
                this.client.deactivate();
            } catch (e) {
                console.log('⚠️ Error deactivating client:', e.message);
            }
            this.client = null;
            this.isConnected = false;
        }

        return new Promise((resolve, reject) => {
            try {
                this.client = new Client({
                    // USE SockJS instead of direct WebSocket
                    webSocketFactory: () => {
                        return new SockJS('http://localhost:8080/ws/chat', null, {
                            transports: ['websocket', 'xhr-streaming', 'xhr-polling']
                        });
                    },
                    connectHeaders: {
                        'Authorization': `Bearer ${jwtToken}`,
                        'token': jwtToken // Add as backup
                    },
                    debug: (msg) => console.log('STOMP:', msg),
                    reconnectDelay: 5000,
                    heartbeatIncoming: 4000,
                    heartbeatOutgoing: 4000,
                });

                this.client.onConnect = (frame) => {
                    console.log('✅ Connected to WebSocket', frame);
                    this.isConnected = true;
                    useChatStore.setState({ connected: true, userType });

                    // Small delay to ensure connection is fully established
                    setTimeout(() => {
                        // Subscribe based on user type
                        if (userType === 'MENTOR') {
                            this.subscribeMentorMessages();
                        } else if (userType === 'STUDENT') {
                            this.subscribeStudentMessages(userId);
                        }
                    }, 100);

                    resolve(frame);
                };

                this.client.onStompError = (frame) => {
                    console.error('❌ STOMP Error:', frame);
                    console.error('Error details:', frame.headers, frame.body);
                    this.isConnected = false;
                    useChatStore.setState({ connected: false });
                    reject(frame);
                };

                this.client.onWebSocketError = (event) => {
                    console.error('❌ WebSocket Error:', event);
                };

                this.client.onDisconnect = () => {
                    console.log('❌ Disconnected from WebSocket');
                    this.isConnected = false;
                    useChatStore.setState({ connected: false });
                };

                this.client.activate();
            } catch (error) {
                console.error('❌ WebSocket setup error:', error);
                reject(error);
            }
        });
    }

    // Mentor: receives all messages + read receipts
    subscribeMentorMessages() {
        this.client.subscribe('/topic/mentors', (message) => {
            console.log('New broadcast from /topic/mentors:', message.body);
            try {
                const incoming = JSON.parse(message.body);

                useChatStore.setState((state) => {
                    // Find if message already exists
                    const existingIndex = state.messages.findIndex(m => m.id === incoming.id);

                    if (existingIndex === -1 && !incoming.readTime) {
                        return { messages: [...state.messages, incoming] };
                    } 

                    // Message exists → check if it's a READ UPDATE
                    const existingMsg = state.messages[existingIndex];

                    // Only update if readingTime changed (or became truthy)
                    if (incoming.readingTime && !existingMsg.readingTime) {
                        console.log(`Message ${incoming.id} marked as READ → updating UI`);

                        const updatedMessages = [...state.messages];
                        updatedMessages[existingIndex] = {
                            ...updatedMessages[existingIndex],
                            readingTime: incoming.readingTime,
                            read: true
                        };

                        return { messages: updatedMessages };
                    }

                    // Otherwise: ignore (duplicate new message)
                    return state;
                });
            } catch (e) {
                console.error('Parse error in mentor subscription:', e);
            }
        });
    }

    // Student: receives mentor replies + own read receipts
    subscribeStudentMessages(userId) {
        this.client.subscribe('/topic/student/' + userId, (message) => {
            console.log('New message for student:', message.body);
            try {
                const incoming = JSON.parse(message.body);

                useChatStore.setState((state) => {

                    // Find if message already exists
                    const existingIndex = state.messages.findIndex(m => m.id === incoming.id);

                    if (existingIndex === -1 && !incoming.readTime) {
                        return { messages: [...state.messages, incoming] };
                    } 

                    // Message exists → check if it's a READ UPDATE
                    const existingMsg = state.messages[existingIndex];

                    // Only update if readingTime changed (or became truthy)
                    if (incoming.readingTime && !existingMsg.readingTime) {
                        console.log(`Message ${incoming.id} marked as READ → updating UI`);

                        const updatedMessages = [...state.messages];
                        updatedMessages[existingIndex] = {
                            ...updatedMessages[existingIndex],
                            readingTime: incoming.readingTime,
                            read: true
                        };

                        return { messages: updatedMessages };
                    }

                    // Otherwise: ignore (duplicate new message)
                    return state;
                });
            } catch (e) {
                console.error('Parse error in student subscription:', e);
            }
        });
    }

    // Student sends message to all mentors
    sendToMentors(message, fileUrl = null, questionId = null, additionalData = {}) {
        if (!this.isConnected) {
            console.error('❌ WebSocket not connected');
            return false;
        }

        const payload = {
            message,
            fileUrl,
            questionId,
            userId: additionalData.userId,
            studentId: additionalData.studentId,
            mentorId: additionalData.mentorId
        };

        try {
            this.client.publish({
                destination: '/app/chat.sendToMentors',
                body: JSON.stringify(payload)
            });
            console.log('✅ Message sent to all mentors with payload:', payload);
            return true;
        } catch (error) {
            console.error('❌ Error sending message:', error);
            return false;
        }
    }

    // Mentor sends message to specific student
    sendToStudent(studentId, message, fileUrl = null, questionId = null, additionalData = {}) {
        if (!this.isConnected) {
            console.error('❌ WebSocket not connected');
            return false;
        }

        const payload = {
            message,
            fileUrl,
            questionId,
            userId: additionalData.userId,
            studentId: additionalData.studentId,
            mentorId: additionalData.mentorId
        };

        try {
            this.client.publish({
                destination: `/app/chat.sendToStudent/${studentId}`,
                body: JSON.stringify(payload)
            });
            console.log(`✅ Message sent to student ${studentId} with payload:`, payload);
            return true;
        } catch (error) {
            console.error('❌ Error sending message:', error);
            return false;
        }
    }

    markAsRead(messageId) {
        if (!this.isConnected) return false;

        this.client.publish({
            destination: `/app/chat.markAsRead/${messageId}`,
            body: JSON.stringify({})
        });
        console.log(`Message ${messageId} marked as read`);
        return true;
    }

    // Disconnect
    disconnect() {
        console.log('🔍 disconnect() called from:', new Error().stack);

        if (this.client && this.isConnected) {
            this.client.deactivate();
            console.log('✅ Disconnected from WebSocket');
            this.isConnected = false;
            useChatStore.setState({ connected: false });
        } else {
            console.log('⚠️ disconnect() called but not connected');
        }
    }
}

const chatWebSocketService = new ChatWebSocketService();

export default chatWebSocketService;