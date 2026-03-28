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
  const ringtoneRef = useRef(null);

  const [status, setStatus] = useState("Connecting...");
  const [incomingCall, setIncomingCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callStarted, setCallStarted] = useState(false);

  // 🔔 RINGTONE INIT
  useEffect(() => {
    ringtoneRef.current = new Audio("https://www.soundjay.com/phone/sounds/phone-ring-01.mp3");
    ringtoneRef.current.loop = true;
  }, []);

  const playRingtone = () => ringtoneRef.current?.play().catch(() => {});
  const stopRingtone = () => {
    ringtoneRef.current?.pause();
    ringtoneRef.current.currentTime = 0;
  };

  useEffect(() => {
    if (!user) return;
    start();

    return () => {
      stopRingtone();
      pcRef.current?.close();
      socketRef.current?.close();
    };
  }, [user]);

  const start = async () => {
    const token = await user.getIdToken(true);
    const myUid = JSON.parse(atob(token.split(".")[1])).uid;

    const ws = new WebSocket(`${WS}/chat/ws/${myUid}`);
    socketRef.current = ws;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pcRef.current = pc;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    // ✅ SAFE SET (no null crash)
    if (localVideo.current) {
      localVideo.current.srcObject = stream;
    }

    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = e.streams[0];
      }
      setCallStarted(true);
      setStatus("Connected");
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        ws.send(JSON.stringify({
          type: "candidate",
          candidate: e.candidate,
          to: receiverUid
        }));
      }
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "call") {
        setIncomingCall(true);
        setCaller(data.from);
        playRingtone();
      }

      if (data.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ws.send(JSON.stringify({
          type: "answer",
          answer,
          to: data.from
        }));
      }

      if (data.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }

      if (data.type === "candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }

      if (data.type === "call_accept") {
        createOffer();
        stopRingtone();
      }

      if (data.type === "call_reject") {
        stopRingtone();
        setStatus("Rejected ❌");
      }
    };

    // 🔥 AUTO CALL
    if (receiverUid) {
      setTimeout(() => sendCall(), 800);
    }
  };

  const sendCall = () => {
    socketRef.current.send(JSON.stringify({
      type: "call",
      to: receiverUid
    }));
    setStatus("Calling...");
  };

  const createOffer = async () => {
    const pc = pcRef.current;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current.send(JSON.stringify({
      type: "offer",
      offer,
      to: receiverUid
    }));
  };

  const acceptCall = async () => {
    stopRingtone();
    setIncomingCall(false);

    const pc = pcRef.current;
    const ws = socketRef.current;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    ws.send(JSON.stringify({
      type: "offer",
      offer,
      to: caller
    }));
  };

  const rejectCall = () => {
    stopRingtone();
    setIncomingCall(false);

    socketRef.current.send(JSON.stringify({
      type: "call_reject",
      to: caller
    }));

    setStatus("Missed call ❌");
  };

  const endCall = () => {
    stopRingtone();
    pcRef.current?.close();
    socketRef.current?.close();
    setCallStarted(false);
    setStatus("Call Ended ❌");
  };

  return (
    <div className="h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">

      {/* 📞 INCOMING CALL */}
      {incomingCall && !callStarted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50">
          <h2 className="mb-4">{caller}</h2>

          <div className="flex gap-6">
            <button onClick={rejectCall} className="bg-red-500 p-4 rounded-full">❌</button>
            <button onClick={acceptCall} className="bg-green-500 p-4 rounded-full">📞</button>
          </div>
        </div>
      )}

      {/* 🎥 REMOTE */}
      <video
        ref={remoteVideo}
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* 🎥 LOCAL */}
      <video
        ref={localVideo}
        autoPlay
        muted
        className="absolute bottom-6 right-6 w-32 rounded"
      />

      {/* STATUS */}
      {!incomingCall && !callStarted && (
        <p className="text-gray-400">{status}</p>
      )}

      {/* END BUTTON */}
      {callStarted && (
        <button
          onClick={endCall}
          className="absolute bottom-10 bg-red-500 p-4 rounded-full"
        >
          ❌
        </button>
      )}
    </div>
  );
}