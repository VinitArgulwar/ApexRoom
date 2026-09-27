# ApexRoom

ApexRoom is a **one-to-one video conferencing web application** that allows two users to communicate through real-time audio and video.

## What the App Does

* Creates and joins one-to-one video meetings.
* Enables real-time video and audio communication.
* Allows users to turn their **camera on/off**.
* Allows users to **mute/unmute their microphone**.
* Supports **screen sharing** during a meeting.
* Detects when a participant leaves the meeting.
* Handles real-time communication and WebRTC signaling between participants.

## Architecture

```text
                    ApexRoom
                       │
          ┌────────────┴────────────┐
          │                         │
      Frontend                   Backend
     React + Vite           Node.js + Express
          │                         │
          │                    REST APIs
          │                         │
          │                      MongoDB
          │
          │
     Socket.IO Signaling
          │
          ▼
    WebRTC Peer Connection
          │
          ▼
   ┌───────────────┐
   │ Audio + Video │
   │ Screen Share  │
   └───────────────┘
          │
          ▼
     Other User
```

### Communication Flow

1. The React frontend gets access to the user's camera and microphone.
2. Socket.IO connects the users and exchanges WebRTC signaling data.
3. WebRTC establishes the peer-to-peer connection between the two users.
4. Audio and video are transmitted directly through WebRTC.
5. Socket.IO handles signaling such as:

   * Offer
   * Answer
   * ICE candidates
   * User joining
   * User leaving
6. Screen sharing is implemented by replacing the existing video track using WebRTC `replaceTrack()`.

## Technologies Used

* **React.js** — Frontend
* **Node.js** — Backend
* **Express.js** — Backend API
* **Socket.IO** — Real-time signaling
* **WebRTC** — Peer-to-peer audio/video communication
* **MongoDB** — Database
* **Mongoose** — MongoDB object modeling

## Key Implementation

The application uses **Socket.IO for signaling** to exchange WebRTC offers, answers, and ICE candidates between users.

**WebRTC** is responsible for the actual peer-to-peer transmission of audio and video.

The application uses WebRTC `replaceTrack()` to switch between the camera and screen-sharing streams without creating a new peer connection.

## How to Run

### 1. Install Dependencies
From the root directory:
```bash
npm install
npm run install:all
```

### 2. Configure Environment (.env)
- **Backend**: [backend/.env](file:///Users/vinitargulwar/Desktop/ApexRoom/backend/.env)
  ```env
  PORT=3000
  CLIENT_URL=http://localhost:5173
  MONGO_URI=mongodb://127.0.0.1:27017/apexroom
  JWT_SECRET=apexroom-super-secret-jwt-key
  ```
- **Frontend**: [frontend/.env](file:///Users/vinitargulwar/Desktop/ApexRoom/frontend/.env)
  ```env
  VITE_API_URL=http://localhost:3000
  ```

### 3. Start Both Frontend & Backend
Run the following from the root directory:
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

