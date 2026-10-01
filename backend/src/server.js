import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import meetingRoutes from "./routes/MeetingRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);

app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
});

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    // Participant requests to join room
    socket.on("request-to-join", ({ meetingId, userName, userId }) => {
        socket.to(meetingId).emit("join-request", {
            participantSocketId: socket.id,
            userName: userName || "Guest",
            userId,
            meetingId
        });
    });

    // Host accepts participant
    socket.on("accept-join", ({ participantSocketId, meetingId }) => {
        io.to(participantSocketId).emit("join-accepted", { meetingId });
    });

    // Host rejects participant
    socket.on("reject-join", ({ participantSocketId, meetingId }) => {
        io.to(participantSocketId).emit("join-rejected", { meetingId });
    });

    // Participant cancels join request while waiting
    socket.on("cancel-join-request", ({ meetingId }) => {
        socket.to(meetingId).emit("join-request-cancelled", {
            participantSocketId: socket.id
        });
    });

    socket.on("join-room", (payload) => {
        const meetingId = typeof payload === "string" ? payload : payload?.meetingId;
        const userName = typeof payload === "object" ? payload?.userName : "Participant";
        if (!meetingId) return;

        socket.join(meetingId);
        socket.to(meetingId).emit("user-joined", { userName, socketId: socket.id });
    });

    socket.on("offer", ({ meetingId, offer }) => socket.to(meetingId).emit("offer", offer));
    socket.on("answer", ({ meetingId, answer }) => socket.to(meetingId).emit("answer", answer));
    socket.on("ice-candidate", ({ meetingId, candidate }) => socket.to(meetingId).emit("ice-candidate", candidate));

    socket.on("leave-room", (meetingId) => {
        socket.to(meetingId).emit("user-left");
        socket.to(meetingId).emit("join-request-cancelled", {
            participantSocketId: socket.id
        });
        socket.leave(meetingId);
    });

    socket.on("camera-status", ({ meetingId, isCameraOff }) => {
        socket.to(meetingId).emit("camera-status", { isCameraOff });
    });

    socket.on("mic-status", ({ meetingId, isMuted }) => {
        socket.to(meetingId).emit("mic-status", { isMuted });
    });

    socket.on("disconnecting", () => {
        // If the user drops out abruptly, inform all rooms they were in
        socket.rooms.forEach((room) => {
            if (room !== socket.id) {
                socket.to(room).emit("user-left");
            }
        });
    });

    socket.on("disconnect", () => {
        // Broadcast request cancellation in case waiting participant drops
        io.emit("join-request-cancelled", { participantSocketId: socket.id });
    });
});

connectDB();

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port ${port}`));
