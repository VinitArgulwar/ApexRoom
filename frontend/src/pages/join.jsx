import React, { useRef, useState } from "react";
import "./join.css";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, getUserId } from "../api";
import { useAuth } from "../context/AuthContext";

const JoinCall = () => {
  const { isAuthenticated } = useAuth();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef([]);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Move to next box
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();

    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pastedData) return;

    const newCode = ["", "", "", "", "", ""];

    pastedData.split("").forEach((digit, index) => {
      newCode[index] = digit;
    });

    setCode(newCode);

    const nextIndex = Math.min(pastedData.length, 5);
    inputsRef.current[nextIndex]?.focus();
  };

  const meetingCode = code.join("");

  const handleJoin = async () => {
    if (meetingCode.length !== 6) {
      return;
    }
    setError("");
    setIsJoining(true);
    try {
      const data = await apiRequest("/api/meetings/join", {
        method: "POST",
        body: JSON.stringify({ meetingId: meetingCode, userId: getUserId() }),
      });
      navigate(`/meet/${data.meetingId}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="join-page">
      {/* Back */}
      <Link to={isAuthenticated ? "/dashboard" : "/"} className="back-button">
        <span>←</span>
        {isAuthenticated ? "Back to dashboard" : "Back to home"}
      </Link>

      <main className="join-container">
        {/* Logo */}
        <div className="join-logo">
          <div className="join-logo-mark">A</div>
          <span>ApexRoom</span>
        </div>

        {/* Card */}
        <div className="join-card">
          <div className="join-icon">
            <span>↗</span>
          </div>

          <p className="join-eyebrow">JOIN A ROOM</p>

          <h1>Ready to join?</h1>

          <p className="join-description">
            Enter the 6-digit meeting code shared by your host to join the
            conversation.
          </p>

          {/* Code Inputs */}
          <div className="code-inputs" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputsRef.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={digit ? "filled" : ""}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <p className="code-hint">
            Your meeting code is 6 digits
          </p>

          {/* Join Button */}
          <button
            className={`join-button ${
              meetingCode.length === 6 ? "enabled" : ""
            }`}
            onClick={handleJoin}
            disabled={meetingCode.length !== 6 || isJoining}
          >
            {isJoining ? "Joining..." : "Join Meeting"}
            <span>→</span>
          </button>

          {error && <p role="alert" className="code-hint">{error}</p>}

          {/* Divider */}
          <div className="join-divider">
            <span>or</span>
          </div>

          <p className="create-text">
            Don't have a meeting code?
          </p>

          <Link to="/new" className="create-button">
            Create a new meeting
          </Link>
        </div>

        <p className="join-footer">
          Secure meetings powered by <strong>ApexRoom</strong>
        </p>
      </main>
    </div>
  );
};

export default JoinCall;
