import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-vh-100" style={{ background: '#f8f9fa' }}>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark shadow-lg" style={{ background: 'linear-gradient(90deg, #667eea, #764ba2)' }}>
        <div className="container">
          <a className="navbar-brand fw-bold fs-3 d-flex align-items-center gap-2">
            <i className="bi bi-chat-heart-fill"></i>
            School Chat
          </a>
          <button onClick={()=>handleLogout} className="btn btn-outline-light btn-lg">
            <i className="bi bi-box-arrow-right me-2"></i>
            Logout
          </button>
        </div>
      </nav>

      <div className="container py-5">
        <div className="text-center mb-5">
          <h1 className="display-5 fw-bold text-dark">
            Welcome back, <span className="text-primary">{user?.firstName || 'User'}</span>!
          </h1>
          <p className="lead text-muted">Choose what you'd like to do today</p>
        </div>

        <div className="row g-5 justify-content-center">

          {/* Chat Card */}
          {(user?.isStudent || user?.isMentor) && (
            <div className="col-md-6 col-lg-5">
              <div
                className="card border-0 shadow-lg h-100 text-center hover-shadow"
                style={{ borderRadius: '24px', cursor: 'pointer' }}
                onClick={() => navigate('/chat')}
              >
                <div className="card-body p-5 d-flex flex-column justify-content-center">
                  <i className="bi bi-chat-dots-fill text-primary" style={{ fontSize: '4.5rem' }}></i>
                  <h3 className="mt-4 fw-bold text-dark">Open Chat</h3>
                  <p className="text-muted fs-5">
                    {user?.isStudent && user?.isMentor
                      ? "Chat as Student or Mentor"
                      : user?.isStudent
                        ? "Talk to your mentors"
                        : "Help your students"}
                  </p>
                  <button className="btn btn-primary btn-lg mt-3 shadow">
                    <i className="bi bi-arrow-right-circle-fill me-2"></i>
                    Go to Chat
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profile Card */}
          <div className="col-md-6 col-lg-5">
            <div className="card border-0 shadow-lg h-100" style={{ borderRadius: '24px' }}>
              <div className="card-body p-5">
                <h4 className="card-title fw-bold text-success d-flex align-items-center gap-3">
                  <i className="bi bi-person-badge-fill fs-2"></i>
                  Profile Information
                </h4>
                <hr className="my-4" />

                <div className="space-y-4">
                  <div>
                    <strong className="text-muted">Full Name</strong>
                    <p className="fs-5 mb-0">{user?.firstName} {user?.lastName}</p>
                  </div>

                  <div>
                    <strong className="text-muted">Phone Number</strong>
                    <p className="fs-5 mb-0">{user?.phone || '—'}</p>
                  </div>

                  <div>
                    <strong className="text-muted">Account Roles</strong>
                    <div className="mt-3">
                      {user?.roles && user.roles.length > 0 ? (
                        user.roles.map((role, i) => (
                          <span
                            key={i}
                            className={`badge me-2 mb-2 fs-6 ${
                              role.name.includes('STUDENT') ? 'bg-info' : 'bg-success'
                            }`}
                          >
                            {role.name.replace('ROLE_', '')}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted fst-italic">No roles assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;