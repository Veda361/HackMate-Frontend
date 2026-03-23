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

  // 🚀 INIT
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

  // 🔽 AUTO SCROLL
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔊 RINGTONE
  useEffect(() => {
    if (incomingCall) {
      ringtoneRef.current?.play().catch(() => {});
    } else {
      ringtoneRef.current?.pause();
      if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
    }
  }, [incomingCall]);

  // 📜 FETCH HISTORY
  const fetchHistory = async () => {
    try {
      const token = await user.getIdToken(true);

      const res = await fetch(`${API}/chat/history/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("History error:", err);
    }
  };

  // 🔥 WEBSOCKET (STABLE)
  const connectSocket = async () => {
    try {
      if (socketRef.current) return;

      const token = await user.getIdToken(true);
      const payload = JSON.parse(atob(token.split(".")[1]));
      const myUid = payload.user_id || payload.uid;

      if (!myUid) return;

      const ws = new WebSocket(`${WS}/chat/ws/${myUid}`);

      ws.onopen = () => {
        console.log("WS Connected ✅");
        setConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.message) {
          setMessages((prev) => [
            ...prev,
            {
              from: data.from,
              message: data.message,
              time: new Date(),
            },
          ]);
        }

        if (data.typing) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 1500);
        }

        if (data.online) {
          setOnlineUsers(data.online);
        }

        if (data.call) {
          setIncomingCall(data.from);
        }

        if (data.call_accept) {
          navigate(`/call/${data.from}`);
        }

        if (data.call_reject) {
          alert("Call rejected ❌");
        }
      };

      ws.onerror = (err) => {
        console.error("WS Error ❌", err);
      };

      ws.onclose = () => {
        console.log("WS Closed ❌ → reconnecting...");
        setConnected(false);
        socketRef.current = null;

        reconnectRef.current = setTimeout(() => {
          connectSocket();
        }, 3000);
      };

      socketRef.current = ws;
    } catch (err) {
      console.error("Socket error:", err);
    }
  };

  // 💬 SEND MESSAGE (SAFE)
  const sendMessage = () => {
    if (!input.trim()) return;

    if (!socketRef.current || socketRef.current.readyState !== 1) {
      console.log("WS not ready ❌");
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        to: uid,
        message: input,
      })
    );

    setMessages((prev) => [
      ...prev,
      { from: "me", message: input, time: new Date() },
    ]);

    setInput("");
  };

  // ✍️ TYPING
  const handleTyping = () => {
    if (!socketRef.current || socketRef.current.readyState !== 1) return;

    socketRef.current.send(
      JSON.stringify({
        to: uid,
        typing: true,
      })
    );
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col">

      {/* AUDIO */}
      <audio ref={ringtoneRef} src="/ringtone.mp3" loop />

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
            socketRef.current?.send(JSON.stringify({ to: uid, call: true }))
          }
          className="bg-blue-500 px-3 py-1 rounded hover:bg-blue-600"
        >
          📞
        </button>
      </div>

      {/* INCOMING CALL */}
      {incomingCall && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-gray-900 p-6 rounded-xl text-center">
            <h2 className="mb-4 text-lg">📞 Incoming Call</h2>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  socketRef.current?.send(
                    JSON.stringify({ to: incomingCall, call_reject: true })
                  );
                  setIncomingCall(null);
                }}
                className="bg-red-500 px-4 py-2 rounded"
              >
                Reject
              </button>

              <button
                onClick={() => {
                  socketRef.current?.send(
                    JSON.stringify({ to: incomingCall, call_accept: true })
                  );
                  navigate(`/call/${incomingCall}`);
                }}
                className="bg-green-500 px-4 py-2 rounded"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.from === "me" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-xl max-w-xs ${
                m.from === "me"
                  ? "bg-green-500 text-black"
                  : "bg-gray-800"
              }`}
            >
              <p>{m.message}</p>
              <span className="text-xs opacity-70 block mt-1">
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
          placeholder={connected ? "Type a message..." : "Connecting..."}
          disabled={!connected}
          className="flex-1 p-2 rounded text-black"
        />

        <button
          onClick={sendMessage}
          disabled={!connected}
          className="ml-2 bg-green-500 px-4 rounded disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}