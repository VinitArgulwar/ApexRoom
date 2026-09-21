import express from "express";
import * as meetingController from "../controller/meetingcontroller.js";
const router = express.Router();

router.post("/", meetingController.createMeeting);
router.post("/join", meetingController.joinMeeting);
router.get("/", meetingController.listMeetings);
router.get("/:meetingId", meetingController.getMeeting);
router.patch("/:meetingId/end", meetingController.endMeeting);

export default router;
