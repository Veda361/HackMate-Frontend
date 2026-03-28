import { useRef, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function CallLobby() {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const navigate = useNavigate();
  const { uid } = useParams();

  useEffect(() => {
    startPreview();
  }, []);

  const startPreview = async () => {
    const s = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    videoRef.current.srcObject = s;
    setStream(s);
  };

  const joinCall = () => {
    navigate(`/call-room/${uid}`, { state: { stream } });
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-black text-white">
      <h2 className="mb-4 text-xl">Ready to join?</h2>

      <video ref={videoRef} autoPlay muted className="w-80 rounded-xl" />

      <button
        onClick={joinCall}
        className="mt-4 bg-green-500 px-6 py-2 rounded-lg"
      >
        Join Call
      </button>
    </div>
  );
}