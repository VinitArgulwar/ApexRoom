import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, getUserId } from "../api";
import { useAuth } from "../context/AuthContext";
import "./new.css";

const NewMeeting = () => {
  const [meeting, setMeeting] = useState(null);
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const generateMeeting = async () => {
    setError("");
    setIsCreating(true);
    try {
      const data = await apiRequest("/api/meetings", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || "Quick Meeting",
          hostId: user?.id || getUserId(),
          hostName: user?.name || "Host"
        }),
      });
      setMeeting({
        code: data.meetingId,
        title: data.title || title.trim() || "Quick Meeting",
        link: `${window.location.origin}/meet/${data.meetingId}`
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Copy meeting link
  const copyLink = async () => {
    if (!meeting) return;
    await navigator.clipboard.writeText(meeting.link);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // Creator directly joins the meeting
  const joinMeeting = () => {
    if (!meeting) return;
    navigate(`/meet/${meeting.code}`);
  };

  return (
    <div className="new-meeting-page">
      {/* Back */}
      <Link to="/dashboard" className="meeting-back">
        <span>←</span>
        Back to dashboard
      </Link>

      <main className="new-meeting-container">
        {/* Logo */}
        <div className="meeting-logo">
          <div className="meeting-logo-mark">A</div>
          <span>ApexRoom</span>
        </div>

        {!meeting ? (
          /* =====================================
             CREATE MEETING
          ===================================== */
          <div className="new-meeting-card">
            <div className="meeting-icon">◉</div>

            <p className="meeting-eyebrow">NEW MEETING</p>

            <h1>Start a conversation.</h1>

            <p className="meeting-description">
              Create a private meeting room and invite others with a secure meeting link.
            </p>

            {/* Custom Meeting Title Input */}
            <div className="meeting-title-input-group">
              <label htmlFor="meeting-title-input" className="title-input-label">
                Meeting Title / Topic
              </label>
              <div className="title-input-wrapper">
                <span className="title-input-icon">✎</span>
                <input
                  id="meeting-title-input"
                  type="text"
                  className="meeting-title-input"
                  placeholder="e.g. Design Review, Sprint Planning (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={60}
                />
              </div>
            </div>

            {/* Generate */}
            <button
              className="generate-button"
              onClick={generateMeeting}
              disabled={isCreating}
            >
              <span className="button-icon">＋</span>

              <span className="button-content">
                <strong>
                  {isCreating ? "Creating meeting..." : "Generate meeting link"}
                </strong>
                <small>Create a new room with custom title</small>
              </span>

              <span className="button-arrow">→</span>
            </button>

            {error && <p role="alert" className="meeting-error-text">{error}</p>}

            {/* Divider */}
            <div className="meeting-divider">
              <span>OR</span>
            </div>

            {/* Join */}
            <Link to="/join" className="join-existing-button">
              <span className="join-existing-icon">↗</span>

              <span className="button-content">
                <strong>Join an existing meeting</strong>
                <small>Enter a 6-digit meeting code</small>
              </span>

              <span className="button-arrow">→</span>
            </Link>
          </div>
        ) : (
          /* =====================================
             MEETING CREATED
          ===================================== */
          <div className="meeting-created-card">
            <div className="success-icon">✓</div>

            <p className="meeting-eyebrow">MEETING READY</p>

            <h1>{meeting.title}</h1>

            <p className="meeting-description">
              Share the meeting link with your participants, or join the room directly.
            </p>

            {/* Meeting Code */}
            <div className="meeting-code-container">
              <span>MEETING CODE</span>

              <div className="meeting-code">
                {meeting.code.split("").map((digit, index) => (
                  <span key={index}>{digit}</span>
                ))}
              </div>
            </div>

            {/* Meeting Link */}
            <div className="meeting-link-container">
              <div className="meeting-link-info">
                <span>MEETING LINK</span>
                <strong>{meeting.link}</strong>
              </div>

              <button className="copy-button" onClick={copyLink}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Direct Join */}
            <button className="creator-join-button" onClick={joinMeeting}>
              <span>Join meeting now</span>
              <strong>→</strong>
            </button>

            {/* Back */}
            <button
              className="create-another-button"
              onClick={() => {
                setMeeting(null);
                setTitle("");
              }}
            >
              ← Create another meeting
            </button>
          </div>
        )}

        {/* Security */}
        <div className="meeting-security">
          <span>●</span>
          Your meetings are private and secure
        </div>
      </main>
    </div>
  );
};

export default NewMeeting;

