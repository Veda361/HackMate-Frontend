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

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);

  if (!uid) {
    return <div className="text-white text-center mt-10">Invalid chat ❌</div>;
  }

  useEffect(() => {
    ringtoneRef.current = new Audio("/ringtone.mp3");
    ringtoneRef.current.loop = true;

    const unlockAudio = () => {
      ringtoneRef.current.play().then(() => ringtoneRef.current.pause()).catch(() => {});
    };

    document.addEventListener("click", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true });

    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
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

    fetchHistory();
    connectSocket();

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
      clearTimeout(reconnectRef.current);
      stopRingtone();
    };
  }, [user, uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (incomingCall) playRingtone();
    else stopRingtone();
  }, [incomingCall]);

  const fetchHistory = async () => {
    try {
      const token = await user.getIdToken(true);

      const res = await fetch(`${API}/chat/history/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("History error:", err);
    }
  };

  const connectSocket = async () => {
    try {
      if (socketRef.current) return;

      const token = await user.getIdToken(true);
      const payload = JSON.parse(atob(token.split(".")[1]));
      const myUid = payload.uid;

      if (!myUid) return;

      const ws = new WebSocket(`${WS}/chat/ws/${myUid}`);

      ws.onopen = () => {
        console.log("WS Connected ✅");
        setConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "message":
            setMessages((prev) => [...prev, {
              from: data.from,
              message: data.message,
              time: new Date(),
            }]);
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
        console.log("WS Closed ❌ → reconnecting...");
        setConnected(false);
        socketRef.current = null;

        reconnectRef.current = setTimeout(() => {
          connectSocket();
        }, 2000);
      };

      socketRef.current = ws;
    } catch (err) {
      console.error("Socket error:", err);
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    if (!socketRef.current || socketRef.current.readyState !== 1) return;

    socketRef.current.send(JSON.stringify({
      type: "message",
      to: uid,
      message: input,
    }));

    setMessages((prev) => [...prev, {
      from: "me",
      message: input,
      time: new Date(),
    }]);

    setInput("");
  };

  const handleTyping = () => {
    if (!socketRef.current || socketRef.current.readyState !== 1) return;

    socketRef.current.send(JSON.stringify({
      type: "typing",
      to: uid,
    }));
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
            socketRef.current?.send(JSON.stringify({
              type: "call",
              to: uid,
            }))
          }
          className="bg-blue-500 px-3 py-1 rounded"
        >
          📞
        </button>
      </div>

      {/* INCOMING CALL */}
      {incomingCall && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="bg-gray-900 p-6 rounded-xl text-center">
            <h2 className="mb-4 text-lg">📞 Incoming Call</h2>

            <div className="flex gap-6 justify-center">
              <button
                onClick={() => {
                  socketRef.current?.send(JSON.stringify({
                    type: "call_reject",
                    to: incomingCall,
                  }));
                  setIncomingCall(null);
                }}
                className="bg-red-500 w-14 h-14 rounded-full text-xl"
              >
                ❌
              </button>

              <button
                onClick={() => {
                  socketRef.current?.send(JSON.stringify({
                    type: "call_accept",
                    to: incomingCall,
                  }));
                  setIncomingCall(null);
                  navigate(`/call/${incomingCall}`);
                }}
                className="bg-green-500 w-14 h-14 rounded-full text-xl"
              >
                📞
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`px-4 py-2 rounded-xl max-w-xs ${
              m.from === "me" ? "bg-green-500 text-black" : "bg-gray-800"
            }`}>
              <p>{m.message}</p>
              <span className="text-xs opacity-70">
                {m.time ? new Date(m.time).toLocaleTimeString() : ""}
              </span>
            </div>
          </div>
        ))}
        {isTyping && <div className="text-gray-400 text-sm">Typing...</div>}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 flex bg-gray-900">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            handleTyping();
          }}
          className="flex-1 p-2 rounded text-black"
        />
        <button onClick={sendMessage} className="ml-2 bg-green-500 px-4 rounded">
          Send
        </button>
      </div>

    </div>
  );
}