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
    setInterval(() => setTime(t => t + 1), 1000);
  };

  const init = async () => {
    const token = await user.getIdToken(true);
    const myUid = JSON.parse(atob(token.split(".")[1])).uid;

    const ws = new WebSocket(`${WS}/chat/ws/${myUid}`);
    socketRef.current = ws;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject"
        }
      ]
    });

    pcRef.current = pc;

    localStream.getTracks().forEach(track =>
      pc.addTrack(track, localStream)
    );

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        ws.send(JSON.stringify({
          candidate: e.candidate,
          to: receiverUid
        }));
      }
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.offer) {
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ws.send(JSON.stringify({
          answer,
          to: data.from
        }));
      }

      if (data.answer) {
        await pc.setRemoteDescription(data.answer);
      }

      if (data.candidate) {
        await pc.addIceCandidate(data.candidate);
      }
    };

    // auto start
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    ws.send(JSON.stringify({
      offer,
      to: receiverUid
    }));
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

      {/* Timer */}
      <div className="absolute top-4 left-4 text-sm">
        ⏱ {time}s
      </div>

      {/* Videos */}
      <VideoGrid
        localStream={localStream}
        remoteStream={remoteStream}
      />

      {/* Controls */}
      <Controls
        onMute={toggleMute}
        onVideo={toggleVideo}
        onEnd={endCall}
      />

    </div>
  );
}