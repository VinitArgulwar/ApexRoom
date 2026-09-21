import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname && location.state.from.pathname !== "/"
    ? location.state.from.pathname
    : "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Failed to login. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-mark">A</div>
          <span>ApexRoom</span>
        </div>

        <div className="auth-icon">🔒</div>

        <p className="auth-eyebrow">WELCOME BACK</p>
        <h1>Sign In to ApexRoom</h1>
        <p className="auth-description">
          Enter your account details to access your workspace and start meetings.
        </p>

        {error && (
          <div className="auth-error" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email Address
            </label>
            <div className="form-input-wrapper">
              <span className="form-icon">✉</span>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <div className="form-input-wrapper">
              <span className="form-icon">🔑</span>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            <span>{loading ? "Signing in..." : "Sign In"}</span>
            <span>→</span>
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <p className="auth-toggle-text">
          Don't have an account?
          <Link to="/register" className="auth-toggle-link">
            Create an account
          </Link>
        </p>

        <p className="auth-page-footer">
          Secure meetings powered by <strong>ApexRoom</strong>
        </p>
      </div>
    </div>
  );
};

export default Login;
