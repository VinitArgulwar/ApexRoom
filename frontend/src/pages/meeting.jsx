import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../socket";
import { apiRequest, getUserId } from "../api";
import { useAuth } from "../context/AuthContext";
import "./meeting.css";

function Meeting() {
    const { user } = useAuth();
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    const peerRef = useRef(null);
    const localStreamRef = useRef(null);
    const candidateQueueRef = useRef([]);
    const screenStreamRef = useRef(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isRemoteMuted, setIsRemoteMuted] = useState(false);
    const [isRemoteCameraOff, setIsRemoteCameraOff] = useState(false);
    const [hasRemoteParticipant, setHasRemoteParticipant] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [meetingStatus, setMeetingStatus] = useState("scheduled");
    const [isHost, setIsHost] = useState(false);

    // Join Flow States: 'loading' | 'name_entry' | 'waiting' | 'rejected' | 'joined' | 'error'
    const [joinStage, setJoinStage] = useState("loading");
    const [meetingTitle, setMeetingTitle] = useState("Quick Meeting");
    const [userName, setUserName] = useState(() => user?.name || localStorage.getItem("apexroom-user-name") || "");
    const [remoteUserName, setRemoteUserName] = useState("Remote Participant");
    const [pendingRequests, setPendingRequests] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");

    const { meetingId } = useParams();
    const navigate = useNavigate();

    const stopScreenShare = async () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
        }

        try {
            const cameraStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            const cameraTrack = cameraStream.getVideoTracks()[0];
            const sender = peerRef.current
                ?.getSenders()
                .find((s) => s.track?.kind === "video");

            if (sender) {
                await sender.replaceTrack(cameraTrack);
            }

            const oldStream = localStreamRef.current;
            const audioTracks = oldStream ? oldStream.getAudioTracks() : [];

            const updatedStream = new MediaStream([
                ...audioTracks,
                cameraTrack
            ]);

            localStreamRef.current = updatedStream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = updatedStream;
            }
        } catch (err) {
            console.error("Error restoring camera after screen share:", err);
        }

        setIsScreenSharing(false);
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            await stopScreenShare();
            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true
            });

            screenStreamRef.current = screenStream;
            const screenTrack = screenStream.getVideoTracks()[0];

            const sender = peerRef.current
                ?.getSenders()
                .find((s) => s.track?.kind === "video");

            if (sender) {
                await sender.replaceTrack(screenTrack);
            }

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = screenStream;
            }

            setIsScreenSharing(true);

            screenTrack.onended = () => {
                stopScreenShare();
            };

        } catch (error) {
            console.error("Error sharing screen:", error);
            setIsScreenSharing(false);
        }
    };

    const leaveMeeting = async () => {
        if (isHost) {
            try {
                const data = await apiRequest(`/api/meetings/${meetingId}/end`, {
                    method: "PATCH",
                    body: JSON.stringify({ hostId: getUserId() })
                });
                if (data?.meeting?.status) {
                    setMeetingStatus(data.meeting.status);
                }
            } catch (error) {
                console.error("Unable to end meeting:", error);
            }
        }

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }

        socket.emit("leave-room", meetingId);
        socket.disconnect();
        navigate("/dashboard");
    };

    const toggleMute = async () => {
        const stream = localStreamRef.current;
        if (!stream) return;

        const audioTrack = stream.getAudioTracks()[0];

        // MICROPHONE OFF
        if (!isMuted) {
            if (audioTrack) audioTrack.stop();

            setIsMuted(true);
            socket.emit("mic-status", {
                meetingId,
                isMuted: true
            });
            return;
        }

        // MICROPHONE ON
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            });

            const newAudioTrack = newStream.getAudioTracks()[0];

            const sender = peerRef.current
                ?.getSenders()
                .find((s) => s.track?.kind === "audio");

            if (sender) {
                await sender.replaceTrack(newAudioTrack);
            }

            const oldStream = localStreamRef.current;
            const videoTracks = oldStream ? oldStream.getVideoTracks() : [];

            const updatedStream = new MediaStream([
                ...videoTracks,
                newAudioTrack
            ]);

            localStreamRef.current = updatedStream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = updatedStream;
            }

            socket.emit("mic-status", {
                meetingId,
                isMuted: false
            });
            setIsMuted(false);

        } catch (error) {
            console.error("Error turning microphone back on:", error);
        }
    };

    const toggleCamera = async () => {
        const stream = localStreamRef.current;
        if (!stream) return;

        const videoTrack = stream.getVideoTracks()[0];

        // CAMERA OFF
        if (!isCameraOff) {
            if (videoTrack) videoTrack.stop();

            setIsCameraOff(true);
            socket.emit("camera-status", {
                meetingId,
                isCameraOff: true
            });
            return;
        }

        // CAMERA ON
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            const newVideoTrack = newStream.getVideoTracks()[0];

            const sender = peerRef.current
                ?.getSenders()
                .find((s) => s.track?.kind === "video");

            if (sender) {
                await sender.replaceTrack(newVideoTrack);
            }

            const oldStream = localStreamRef.current;
            const audioTracks = oldStream ? oldStream.getAudioTracks() : [];

            const updatedStream = new MediaStream([
                ...audioTracks,
                newVideoTrack
            ]);

            localStreamRef.current = updatedStream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = updatedStream;
            }

            socket.emit("camera-status", {
                meetingId,
                isCameraOff: false
            });

            setIsCameraOff(false);

        } catch (error) {
            console.error("Error turning camera back on:", error);
        }
    };

    // Helper to start WebRTC session and media stream
    const startWebRTCSession = async (currentUserName) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            localStreamRef.current = stream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            const peer = new RTCPeerConnection({
                iceServers: [
                    {
                        urls: "stun:stun.l.google.com:19302"
                    }
                ]
            });

            peerRef.current = peer;

            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("ice-candidate", {
                        meetingId,
                        candidate: event.candidate
                    });
                }
            };

            peer.ontrack = (event) => {
                if (remoteVideoRef.current && event.streams && event.streams[0]) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                    setHasRemoteParticipant(true);

                    const videoTrack = event.streams[0].getVideoTracks()[0];
                    if (videoTrack) {
                        videoTrack.onmute = () => setIsRemoteCameraOff(true);
                        videoTrack.onunmute = () => setIsRemoteCameraOff(false);
                    }
                }
            };

            stream.getTracks().forEach((track) => {
                peer.addTrack(track, stream);
            });

            if (!socket.connected) socket.connect();
            socket.emit("join-room", { meetingId, userName: currentUserName });
            socket.emit("camera-status", { meetingId, isCameraOff });
            socket.emit("mic-status", { meetingId, isMuted });

        } catch (error) {
            console.error("Error starting media/WebRTC:", error);
        }
    };

    // Initial check: determine if user is host or participant
    useEffect(() => {
        let isMounted = true;

        const checkMeeting = async () => {
            try {
                const meetingData = await apiRequest(`/api/meetings/${meetingId}`);
                const currentMeeting = meetingData.meeting;

                if (!currentMeeting) {
                    throw new Error("Meeting not found.");
                }

                if (["completed", "cancelled"].includes(currentMeeting.status)) {
                    throw new Error(`This meeting has been ${currentMeeting.status}.`);
                }

                if (currentMeeting.title) {
                    setMeetingTitle(currentMeeting.title);
                }

                setMeetingStatus(currentMeeting.status);
                const userIsHost = currentMeeting.hostId === getUserId();
                setIsHost(userIsHost);

                if (userIsHost) {
                    // Host enters directly
                    const joinedMeeting = await apiRequest("/api/meetings/join", {
                        method: "POST",
                        body: JSON.stringify({ meetingId, userId: getUserId() })
                    });
                    if (joinedMeeting?.status) setMeetingStatus(joinedMeeting.status);

                    if (isMounted) {
                        setJoinStage("joined");
                        await startWebRTCSession(user?.name || "Host");
                    }
                } else {
                    // Participant must enter name and request admission
                    if (isMounted) {
                        setJoinStage("name_entry");
                    }
                }
            } catch (err) {
                console.error("Check meeting error:", err);
                if (isMounted) {
                    setErrorMessage(err.message || "Unable to join meeting");
                    setJoinStage("error");
                }
            }
        };

        checkMeeting();

        return () => {
            isMounted = false;
        };
    }, [meetingId]);

    // Socket event listeners for signaling and join requests
    useEffect(() => {
        const handleUserJoined = async (data) => {
            console.log("User joined the room:", data);
            setHasRemoteParticipant(true);
            if (data?.userName) {
                setRemoteUserName(data.userName);
            }

            // Sync current camera and mic state with newly joined participant
            socket.emit("camera-status", {
                meetingId,
                isCameraOff
            });
            socket.emit("mic-status", {
                meetingId,
                isMuted
            });

            const peer = peerRef.current;
            if (!peer) return;

            try {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);

                socket.emit("offer", {
                    meetingId,
                    offer
                });
            } catch (err) {
                console.error("Error creating offer:", err);
            }
        };

        const handleOffer = async (offer) => {
            const peer = peerRef.current;
            if (!peer) return;

            try {
                await peer.setRemoteDescription(new RTCSessionDescription(offer));

                while (candidateQueueRef.current.length > 0) {
                    const queuedCandidate = candidateQueueRef.current.shift();
                    await peer.addIceCandidate(new RTCIceCandidate(queuedCandidate));
                }

                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);

                socket.emit("answer", {
                    meetingId,
                    answer
                });
            } catch (err) {
                console.error("Error handling offer:", err);
            }
        };

        const handleAnswer = async (answer) => {
            const peer = peerRef.current;
            if (!peer) return;

            try {
                await peer.setRemoteDescription(new RTCSessionDescription(answer));

                while (candidateQueueRef.current.length > 0) {
                    const queuedCandidate = candidateQueueRef.current.shift();
                    await peer.addIceCandidate(new RTCIceCandidate(queuedCandidate));
                }
            } catch (err) {
                console.error("Error handling answer:", err);
            }
        };

        const handleIceCandidate = async (candidate) => {
            const peer = peerRef.current;

            if (!peer || !peer.remoteDescription) {
                candidateQueueRef.current.push(candidate);
                return;
            }

            try {
                await peer.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error("Error adding ICE candidate:", err);
            }
        };

        const handleUserLeft = () => {
            console.log("Remote user left");
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
            setHasRemoteParticipant(false);
            setIsRemoteCameraOff(false);
            setIsRemoteMuted(false);
            setRemoteUserName("Remote Participant");
        };

        const handleCameraStatus = ({ isCameraOff: remoteOff }) => {
            setIsRemoteCameraOff(Boolean(remoteOff));
        };

        const handleMicStatus = ({ isMuted: remoteMuted }) => {
            setIsRemoteMuted(Boolean(remoteMuted));
        };

        // Host receives a knock/request from a participant
        const handleJoinRequest = (requestData) => {
            console.log("Incoming join request:", requestData);
            setPendingRequests((prev) => {
                const exists = prev.some((r) => r.participantSocketId === requestData.participantSocketId);
                if (exists) return prev;
                return [...prev, requestData];
            });
        };

        // Participant cancelled their request
        const handleJoinRequestCancelled = ({ participantSocketId }) => {
            setPendingRequests((prev) =>
                prev.filter((r) => r.participantSocketId !== participantSocketId)
            );
        };

        // Participant admitted by host
        const handleJoinAccepted = async () => {
            try {
                const joinedMeeting = await apiRequest("/api/meetings/join", {
                    method: "POST",
                    body: JSON.stringify({ meetingId, userId: getUserId() })
                });
                if (joinedMeeting?.status) setMeetingStatus(joinedMeeting.status);

                setJoinStage("joined");
                await startWebRTCSession(userName.trim() || "Participant");
            } catch (error) {
                console.error("Error joining meeting after admit:", error);
                setErrorMessage("Failed to enter room. Please try again.");
                setJoinStage("error");
            }
        };

        // Participant rejected by host
        const handleJoinRejected = () => {
            setJoinStage("rejected");
            socket.disconnect();
        };

        socket.on("user-joined", handleUserJoined);
        socket.on("offer", handleOffer);
        socket.on("answer", handleAnswer);
        socket.on("ice-candidate", handleIceCandidate);
        socket.on("user-left", handleUserLeft);
        socket.on("camera-status", handleCameraStatus);
        socket.on("mic-status", handleMicStatus);

        socket.on("join-request", handleJoinRequest);
        socket.on("join-request-cancelled", handleJoinRequestCancelled);
        socket.on("join-accepted", handleJoinAccepted);
        socket.on("join-rejected", handleJoinRejected);

        return () => {
            socket.off("user-joined", handleUserJoined);
            socket.off("offer", handleOffer);
            socket.off("answer", handleAnswer);
            socket.off("ice-candidate", handleIceCandidate);
            socket.off("user-left", handleUserLeft);
            socket.off("camera-status", handleCameraStatus);
            socket.off("mic-status", handleMicStatus);

            socket.off("join-request", handleJoinRequest);
            socket.off("join-request-cancelled", handleJoinRequestCancelled);
            socket.off("join-accepted", handleJoinAccepted);
            socket.off("join-rejected", handleJoinRejected);

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
                localStreamRef.current = null;
            }

            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((track) => track.stop());
                screenStreamRef.current = null;
            }

            if (peerRef.current) {
                peerRef.current.close();
                peerRef.current = null;
            }
        };
    }, [meetingId, userName]);

    // Participant submits name to request entry
    const handleAskToJoin = (e) => {
        e.preventDefault();
        const trimmed = userName.trim();
        if (!trimmed) return;

        localStorage.setItem("apexroom-user-name", trimmed);

        if (!socket.connected) socket.connect();
        socket.emit("request-to-join", {
            meetingId,
            userName: trimmed,
            userId: getUserId()
        });

        setJoinStage("waiting");
    };

    // Participant cancels their request while in waiting room
    const handleCancelRequest = () => {
        socket.emit("cancel-join-request", { meetingId });
        socket.disconnect();
        setJoinStage("name_entry");
    };

    // Host admits a participant
    const handleAdmit = (req) => {
        socket.emit("accept-join", {
            participantSocketId: req.participantSocketId,
            meetingId
        });
        setPendingRequests((prev) =>
            prev.filter((r) => r.participantSocketId !== req.participantSocketId)
        );
    };

    // Host rejects a participant
    const handleReject = (req) => {
        socket.emit("reject-join", {
            participantSocketId: req.participantSocketId,
            meetingId
        });
        setPendingRequests((prev) =>
            prev.filter((r) => r.participantSocketId !== req.participantSocketId)
        );
    };

    // -------------------------------------------------------------
    // RENDER: LOADING VIEW
    // -------------------------------------------------------------
    if (joinStage === "loading") {
        return (
            <div className="meeting-page meeting-center-page">
                <div className="meeting-ambient-glow glow-top"></div>
                <div className="meeting-ambient-glow glow-bottom"></div>
                <div className="waiting-card">
                    <div className="radar-spinner"></div>
                    <h2>Connecting to ApexRoom...</h2>
                    <p className="waiting-subtitle">Checking room status and permissions</p>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: NAME ENTRY VIEW (Before requesting entry)
    // -------------------------------------------------------------
    if (joinStage === "name_entry") {
        return (
            <div className="meeting-page meeting-center-page">
                <div className="meeting-ambient-glow glow-top"></div>
                <div className="meeting-ambient-glow glow-bottom"></div>

                <div className="join-form-card">
                    <div className="join-card-header">
                        <div className="meeting-logo-mark">A</div>
                        <h2>{meetingTitle || "Join ApexRoom"}</h2>
                        <span className="room-pill">Room #{meetingId}</span>
                    </div>

                    <form onSubmit={handleAskToJoin} className="name-entry-form">
                        <label htmlFor="user-name-input" className="input-label">
                            Enter Your Name
                        </label>
                        <div className="input-field-wrapper">
                            <span className="input-icon">👤</span>
                            <input
                                id="user-name-input"
                                type="text"
                                className="name-input"
                                placeholder="e.g. Alex Smith"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                        <p className="input-hint">
                            The host will see your name and approve your entry.
                        </p>

                        <button
                            type="submit"
                            className="primary-join-btn"
                            disabled={!userName.trim()}
                        >
                            <span>Ask to Join</span>
                            <span className="btn-arrow">→</span>
                        </button>
                    </form>

                    <button
                        type="button"
                        className="text-back-btn"
                        onClick={() => navigate("/dashboard")}
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: WAITING ROOM VIEW (Waiting for host admission)
    // -------------------------------------------------------------
    if (joinStage === "waiting") {
        return (
            <div className="meeting-page meeting-center-page">
                <div className="meeting-ambient-glow glow-top"></div>
                <div className="meeting-ambient-glow glow-bottom"></div>

                <div className="waiting-card">
                    <div className="radar-wrapper">
                        <div className="radar-circle circle-1"></div>
                        <div className="radar-circle circle-2"></div>
                        <div className="radar-circle circle-3"></div>
                        <div className="radar-core">👤</div>
                    </div>

                    <h2>Waiting for Host to Admit You</h2>
                    <p className="waiting-subtitle">
                        Hi <strong>{userName}</strong>, you’re in the waiting room. The meeting host has been notified of your request.
                    </p>

                    <div className="room-info-pill">
                        <span className="live-indicator"></span>
                        <span>Meeting: <strong>{meetingId}</strong></span>
                    </div>

                    <button
                        className="cancel-request-btn"
                        onClick={handleCancelRequest}
                    >
                        Cancel Request
                    </button>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: REJECTED VIEW
    // -------------------------------------------------------------
    if (joinStage === "rejected") {
        return (
            <div className="meeting-page meeting-center-page">
                <div className="meeting-ambient-glow glow-top"></div>
                <div className="meeting-ambient-glow glow-bottom"></div>

                <div className="waiting-card error-card">
                    <div className="denied-icon-badge">✕</div>
                    <h2>Admission Request Denied</h2>
                    <p className="waiting-subtitle">
                        The host declined your request to join this meeting room.
                    </p>

                    <button
                        className="primary-join-btn"
                        onClick={() => navigate("/dashboard")}
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: ERROR VIEW
    // -------------------------------------------------------------
    if (joinStage === "error") {
        return (
            <div className="meeting-page meeting-center-page">
                <div className="meeting-ambient-glow glow-top"></div>
                <div className="meeting-ambient-glow glow-bottom"></div>

                <div className="waiting-card error-card">
                    <div className="denied-icon-badge">⚠️</div>
                    <h2>Unable to Join Meeting</h2>
                    <p className="waiting-subtitle">{errorMessage || "An unexpected error occurred."}</p>

                    <button
                        className="primary-join-btn"
                        onClick={() => navigate("/dashboard")}
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: ACTIVE MEETING ROOM
    // -------------------------------------------------------------
    return (
        <div className="meeting-page">
            {/* Ambient background glow */}
            <div className="meeting-ambient-glow glow-top"></div>
            <div className="meeting-ambient-glow glow-bottom"></div>

            {/* Host Knocking Notification Banner / Popups */}
            {isHost && pendingRequests.length > 0 && (
                <div className="host-knocking-container">
                    {pendingRequests.map((req) => (
                        <div key={req.participantSocketId} className="knocking-card">
                            <div className="knocking-info">
                                <div className="knocking-avatar">👤</div>
                                <div>
                                    <h4 className="knocking-name">{req.userName}</h4>
                                    <p className="knocking-sub">wants to join this meeting</p>
                                </div>
                            </div>
                            <div className="knocking-actions">
                                <button
                                    className="admit-btn"
                                    onClick={() => handleAdmit(req)}
                                    title="Admit participant"
                                >
                                    ✓ Admit
                                </button>
                                <button
                                    className="deny-btn"
                                    onClick={() => handleReject(req)}
                                    title="Deny entry"
                                >
                                    ✕ Deny
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Top Bar Header */}
            <header className="meeting-header">
                <div className="meeting-header-brand">
                    <div className="meeting-logo-mark">A</div>
                    <span className="meeting-logo-text">ApexRoom</span>
                </div>

                <div className="meeting-room-badge">
                    <span className="live-indicator"></span>
                    <span className="room-label">{meetingTitle}</span>
                    <span className="room-code">#{meetingId}</span>
                    <span className="room-status-tag">{isHost ? "Host" : meetingStatus}</span>
                </div>

                <div className="meeting-header-actions">
                    <button className="leave-btn" onClick={leaveMeeting}>
                        <span className="leave-btn-icon">✕</span>
                        <span>{isHost ? "End Meeting" : "Leave Meeting"}</span>
                    </button>
                </div>
            </header>

            {/* Video Stage */}
            <main className="meeting-stage">
                <div className="video-grid">
                    {/* Local Participant */}
                    <div className={`video-card local-card ${isScreenSharing ? "screen-sharing-card" : ""}`}>
                        {isCameraOff && !isScreenSharing && (
                            <div className="video-placeholder">
                                <div className="placeholder-avatar">👤</div>
                                <p className="placeholder-title">Camera is Off</p>
                                <p className="placeholder-subtitle">Click Camera to turn video back on</p>
                            </div>
                        )}
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`meeting-video ${isCameraOff && !isScreenSharing ? "video-hidden" : ""} ${isScreenSharing ? "screen-sharing-video" : ""}`}
                        />
                        <div className="video-overlay-bottom">
                            <div className="participant-chip">
                                <span className="user-icon">{isScreenSharing ? "🖥️" : "👤"}</span>
                                <span className="user-name">
                                    {isScreenSharing ? "You (Sharing Screen)" : `${userName || (isHost ? "Host" : "You")} (Local)`}
                                </span>
                            </div>
                            <div className="video-status-pills">
                                {isScreenSharing && (
                                    <span className="status-badge screen-share-badge">
                                        🖥️ Presenting
                                    </span>
                                )}
                                {isMuted && (
                                    <span className="status-badge muted">
                                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                            <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        Muted
                                    </span>
                                )}
                                {!isScreenSharing && (
                                    <span className={`status-badge ${isCameraOff ? "camera-off" : "live"}`}>
                                        {isCameraOff ? "Camera Off" : "● Active"}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Remote Participant */}
                    <div className="video-card remote-card">
                        {hasRemoteParticipant && isRemoteCameraOff ? (
                            <div className="video-placeholder camera-off-placeholder">
                                <div className="placeholder-avatar">👤</div>
                                <p className="placeholder-title">{remoteUserName || "Participant"}</p>
                                <p className="placeholder-subtitle">Camera is turned off</p>
                            </div>
                        ) : !hasRemoteParticipant ? (
                            <div className="video-placeholder">
                                <div className="placeholder-avatar">👥</div>
                                <p className="placeholder-title">Waiting for participant</p>
                                <p className="placeholder-subtitle">
                                    Share room code <strong>{meetingId}</strong> to connect
                                </p>
                            </div>
                        ) : null}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className={`meeting-video ${(!hasRemoteParticipant || isRemoteCameraOff) ? "video-hidden" : ""}`}
                        />
                        <div className="video-overlay-bottom">
                            <div className="participant-chip">
                                <span className="user-icon">👥</span>
                                <span className="user-name">{remoteUserName}</span>
                            </div>
                            {hasRemoteParticipant && (
                                <div className="video-status-pills">
                                    {isRemoteMuted && (
                                        <span className="status-badge muted">
                                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            </svg>
                                            Muted
                                        </span>
                                    )}
                                    <span className={`status-badge ${isRemoteCameraOff ? "camera-off" : "live"}`}>
                                        {isRemoteCameraOff ? "Camera Off" : "● Active"}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Controls Bar */}
            <footer className="meeting-controls-bar">
                <div className="controls-center">
                    {/* Microphone Toggle Button */}
                    <button
                        className={`control-btn toggle-btn ${isMuted ? "is-off is-muted" : "is-active"}`}
                        onClick={toggleMute}
                        title={isMuted ? "Unmute microphone" : "Mute microphone"}
                        aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                    >
                        <span className="control-btn-icon">
                            {isMuted ? (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2.2" />
                                    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                                    <path d="M5 10v2a7 7 0 0 0 12 5" />
                                    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                                    <line x1="12" y1="19" x2="12" y2="22" />
                                    <line x1="8" y1="22" x2="16" y2="22" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="2" width="6" height="12" rx="3" />
                                    <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="22" />
                                    <line x1="8" y1="22" x2="16" y2="22" />
                                </svg>
                            )}
                        </span>
                        <span className="control-btn-label">
                            {isMuted ? "Unmute" : "Mute"}
                        </span>
                        {!isMuted && <span className="active-dot"></span>}
                    </button>

                    {/* Camera Toggle Button */}
                    <button
                        className={`control-btn toggle-btn ${isCameraOff ? "is-off is-camera-off" : "is-active"}`}
                        onClick={toggleCamera}
                        title={isCameraOff ? "Turn camera on" : "Turn camera off"}
                        aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
                    >
                        <span className="control-btn-icon">
                            {isCameraOff ? (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2.2" />
                                    <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8" />
                                    <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10z" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="5" width="14" height="14" rx="2" />
                                    <polygon points="23 7 16 12 23 17 23 7" fill="currentColor" />
                                </svg>
                            )}
                        </span>
                        <span className="control-btn-label">
                            {isCameraOff ? "Start Video" : "Stop Video"}
                        </span>
                        {!isCameraOff && <span className="active-dot"></span>}
                    </button>

                    {/* Screen Share Toggle Button */}
                    <button
                        className={`control-btn toggle-btn ${isScreenSharing ? "is-screen-sharing is-active-glow" : "is-active"}`}
                        onClick={toggleScreenShare}
                        title={isScreenSharing ? "Stop sharing screen" : "Share your screen"}
                        aria-label={isScreenSharing ? "Stop sharing screen" : "Share your screen"}
                    >
                        <span className="control-btn-icon">
                            {isScreenSharing ? (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" />
                                    <line x1="8" y1="21" x2="16" y2="21" />
                                    <line x1="12" y1="17" x2="12" y2="21" />
                                    <line x1="9" y1="10" x2="15" y2="10" strokeWidth="2.5" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" />
                                    <line x1="8" y1="21" x2="16" y2="21" />
                                    <line x1="12" y1="17" x2="12" y2="21" />
                                    <polyline points="16 9 12 5 8 9" />
                                    <line x1="12" y1="5" x2="12" y2="13" />
                                </svg>
                            )}
                        </span>
                        <span className="control-btn-label">
                            {isScreenSharing ? "Stop Share" : "Share Screen"}
                        </span>
                        {isScreenSharing && <span className="active-dot screen-dot"></span>}
                    </button>

                    <div className="controls-separator"></div>

                    {/* Leave Call Button */}
                    <button
                        className="control-btn end-call"
                        onClick={leaveMeeting}
                        title={isHost ? "End meeting" : "Leave meeting"}
                        aria-label={isHost ? "End meeting" : "Leave meeting"}
                    >
                        <span className="control-btn-icon hangup-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.28 8.91 7.42 7.25 12 7.25s8.72 1.66 11.71 4.42c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                            </svg>
                        </span>
                        <span className="control-btn-label">{isHost ? "End" : "Leave"}</span>
                    </button>
                </div>
            </footer>
        </div>
    );
}

export default Meeting;
