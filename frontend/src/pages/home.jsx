import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api";
import "./home.css";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const navigate = useNavigate();

  const displayName = user?.name || "Guest";
  const firstName = user?.name ? user.name.split(" ")[0] : "there";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AP";

  useEffect(() => {
    const fetchRecentCalls = async () => {
      if (!user?.id) {
        setLoadingMeetings(false);
        return;
      }

      try {
        const data = await apiRequest(`/api/meetings?userId=${user.id}`);
        if (data?.meetings) {
          setRecentMeetings(data.meetings.slice(0, 4));
        }
      } catch (err) {
        console.error("Error fetching recent meetings:", err);
      } finally {
        setLoadingMeetings(false);
      }
    };

    fetchRecentCalls();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="home-dashboard">
      {/* Top Navbar */}
      <header className="home-topbar">
        <Link to="/" className="home-logo">
          <div className="home-logo-mark">A</div>
          <span>ApexRoom</span>
        </Link>

        <div className="home-top-right">
          {isAuthenticated ? (
            <div className="home-user-profile">
              <div className="home-profile-info">
                <strong>{displayName}</strong>
                <span>{user?.email || "Signed In"}</span>
              </div>
              <div className="home-avatar">{initials}</div>
              <button className="home-logout-btn" onClick={handleLogout} title="Logout">
                Logout
              </button>
            </div>
          ) : (
            <div className="home-auth-btns">
              <Link to="/login" className="home-signin-btn">
                Sign In
              </Link>
              <Link to="/register" className="home-register-btn">
                Create Account
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="home-main">
        {/* Welcome Eyebrow */}
        <div className="home-welcome">
          <p className="eyebrow">
            {isAuthenticated ? "YOUR WORKSPACE" : "VIDEO CONFERENCING"}
          </p>
          <h1>
            {isAuthenticated
              ? `Good to see you, ${firstName}.`
              : "Simple, secure video meetings."}
          </h1>
        </div>

        {/* Hero Action Card Box */}
        <section className="home-hero-card">
          <div className="hero-content">
            <span className="hero-badge">● READY TO CONNECT</span>

            <h2>
              Your next conversation
              <br />
              starts here.
            </h2>

            <p>
              Start a new meeting with a custom title or join an existing room with a 6-digit code.
            </p>

            <div className="hero-actions">
              <Link to={isAuthenticated ? "/new" : "/login"} className="primary-button">
                <span>＋</span>
                New Meeting
              </Link>
              <Link to={isAuthenticated ? "/join" : "/login"} className="secondary-button">
                Join with Code
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section className="home-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">QUICK ACTIONS</p>
              <h3>What would you like to do?</h3>
            </div>
          </div>

          <div className="action-grid">
            <Link to={isAuthenticated ? "/new" : "/login"} className="action-card">
              <div className="action-icon blue">＋</div>
              <div>
                <h4>Start a Meeting</h4>
                <p>Create a room with a custom title.</p>
              </div>
              <span className="arrow">→</span>
            </Link>

            <Link to={isAuthenticated ? "/join" : "/login"} className="action-card">
              <div className="action-icon purple">↗</div>
              <div>
                <h4>Join a Call</h4>
                <p>Enter a meeting using a 6-digit code.</p>
              </div>
              <span className="arrow">→</span>
            </Link>

            <Link to={isAuthenticated ? "/history" : "/login"} className="action-card">
              <div className="action-icon green">◷</div>
              <div>
                <h4>Call History</h4>
                <p>{isAuthenticated ? "View your past meeting logs." : "Sign in to view session history."}</p>
              </div>
              <span className="arrow">→</span>
            </Link>
          </div>
        </section>

        {/* Recent Activity or Guest Banner */}
        <section className="home-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">ACTIVITY</p>
              <h3>{isAuthenticated ? "Recent Calls" : "Meeting History & Insights"}</h3>
            </div>

            {isAuthenticated && recentMeetings.length > 0 && (
              <Link to="/history" className="view-all">
                View all &rarr;
              </Link>
            )}
          </div>

          <div className="history-card">
            {isAuthenticated ? (
              loadingMeetings ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#9ca3af" }}>
                  Loading recent calls...
                </div>
              ) : recentMeetings.length > 0 ? (
                <div className="recent-list">
                  {recentMeetings.map((m) => (
                    <div key={m.id || m.code} className="recent-item">
                      <div className="recent-info">
                        <div className="recent-icon">▣</div>
                        <div>
                          <strong>{m.title}</strong>
                          <span className="recent-meta">
                            Room #{m.code} &bull; {m.date} at {m.time} &bull; {m.duration}
                          </span>
                        </div>
                      </div>
                      <div className="recent-right">
                        <span className={`recent-status-pill ${m.rawStatus || "scheduled"}`}>
                          {m.status}
                        </span>
                        <Link to={`/meet/${m.code}`} className="rejoin-link">
                          {m.rawStatus === "live" ? "Join Now →" : "Reopen →"}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-history">
                  <div className="empty-icon">◷</div>
                  <h4>No recent calls yet</h4>
                  <p>Your created and attended meetings will appear here automatically.</p>
                  <Link to="/new" className="small-button">
                    Start your first call
                  </Link>
                </div>
              )
            ) : (
              <div className="guest-history-prompt">
                <div className="guest-prompt-icon">🔒</div>
                <h4>Sign in to track your meetings</h4>
                <p>
                  Create an account to host moderated meetings, share custom topics, 
                  and access full timestamped call logs.
                </p>
                <div className="guest-prompt-actions">
                  <Link to="/login" className="small-button">
                    Sign In
                  </Link>
                  <Link to="/register" className="small-outline-button">
                    Create Account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <p>&copy; 2026 ApexRoom. Simple, secure video meetings.</p>
      </footer>
    </div>
  );
}
