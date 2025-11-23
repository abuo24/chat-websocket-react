import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/chats';

class ChatApiService {
    constructor() {
        this.axiosInstance = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Add JWT token to all requests
        this.axiosInstance.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('jwtToken');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
    }

    /**
     * Get all chat rooms for mentor
     * Returns list of students with their latest messages and unread counts
     */
    async getChatRooms(params = { page: 0, size: 20 }) {
        try {
            const response = await this.axiosInstance.get('/room', { params });
            return response;
        } catch (error) {
            console.error('Error fetching chat rooms:', error);
            throw error;
        }
    }

    /**
     * Get all messages for current student
     */
    async getStudentMessages(params = { page: 0, size: 20 }) {
        try {
            const response = await this.axiosInstance.get('/student', { params });
            return response;
        } catch (error) {
            console.error('Error fetching student messages:', error);
            throw error;
        }
    }

    /**
     * Get conversation with specific student
     */
    async getConversation(studentId, params = { page: 0, size: 20 }) {
        try {
            const response = await this.axiosInstance.get(`/${studentId}`, { params });
            return response;
        } catch (error) {
            console.error('Error fetching conversation:', error);
            throw error;
        }
    }

    /**
     * Send message via HTTP (fallback)
     */
    async sendMessage(data) {
        try {
            const response = await this.axiosInstance.post('/student/send', data);
            return response;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
}

export const chatApiService = new ChatApiService();