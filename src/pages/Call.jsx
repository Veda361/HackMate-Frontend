import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { WS } from "../api/configApi";

export default function Call() {
  const { user } = useAuth();
  const { uid } = useParams();
  const navigate = useNavigate();

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);

  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callTime, setCallTime] = useState(0);
  const [status, setStatus] = useState("Connecting...");

  // 🚀 START CALL
  useEffect(() => {
    if (user && uid) startCall();

    return () => {
      cleanup();
    };
  }, [user, uid]);

  // ⏱ TIMER
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
    try {
      const token = await user.getIdToken(true);
      const payload = JSON.parse(atob(token.split(".")[1]));
      const myUid = payload.user_id || payload.uid;

      // 🔥 WS
      const ws = new WebSocket(`${WS}/chat/ws/${myUid}`);
      socketRef.current = ws;

      // 🎥 GET MEDIA
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      localVideo.current.srcObject = stream;

      // 🔥 PEER
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      peerRef.current = peer;

      // ADD TRACKS
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });

      // RECEIVE STREAM
      peer.ontrack = (e) => {
        remoteVideo.current.srcObject = e.streams[0];
        setStatus("Live");
      };

      // ICE
      peer.onicecandidate = (e) => {
        if (e.candidate && socketRef.current?.readyState === 1) {
          socketRef.current.send(
            JSON.stringify({
              to: uid,
              candidate: e.candidate,
            })
          );
        }
      };

      // 🔥 WS EVENTS
      ws.onopen = async () => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        ws.send(
          JSON.stringify({
            to: uid,
            offer,
          })
        );
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        // 🟢 OFFER
        if (data.offer) {
          await peer.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );

          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);

          socketRef.current.send(
            JSON.stringify({
              to: data.from,
              answer,
            })
          );
        }

        // 🟢 ANSWER
        if (data.answer) {
          await peer.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }

        // 🟢 CANDIDATE
        if (data.candidate) {
          try {
            await peer.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          } catch (err) {
            console.error("ICE error:", err);
          }
        }
      };

      ws.onerror = (err) => console.error("WS Error:", err);

    } catch (err) {
      console.error("Call error:", err);
    }
  };

  // 🎤 MUTE
  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = muted;
    });
    setMuted(!muted);
  };

  // 🎥 VIDEO
  const toggleVideo = () => {
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = videoOff;
    });
    setVideoOff(!videoOff);
  };

  // ❌ CLEANUP
  const cleanup = () => {
    peerRef.current?.close();
    socketRef.current?.close();

    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  // ❌ END CALL
  const endCall = () => {
    cleanup();
    navigate("/matches");
  };

  return (
    <div className="h-screen w-full bg-black relative">

      {/* REMOTE */}
      <video
        ref={remoteVideo}
        autoPlay
        className="absolute w-full h-full object-cover"
      />

      {/* HEADER */}
      <div className="absolute top-10 w-full text-center text-white z-10">
        <h2>{uid}</h2>
        <p>
          {status} {status === "Live" && `• ${formatTime(callTime)}`}
        </p>
      </div>

      {/* LOCAL */}
      <video
        ref={localVideo}
        autoPlay
        muted
        className="absolute bottom-28 right-4 w-32 h-44 rounded"
      />

      {/* CONTROLS */}
      <div className="absolute bottom-8 w-full flex justify-center gap-6">

        <button
          onClick={toggleMute}
          className={`p-4 rounded-full ${muted ? "bg-red-500" : "bg-gray-700"}`}
        >
          🎤
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full ${videoOff ? "bg-red-500" : "bg-gray-700"}`}
        >
          🎥
        </button>

        <button
          onClick={endCall}
          className="p-4 rounded-full bg-red-600"
        >
          ❌
        </button>

      </div>
    </div>
  );
}