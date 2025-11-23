import React, { useEffect, useState } from 'react';
import { authApiService } from '../services/authApiService';
import StudentChat from './StudentChat';
import MentorChat from './MentorChat';

/**
 * ChatRouter - Automatically routes users to correct chat interface based on their roles
 * 
 * Checks for:
 * - ROLE_STUDENT → StudentChat
 * - ROLE_MENTOR → MentorChat
 * - Both roles → Shows role selector
 * - No chat roles → Access denied
 */
const ChatRouter = () => {
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadUserAndRoute();
    }, []);

    const loadUserAndRoute = async () => {
        try {
            setLoading(true);
            const user = await authApiService.getCurrentUser();
            setCurrentUser(user);

            console.log('📋 User roles:', user.roles);
            console.log('🎭 Is Student:', user.isStudent);
            console.log('🎓 Is Mentor:', user.isMentor);

            // Auto-route if user has only one chat role
            if (user.isMentor && !user.isStudent) {
                setSelectedRole('MENTOR');
            } else if (user.isStudent && !user.isMentor) {
                setSelectedRole('STUDENT');
            } else if (!user.isMentor && !user.isStudent) {
                setError('You do not have access to the chat system');
            }
            // If both roles, user will select manually

        } catch (err) {
            console.error('Failed to load user:', err);
            setError('Failed to load user information');
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="chat-router-loading">
                <div className="spinner"></div>
                <p>Loading chat...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="chat-router-error">
                <div className="error-icon">⚠️</div>
                <h2>Access Denied</h2>
                <p>{error}</p>
                <button onClick={() => window.location.href = '/dashboard'}>
                    Go to Dashboard
                </button>
            </div>
        );
    }

    // User has both roles - show role selector
    if (currentUser.isMentor && currentUser.isStudent && !selectedRole) {
        return (
            <div className="chat-role-selector">
                <div className="role-selector-container">
                    <h2>Select Your Role</h2>
                    <p>You have multiple roles. How would you like to use the chat?</p>
                    
                    <div className="role-buttons">
                        <button 
                            className="role-button student"
                            onClick={() => setSelectedRole('STUDENT')}
                        >
                            <div className="role-icon">🎓</div>
                            <h3>Student</h3>
                            <p>Chat with mentors</p>
                        </button>

                        <button 
                            className="role-button mentor"
                            onClick={() => setSelectedRole('MENTOR')}
                        >
                            <div className="role-icon">👨‍🏫</div>
                            <h3>Mentor</h3>
                            <p>Respond to students</p>
                        </button>
                    </div>

                    <div className="user-info">
                        Logged in as: <strong>{currentUser.firstName} {currentUser.lastName}</strong>
                    </div>
                </div>
            </div>
        );
    }

    // Route to appropriate chat component
    if (selectedRole === 'MENTOR' || (currentUser.isMentor && !currentUser.isStudent)) {
        return (
            <div className="chat-wrapper">
                {currentUser.isMentor && currentUser.isStudent && (
                    <div className="role-indicator">
                        <span>Viewing as: <strong>Mentor</strong></span>
                        <button 
                            className="switch-role-btn"
                            onClick={() => setSelectedRole(null)}
                        >
                            Switch Role
                        </button>
                    </div>
                )}
                <MentorChat />
            </div>
        );
    }

    if (selectedRole === 'STUDENT' || (currentUser.isStudent && !currentUser.isMentor)) {
        return (
            <div className="chat-wrapper">
                {currentUser.isMentor && currentUser.isStudent && (
                    <div className="role-indicator">
                        <span>Viewing as: <strong>Student</strong></span>
                        <button 
                            className="switch-role-btn"
                            onClick={() => setSelectedRole(null)}
                        >
                            Switch Role
                        </button>
                    </div>
                )}
                <StudentChat />
            </div>
        );
    }

    // Fallback
    return (
        <div className="chat-router-error">
            <div className="error-icon">❌</div>
            <h2>No Chat Access</h2>
            <p>You do not have permission to access the chat system.</p>
        </div>
    );
};

export default ChatRouter;