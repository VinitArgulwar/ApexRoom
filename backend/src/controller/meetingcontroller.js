import Meeting from "../model/Meeting.js";
import crypto from "crypto";  

export async function createMeeting(req, res) {
    try {
        const { hostId, title, hostName } = req.body;
        if (!hostId) return res.status(400).json({ message: "hostId is required" });

        let meetingId;
        let existingMeeting;
        do {
            meetingId = crypto.randomInt(100000, 1000000).toString();
            existingMeeting = await Meeting.exists({ meetingId });
        } while (existingMeeting);

        const meeting = await Meeting.create({
            meetingId,
            title: title ? title.trim() : "Quick Meeting",
            hostId,
            hostName: hostName ? hostName.trim() : "Host",
            participants: [hostId],
            status: "scheduled"
        });

        res.status(201).json({
            message: "Meeting created successfully",
            meetingId: meeting.meetingId,
            title: meeting.title,
            status: meeting.status,
            meeting
        });
    } catch (error) {
        console.error("Create meeting error:", error);
        res.status(500).json({ message: "Failed to create meeting" });
    }
}

export async function joinMeeting(req, res) {
    try {
        const { meetingId, userId } = req.body;
        if (!meetingId || !userId) return res.status(400).json({ message: "meetingId and userId are required" });

        const meeting = await Meeting.findOne({
            meetingId
        });

        if (!meeting) {
            return res.status(404).json({
                message: "Meeting not found"
            });
        }

        if (["completed", "cancelled"].includes(meeting.status)) {
            return res.status(400).json({ message: `This meeting is ${meeting.status}` });
        }

        if (!meeting.participants.includes(userId)) {
            meeting.participants.push(userId);
        }

        meeting.status = "live";
        if (!meeting.startedAt) meeting.startedAt = new Date();
        await meeting.save();

        res.status(200).json({
            message: "Joined meeting successfully",
            meetingId: meeting.meetingId,
            title: meeting.title,
            status: meeting.status,
            meeting
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to join meeting"
        });
    }
}

export async function getMeeting(req, res) {
    try {
        const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });
        res.json({ meeting });
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve meeting" });
    }
}

export async function listMeetings(req, res) {
    try {
        const userId = req.query.userId;
        const filter = userId
            ? { $or: [{ hostId: userId }, { participants: userId }] }
            : {};

        const meetings = await Meeting.find(filter).sort({ createdAt: -1 });

        const formattedMeetings = meetings.map((m) => {
            let duration = "—";
            if (m.startedAt && m.endedAt) {
                const diffMs = new Date(m.endedAt) - new Date(m.startedAt);
                const diffMin = Math.max(1, Math.round(diffMs / 60000));
                if (diffMin < 60) {
                    duration = `${diffMin} min`;
                } else {
                    const hrs = Math.floor(diffMin / 60);
                    const mins = diffMin % 60;
                    duration = mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
                }
            } else if (m.status === "live") {
                duration = "In progress";
            }

            return {
                id: m._id.toString(),
                code: m.meetingId,
                title: m.title || "Quick Meeting",
                hostId: m.hostId,
                hostName: m.hostName || "Host",
                date: new Date(m.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                }),
                time: new Date(m.createdAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit"
                }),
                duration,
                participants: m.participants ? m.participants.length : 1,
                status: m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : "Scheduled",
                rawStatus: m.status,
                startedAt: m.startedAt,
                endedAt: m.endedAt,
                createdAt: m.createdAt
            };
        });

        res.json({ meetings: formattedMeetings });
    } catch (error) {
        console.error("List meetings error:", error);
        res.status(500).json({ message: "Failed to retrieve meetings" });
    }
}

export async function endMeeting(req, res) {
    try {
        const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });
        if (meeting.hostId !== req.body.hostId) return res.status(403).json({ message: "Only the host can end this meeting" });

        if (meeting.status !== "completed") {
            meeting.status = "completed";
            meeting.endedAt = new Date();
            await meeting.save();
        }
        res.json({ message: "Meeting completed", meeting });
    } catch (error) {
        res.status(500).json({ message: "Failed to end meeting" });
    }
}
