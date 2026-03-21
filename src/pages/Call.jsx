import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// const API = import.meta.env.VITE_API_URL;
const WS = import.meta.env.VITE_WS_URL;

export default function Call() {
  const { user } = useAuth();
  const { uid } = useParams();
  const navigate = useNavigate();

  const localVideo = useRef();
  const remoteVideo = useRef();
  const peerRef = useRef();
  const socketRef = useRef();

  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callTime, setCallTime] = useState(0);
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    startCall();
  }, []);

  // ⏱ Call Timer
  useEffect(() => {
    let interval;
    if (status === "Live") {
      interval = setInterval(() => {
        setCallTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const startCall = async () => {
    const token = await user.getIdToken();
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    const myUid = payload.user_id || payload.uid;

    const ws = new WebSocket(`${WS}/${myUid}`);
    socketRef.current = ws;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localVideo.current.srcObject = stream;

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });

    peer.ontrack = (e) => {
      remoteVideo.current.srcObject = e.streams[0];
      setStatus("Live"); // ✅ when connected
    };

    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === "disconnected") {
        setStatus("Disconnected ❌");
      }
    };

    peer.onicecandidate = (e) => {
      if (e.candidate && socketRef.current?.readyState === 1) {
        socketRef.current.send(
          JSON.stringify({
            to: uid,
            candidate: e.candidate,
          }),
        );
      }
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.offer) {
        await peer.setRemoteDescription(data.offer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socketRef.current.send(
          JSON.stringify({
            to: data.from,
            answer,
          }),
        );
      }

      if (data.answer) {
        await peer.setRemoteDescription(data.answer);
      }

      if (data.candidate) {
        await peer.addIceCandidate(data.candidate);
      }
    };

    ws.onopen = async () => {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      ws.send(
        JSON.stringify({
          to: uid,
          offer,
          from: myUid,
        }),
      );
    };

    peerRef.current = peer;
  };

  const toggleMute = () => {
    const stream = localVideo.current.srcObject;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = muted;
    });
    setMuted(!muted);
  };

  const toggleVideo = () => {
    const stream = localVideo.current.srcObject;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = videoOff;
    });
    setVideoOff(!videoOff);
  };

  const endCall = () => {
    peerRef.current?.close();
    socketRef.current?.close();
    navigate("/matches");
  };

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden">
      {/* 🎥 Remote Video */}
      <video
        ref={remoteVideo}
        autoPlay
        className="absolute w-full h-full object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />

      {/* 👤 Caller Info */}
      <div className="absolute top-10 w-full text-center text-white z-10">
        <div className="flex flex-col items-center gap-2">
          {/* Avatar */}
          <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-2xl">
            👤
          </div>

          <h2 className="text-lg font-semibold">{uid}</h2>

          {/* Status */}
          <p className="text-sm text-gray-300">
            {status} {status === "Live" && `• ${formatTime(callTime)}`}
          </p>
        </div>
      </div>

      {/* 🎥 Self Preview */}
      <video
        ref={localVideo}
        autoPlay
        muted
        className="absolute bottom-28 right-4 w-32 h-44 rounded-xl border-2 border-white object-cover z-10 shadow-lg"
      />

      {/* 🎛 Controls */}
      <div className="absolute bottom-8 w-full flex justify-center gap-6 z-10">
        {/* 🎤 */}
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition ${
            muted ? "bg-red-500 scale-110" : "bg-gray-700"
          }`}
        >
          🎤
        </button>

        {/* 🎥 */}
        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition ${
            videoOff ? "bg-red-500 scale-110" : "bg-gray-700"
          }`}
        >
          🎥
        </button>

        {/* ❌ */}
        <button
          onClick={endCall}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition"
        >
          ❌
        </button>
      </div>
    </div>
  );
}
