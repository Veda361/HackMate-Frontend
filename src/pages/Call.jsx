import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { WS } from "../api/configApi";
import { useParams } from "react-router-dom";

export default function Call() {
  const { user } = useAuth();
  const { uid: receiverUid } = useParams();

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);

  const [status, setStatus] = useState("Connecting...");
  const [incomingCall, setIncomingCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const ringtone = new Audio("https://www.soundjay.com/phone/sounds/phone-ring-01.mp3");

  useEffect(() => {
    if (!user) return;
    start();
  }, [user]);

  const start = async () => {
    const token = await user.getIdToken(true);
    const payload = JSON.parse(atob(token.split(".")[1]));
    const myUid = payload.uid;

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

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    localVideo.current.srcObject = stream;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (e) => {
      remoteVideo.current.srcObject = e.streams[0];
      setStatus("Connected ✅");
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

      // 📞 Incoming call
      if (data.call) {
        setIncomingCall(true);
        setCaller(data.from);
        ringtone.loop = true;
        ringtone.play().catch(() => {});
      }

      if (data.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ws.send(JSON.stringify({
          answer,
          to: data.from
        }));
      }

      if (data.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }

      if (data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    if (receiverUid) {
      setTimeout(() => sendCall(), 800);
    }
  };

  const sendCall = () => {
    socketRef.current.send(JSON.stringify({
      call: true,
      to: receiverUid
    }));
    setStatus("Ringing...");
  };

  const acceptCall = async () => {
    ringtone.pause();
    setIncomingCall(false);

    const pc = pcRef.current;
    const ws = socketRef.current;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    ws.send(JSON.stringify({
      offer,
      to: caller
    }));
  };

  const rejectCall = () => {
    ringtone.pause();
    setIncomingCall(false);
    setStatus("Rejected ❌");
  };

  const toggleMute = () => {
    const audioTrack = localVideo.current.srcObject.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    setMuted(!audioTrack.enabled);
  };

  const toggleVideo = () => {
    const videoTrack = localVideo.current.srcObject.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    setVideoOff(!videoTrack.enabled);
  };

  const endCall = () => {
    pcRef.current?.close();
    socketRef.current?.close();
    setStatus("Call Ended ❌");
  };

  return (
    <div className="bg-gradient-to-br from-black via-gray-900 to-black text-white h-screen flex flex-col items-center justify-center">

      <h2 className="text-xl mb-2">{receiverUid || caller}</h2>
      <p className="text-gray-400 mb-4">{status}</p>

      {/* 📞 Incoming Popup */}
      {incomingCall && (
        <div className="absolute top-10 bg-gray-800 px-6 py-4 rounded-xl shadow-xl animate-pulse">
          <p className="mb-2">📞 Incoming call from {caller}</p>
          <div className="flex gap-3">
            <button onClick={acceptCall} className="bg-green-500 px-4 py-2 rounded">Accept</button>
            <button onClick={rejectCall} className="bg-red-500 px-4 py-2 rounded">Reject</button>
          </div>
        </div>
      )}

      {/* 🎥 Videos */}
      <div className="relative flex gap-4">
        <video
          ref={remoteVideo}
          autoPlay
          className="w-96 h-64 bg-black rounded-2xl shadow-lg"
        />

        <video
          ref={localVideo}
          autoPlay
          muted
          className="absolute bottom-2 right-2 w-32 h-24 rounded-lg border border-gray-500"
        />
      </div>

      {/* 🎮 Controls */}
      <div className="flex gap-6 mt-6">

        <button onClick={toggleMute} className="bg-gray-700 p-3 rounded-full hover:scale-110">
          {muted ? "🔇" : "🎤"}
        </button>

        <button onClick={toggleVideo} className="bg-gray-700 p-3 rounded-full hover:scale-110">
          {videoOff ? "📷❌" : "📷"}
        </button>

        <button onClick={endCall} className="bg-red-500 p-4 rounded-full hover:scale-110">
          ❌
        </button>

      </div>
    </div>
  );
}