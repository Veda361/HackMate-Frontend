import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API, WS } from "../api/configApi";

export default function Chat() {
  const { user } = useAuth();
  const { uid } = useParams();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const bottomRef = useRef(null);
  const ringtoneRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [recording, setRecording] = useState(false);

  if (!uid) {
    return <div className="text-white text-center mt-10">Invalid chat ❌</div>;
  }

  useEffect(() => {
    ringtoneRef.current = new Audio("/ringtone.mp3");
    ringtoneRef.current.loop = true;
  }, []);

  useEffect(() => {
    if (!user) return;

    fetchHistory();
    connectSocket();

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
      clearTimeout(reconnectRef.current);
    };
  }, [user, uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // =========================
  // FETCH HISTORY
  // =========================
  const fetchHistory = async () => {
    try {
      const token = await user.getIdToken(true);

      const res = await fetch(`${API}/chat/history/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      setMessages(
        (data || []).map((m) => ({
          ...m,
          type: "text",
          status: "seen",
        }))
      );
    } catch (err) {
      console.error("History error:", err);
    }
  };

  // =========================
  // SOCKET
  // =========================
  const connectSocket = async () => {
    if (socketRef.current) return;

    const ws = new WebSocket(`${WS}/chat/ws/${user.uid}`);

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "online_ping" }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "message":
          setMessages((prev) => [
            ...prev,
            {
              id: data.id,
              from: data.from === uid ? data.from : "me",
              message: data.message,
              type: data.file_type || "text",
              time: new Date(),
              status: "delivered",
            },
          ]);

          // delivered ack
          ws.send(
            JSON.stringify({
              type: "delivered",
              to: data.from,
              message_id: data.id,
            })
          );
          break;

        case "delivered":
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.message_id
                ? { ...m, status: "delivered" }
                : m
            )
          );
          break;

        case "seen":
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.message_id ? { ...m, status: "seen" } : m
            )
          );
          break;

        case "typing":
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 1500);
          break;

        case "online":
          setOnlineUsers(data.users);
          break;

        case "call":
          setIncomingCall(data.from);
          break;

        case "call_accept":
          setIncomingCall(null);
          navigate(`/call/${data.from}`);
          break;

        case "call_reject":
          setIncomingCall(null);
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      socketRef.current = null;
      reconnectRef.current = setTimeout(connectSocket, 2000);
    };

    socketRef.current = ws;
  };

  // =========================
  // SEND TEXT
  // =========================
  const sendMessage = () => {
    if (!input.trim()) return;
    if (!socketRef.current || socketRef.current.readyState !== 1) return;

    const tempId = Date.now();

    socketRef.current.send(
      JSON.stringify({
        type: "message",
        to: uid,
        message: input,
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        from: "me",
        message: input,
        type: "text",
        time: new Date(),
        status: "sent",
      },
    ]);

    setInput("");
  };

  // =========================
  // 📷 IMAGE
  // =========================
  const sendImage = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const token = await user.getIdToken(true);

    const res = await fetch(`${API}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();

    socketRef.current.send(
      JSON.stringify({
        type: "message",
        to: uid,
        message: data.url,
        file_type: "image",
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        from: "me",
        message: data.url,
        type: "image",
        time: new Date(),
        status: "sent",
      },
    ]);
  };

  // =========================
  // 🎤 VOICE
  // =========================
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    let chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });

      const formData = new FormData();
      formData.append("file", blob);

      const token = await user.getIdToken(true);

      const res = await fetch(`${API}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      socketRef.current.send(
        JSON.stringify({
          type: "message",
          to: uid,
          message: data.url,
          file_type: "audio",
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          from: "me",
          message: data.url,
          type: "audio",
          time: new Date(),
          status: "sent",
        },
      ]);
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // =========================
  // UI RENDER
  // =========================
  const renderMessage = (m) => {
    if (m.type === "image") {
      return <img src={m.message} className="rounded-lg max-w-[200px]" />;
    }
    if (m.type === "audio") {
      return <audio controls src={m.message} />;
    }
    return <p>{m.message}</p>;
  };

  const renderStatus = (m) => {
    if (m.from !== "me") return null;
    if (m.status === "sent") return "✓";
    if (m.status === "delivered") return "✓✓";
    if (m.status === "seen") return "✓✓ 👁";
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col">

      {/* HEADER */}
      <div className="p-4 bg-gray-900 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">Chat</h2>
          <p className="text-sm text-gray-400">
            {onlineUsers.includes(uid) ? "🟢 Online" : "⚫ Offline"}
          </p>
        </div>

        <button
          onClick={() =>
            socketRef.current?.send(JSON.stringify({ type: "call", to: uid }))
          }
          className="bg-blue-500 px-3 py-1 rounded"
        >
          📞
        </button>
      </div>

      {/* CHAT */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`px-4 py-2 rounded-xl max-w-xs ${
              m.from === "me" ? "bg-green-500 text-black" : "bg-gray-800"
            }`}>
              {renderMessage(m)}
              <span className="text-xs opacity-70 flex justify-between">
                {new Date(m.time).toLocaleTimeString()}
                {renderStatus(m)}
              </span>
            </div>
          </div>
        ))}
        {isTyping && <div className="text-gray-400 text-sm">Typing...</div>}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 flex bg-gray-900 gap-2">

        <input type="file" accept="image/*" onChange={(e) => sendImage(e.target.files[0])} />

        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          className="bg-gray-700 px-2 rounded"
        >
          {recording ? "🎙️" : "🎤"}
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 rounded text-black"
        />

        <button onClick={sendMessage} className="bg-green-500 px-4 rounded">
          Send
        </button>
      </div>
    </div>
  );
}