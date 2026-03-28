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

  // 🔥 RINGTONE INIT
  useEffect(() => {
    ringtoneRef.current = new Audio(
      "https://www.soundjay.com/phone/sounds/phone-ring-01.mp3"
    );
    ringtoneRef.current.loop = true;

    const unlock = () => {
      ringtoneRef.current.play().then(() => ringtoneRef.current.pause()).catch(() => {});
    };

    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
  }, []);

  const playRingtone = async () => {
    try {
      await ringtoneRef.current.play();
    } catch {
      document.addEventListener("click", () => ringtoneRef.current.play(), { once: true });
    }
  };

  const stopRingtone = () => {
    ringtoneRef.current.pause();
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
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      remoteVideo.current.srcObject = e.streams[0];
      setCallStarted(true);
      setStatus("Connected");
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

      if (data.call) {
        setIncomingCall(true);
        setCaller(data.from);
        playRingtone();

        // 📳 vibration (mobile)
        if (navigator.vibrate) {
          navigator.vibrate([500, 300, 500]);
        }
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
    setStatus("Calling...");
  };

  const acceptCall = async () => {
    stopRingtone();
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
    stopRingtone();
    setIncomingCall(false);
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

      {/* 📞 WHATSAPP INCOMING SCREEN */}
      {incomingCall && !callStarted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-lg z-50">

          <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center text-4xl mb-4">
            👤
          </div>

          <h2 className="text-xl">{caller}</h2>
          <p className="text-gray-400 mb-6">Incoming video call...</p>

          <div className="flex gap-10">
            <button
              onClick={rejectCall}
              className="bg-red-500 w-16 h-16 rounded-full text-2xl animate-bounce"
            >
              ❌
            </button>

            <button
              onClick={acceptCall}
              className="bg-green-500 w-16 h-16 rounded-full text-2xl animate-pulse"
            >
              📞
            </button>
          </div>
        </div>
      )}

      {/* 🎥 ACTIVE CALL UI */}
      {callStarted && (
        <>
          <video
            ref={remoteVideo}
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
          />

          <video
            ref={localVideo}
            autoPlay
            muted
            className="absolute bottom-6 right-6 w-32 h-44 rounded-xl border"
          />

          {/* Controls */}
          <div className="absolute bottom-10 flex gap-6">
            <button className="bg-gray-700 p-4 rounded-full">🎤</button>
            <button className="bg-gray-700 p-4 rounded-full">📷</button>
            <button onClick={endCall} className="bg-red-500 p-5 rounded-full">
              ❌
            </button>
          </div>
        </>
      )}

      {/* Status */}
      {!incomingCall && !callStarted && (
        <p className="text-gray-400">{status}</p>
      )}

    </div>
  );
}