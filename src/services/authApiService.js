import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/auth';

class AuthApiService {
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
     * Get current authenticated user information
     * Returns CurrentUserDto with user, student, mentor, seller, director, etc.
     */
    async getCurrentUser() {
        try {
            const response = await this.axiosInstance.get('/me');
            const currentUser = response.data?.data || response.data;
            
            // Process and normalize the user data
            return this.normalizeUserData(currentUser);
        } catch (error) {
            console.error('Error fetching current user:', error);
            throw error;
        }
    }

    /**
     * Normalize user data and extract role-specific IDs
     */
    normalizeUserData(currentUser) {
        const normalized = {
            // User basic info
            userId: currentUser.id,
            id: currentUser.id,
            phone: currentUser.phone,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            middleName: currentUser.middleName,
            entityStatus: currentUser.entityStatus,
            roles: currentUser.roles || [],
            
            // Device info
            currentDevice: currentUser.currentDevice,
            devices: currentUser.devices,
            
            // Role-specific data
            student: currentUser.student,
            mentor: currentUser.mentor,
            seller: currentUser.seller,
            director: currentUser.director,
            
            // Extract IDs
            studentId: currentUser.student?.id,
            mentorId: currentUser.mentor?.id,
            sellerId: currentUser.seller?.id,
            directorId: currentUser.director?.id
        };

        // Determine user type based on roles
        normalized.userType = this.getUserType(normalized.roles);
        normalized.isStudent = this.hasRole(normalized.roles, 'ROLE_STUDENT');
        normalized.isMentor = this.hasRole(normalized.roles, 'ROLE_MENTOR');
        normalized.isSeller = this.hasRole(normalized.roles, 'ROLE_SELLER');
        normalized.isDirector = this.hasRole(normalized.roles, 'ROLE_DIRECTOR');

        return normalized;
    }

    /**
     * Check if user has specific role
     */
    hasRole(roles, roleName) {
        if (!roles || !Array.isArray(roles)) return false;
        return roles.some(role => 
            role === roleName || 
            role.name === roleName ||
            role.role === roleName
        );
    }

    /**
     * Get primary user type (for WebSocket connection)
     */
    getUserType(roles) {
        if (this.hasRole(roles, 'ROLE_MENTOR')) return 'MENTOR';
        if (this.hasRole(roles, 'ROLE_STUDENT')) return 'STUDENT';
        if (this.hasRole(roles, 'ROLE_SELLER')) return 'SELLER';
        if (this.hasRole(roles, 'ROLE_DIRECTOR')) return 'DIRECTOR';
        return 'USER';
    }

    /**
     * Login
     */
    async login(credentials) {
        try {
            const response = await this.axiosInstance.post('/login', credentials);
            const data = response.data?.data || response.data;
            
            // Save token
            if (data.token) {
                localStorage.setItem('jwtToken', data.token);
            }
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
}

export const authApiService = new AuthApiService();