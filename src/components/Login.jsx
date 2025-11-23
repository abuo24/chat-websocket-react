import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApiService } from '../services/authApiService';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApiService.login({ phone, password });
      const { accessToken } = response.data.data;

      localStorage.setItem('jwtToken', accessToken);
      const userRes = await authApiService.getCurrentUser();
      localStorage.setItem('currentUser', JSON.stringify(userRes));

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid phone or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center px-3">
      <div className="card shadow-lg" style={{ maxWidth: '420px', width: '100%', borderRadius: '20px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className="bi bi-chat-heart-fill text-primary" style={{ fontSize: '3rem' }}></i>
            <h2 className="mt-3 fw-bold text-primary">School Chat</h2>
            <p className="text-muted">Connect with mentors & students</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Phone Number</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-phone"></i>
                </span>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="+998901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Password</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  type="password"
                  className="form-control form-control-lg"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="alert alert-danger d-flex align-items-center">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-100 d-flex align-items-center justify-content-center gap-2"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm"></span>
                  Logging in...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right"></i>
                  Login
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <small className="text-muted">
              Demo: +998901234567 / 123456
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;