import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api";
import "./history.css";

const History = () => {
  const { user, logout } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const navigate = useNavigate();

  const displayName = user?.name || "Apex User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const fetchMeetings = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest(`/api/meetings?userId=${user.id}`);
        if (data?.meetings) {
          setMeetings(data.meetings);
        }
      } catch (err) {
        console.error("Failed to load meeting history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Compute live statistics
  const totalCalls = meetings.length;
  const completedCalls = meetings.filter(
    (m) => m.rawStatus === "completed" || m.status === "Completed"
  ).length;
  const totalParticipants = meetings.reduce(
    (acc, m) => acc + (m.participants || 1),
    0
  );

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      (meeting.title && meeting.title.toLowerCase().includes(search.toLowerCase())) ||
      (meeting.code && meeting.code.includes(search)) ||
      (meeting.hostName && meeting.hostName.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter =
      filter === "All" ||
      meeting.status === filter ||
      (meeting.rawStatus && meeting.rawStatus.toLowerCase() === filter.toLowerCase());

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="history-page">
      {/* Sidebar */}
      <aside className="history-sidebar">
        <div className="history-logo">
          <div className="history-logo-mark">A</div>
          <span>ApexRoom</span>
        </div>

        <nav className="history-nav">
          <Link to="/dashboard" className="history-nav-item">
            <span>⌂</span>
            Dashboard
          </Link>

          <Link to="/join" className="history-nav-item">
            <span>↗</span>
            Join Call
          </Link>

          <Link to="/history" className="history-nav-item active">
            <span>◷</span>
            History
          </Link>
        </nav>

        <div className="history-sidebar-bottom">
          <Link to="/dashboard" className="history-nav-item">
            <span>⚙</span>
            Workspace
          </Link>

          <button className="history-nav-item logout" onClick={handleLogout}>
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="history-main">
        {/* Header */}
        <header className="history-header">
          <div>
            <p className="history-eyebrow">YOUR ACTIVITY</p>
            <h1>Call History</h1>
            <p className="history-subtitle">
              View and manage your previous ApexRoom meetings.
            </p>
          </div>

          <div className="history-profile">
            <div className="history-profile-info">
              <strong>{displayName}</strong>
              <span>{user?.email || "Apex Account"}</span>
            </div>

            <div className="history-avatar">{initials}</div>
          </div>
        </header>

        {/* Stats */}
        <section className="history-stats">
          <div className="stat-card">
            <div className="stat-icon">◷</div>
            <div>
              <span>Total Calls</span>
              <strong>{totalCalls}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green-icon">✓</div>
            <div>
              <span>Completed</span>
              <strong>{completedCalls}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple-icon">◉</div>
            <div>
              <span>Active/Live</span>
              <strong>{meetings.filter((m) => m.rawStatus === "live").length}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange-icon">◎</div>
            <div>
              <span>Participants</span>
              <strong>{totalParticipants}</strong>
            </div>
          </div>
        </section>

        {/* History section */}
        <section className="history-content">
          <div className="history-content-header">
            <div>
              <p className="history-eyebrow">MEETINGS</p>
              <h2>All Recorded Meetings</h2>
            </div>

            <Link to="/new" className="export-button" style={{ textDecoration: "none" }}>
              ＋ New Meeting
            </Link>
          </div>

          {/* Search + Filter */}
          <div className="history-tools">
            <div className="search-box">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Search by topic, room code, or host..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-buttons">
              {["All", "Completed", "Live", "Scheduled"].map((item) => (
                <button
                  key={item}
                  className={
                    filter === item
                      ? "filter-button selected"
                      : "filter-button"
                  }
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Meeting Table */}
          <div className="meeting-table">
            <div className="table-head">
              <span>MEETING TOPIC</span>
              <span>DATE & TIME</span>
              <span>DURATION</span>
              <span>PARTICIPANTS</span>
              <span>STATUS</span>
              <span>ACTION</span>
            </div>

            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                Loading meeting history from database...
              </div>
            ) : filteredMeetings.length > 0 ? (
              filteredMeetings.map((meeting) => (
                <div className="meeting-row" key={meeting.id || meeting.code}>
                  <div className="meeting-name">
                    <div className="meeting-icon">▣</div>
                    <div>
                      <strong>{meeting.title || "Quick Meeting"}</strong>
                      <span>Room #{meeting.code} • Host: {meeting.hostName || "Host"}</span>
                    </div>
                  </div>

                  <div className="meeting-date">
                    <strong>{meeting.date}</strong>
                    <span>{meeting.time}</span>
                  </div>

                  <div className="meeting-duration">{meeting.duration}</div>

                  <div className="meeting-participants">
                    <div className="participant-stack">
                      <span>👤</span>
                    </div>
                    <strong>{meeting.participants}</strong>
                  </div>

                  <div>
                    <span
                      className={`status ${
                        meeting.rawStatus === "completed"
                          ? "completed"
                          : meeting.rawStatus === "live"
                          ? "live"
                          : "scheduled"
                      }`}
                    >
                      <i></i>
                      {meeting.status}
                    </span>
                  </div>

                  <div>
                    <Link
                      to={`/meet/${meeting.code}`}
                      className="more-button"
                      style={{
                        textDecoration: "none",
                        fontSize: "12.5px",
                        fontWeight: "600",
                        color: "#4f6ef7",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "rgba(79, 110, 247, 0.08)"
                      }}
                    >
                      {meeting.rawStatus === "live" ? "Join Now" : "Reopen"}
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">
                <div className="no-results-icon">⌕</div>
                <h3>No meetings found</h3>
                <p>
                  {meetings.length === 0
                    ? "You haven't hosted or joined any meetings yet."
                    : "Try changing your search keywords or filter tab."}
                </p>
                {meetings.length === 0 && (
                  <Link
                    to="/new"
                    style={{
                      marginTop: "16px",
                      display: "inline-block",
                      background: "#4f6ef7",
                      color: "#fff",
                      padding: "9px 18px",
                      borderRadius: "10px",
                      textDecoration: "none",
                      fontWeight: "600",
                      fontSize: "13.5px"
                    }}
                  >
                    Start a Meeting
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="history-pagination">
            <span>
              Showing {filteredMeetings.length} of {meetings.length} meetings
            </span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default History;

