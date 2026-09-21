import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api";
import "./dashboard.css";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const navigate = useNavigate();

  const displayName = user?.name || "Apex User";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">A</div>
          <span>ApexRoom</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-item active">
            <span>⌂</span>
            Dashboard
          </Link>

          <Link to="/join" className="nav-item">
            <span>↗</span>
            Join Call
          </Link>

          <Link to="/history" className="nav-item">
            <span>◷</span>
            History
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <Link to="/history" className="nav-item">
            <span>⚙</span>
            Activity Log
          </Link>

          <button className="nav-item logout" onClick={handleLogout}>
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h1>Good to see you, {firstName}.</h1>
          </div>

          <div className="profile">
            <div className="profile-info">
              <strong>{displayName}</strong>
              <span>{user?.email || "Apex Account"}</span>
            </div>

            <div className="avatar">{initials}</div>
          </div>
        </header>

        {/* Hero Card Box */}
        <section className="hero-card">
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
              <Link to="/new" className="primary-button">
                <span>＋</span>
                New Meeting
              </Link>
              <Link to="/join" className="secondary-button">
                Join with Code
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">QUICK ACTIONS</p>
              <h3>What would you like to do?</h3>
            </div>
          </div>

          <div className="action-grid">
            <Link to="/new" className="action-card">
              <div className="action-icon blue">＋</div>
              <div>
                <h4>Start a Meeting</h4>
                <p>Set a custom topic and invite others.</p>
              </div>

              <span className="arrow">→</span>
            </Link>

            <Link to="/join" className="action-card">
              <div className="action-icon purple">↗</div>

              <div>
                <h4>Join a Call</h4>
                <p>Enter a meeting using a room code.</p>
              </div>

              <span className="arrow">→</span>
            </Link>

            <Link to="/history" className="action-card">
              <div className="action-icon green">◷</div>

              <div>
                <h4>Call History</h4>
                <p>View your previous meeting logs.</p>
              </div>

              <span className="arrow">→</span>
            </Link>
          </div>
        </section>

        {/* Recent Calls */}
        <section className="section recent-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">RECENT ACTIVITY</p>
              <h3>Recent calls</h3>
            </div>

            <Link to="/history" className="view-all">View all →</Link>
          </div>

          <div className="history-card">
            {loadingMeetings ? (
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
                          Room #{m.code} • {m.date} at {m.time} • {m.duration}
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

                <h4>No recent calls</h4>

                <p>Your created and attended meetings will appear here automatically.</p>

                <Link to="/new" className="small-button">
                  Start your first call
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;

