import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
    meetingId: {
        type: String,
        required: true,
        unique: true
    },

    title: {
        type: String,
        default: "Quick Meeting",
        trim: true
    },

    hostId: {
        type: String,
        required: true
    },

    hostName: {
        type: String,
        default: "Host",
        trim: true
    },

    participants: [{
        type: String
    }],

    status: {
        type: String,
        enum: ["scheduled", "live", "completed", "cancelled"],
        default: "scheduled"
    },

    startedAt: {
        type: Date,
        default: null
    },

    endedAt: {
        type: Date,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;
