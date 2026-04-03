import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useParams, useLocation } from "react-router-dom";
import { WS } from "../api/configApi";
import VideoGrid from "../components/VideoGrid";
import Controls from "../components/Controls";

export default function CallRoom() {
  const { user } = useAuth();
  const { uid: receiverUid } = useParams();
  const location = useLocation();

  const pcRef = useRef(null);
  const socketRef = useRef(null);

  const [localStream, setLocalStream] = useState(location.state?.stream);
  const [remoteStream, setRemoteStream] = useState(null);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!user) return;
    init();
    startTimer();
  }, [user]);

  const startTimer = () => {
    setInterval(() => setTime((t) => t + 1), 1000);
  };

  const init = async () => {
    const token = await user.getIdToken(true);
    const myUid = user.uid;

    const ws = new WebSocket(`${WS}/chat/ws/${myUid}`);
    socketRef.current = ws;

    ws.onerror = (err) => console.log("❌ WS ERROR:", err);
    ws.onclose = () => console.log("❌ WS CLOSED");

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
    });

    pcRef.current = pc;

    // ✅ FIX: avoid crash if stream not ready
    if (!localStream) return;

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && ws.readyState === 1) {
        ws.send(
          JSON.stringify({
            type: "candidate", // ✅ FIX
            candidate: e.candidate,
            to: receiverUid,
          }),
        );
      }
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "offer") {
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ws.send(
          JSON.stringify({
            type: "answer", // ✅ FIX
            answer,
            to: data.from,
          }),
        );
      }

      if (data.type === "answer") {
        await pc.setRemoteDescription(data.answer);
      }

      if (data.type === "candidate") {
        await pc.addIceCandidate(data.candidate);
      }
    };

    // ✅ FIX: WAIT FOR CONNECTION
    ws.onopen = async () => {
      console.log("✅ WS Connected");

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      ws.send(
        JSON.stringify({
          type: "offer", // ✅ FIX
          offer,
          to: receiverUid,
        }),
      );
    };
  };

  const toggleMute = () => {
    localStream.getAudioTracks()[0].enabled = false;
  };

  const toggleVideo = () => {
    localStream.getVideoTracks()[0].enabled = false;
  };

  const endCall = () => {
    pcRef.current.close();
    socketRef.current.close();
  };

  return (
    <div className="h-screen bg-black text-white">
      <div className="absolute top-4 left-4 text-sm">⏱ {time}s</div>

      <VideoGrid localStream={localStream} remoteStream={remoteStream} />

      <Controls onMute={toggleMute} onVideo={toggleVideo} onEnd={endCall} />
    </div>
  );
}
