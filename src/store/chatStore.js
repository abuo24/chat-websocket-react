import { create } from 'zustand';

const chatStore = create((set) => ({
    messages: [],
    unreadCount: 0,
    connected: false,
    userType: null, // 'STUDENT' or 'MENTOR'
    currentStudentId: null,
    
    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message],
        unreadCount: message.isRead ? state.unreadCount : state.unreadCount + 1
    })),
    
    setMessages: (messages) => set({ messages }),
    setConnected: (connected) => set({ connected }),
    setUserType: (userType) => set({ userType }),
    setCurrentStudentId: (studentId) => set({ currentStudentId: studentId }),
    clearUnread: () => set({ unreadCount: 0 }),
}));

export const useChatStore = chatStore;