import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;
const WS = import.meta.env.VITE_WS_URL;

export default function Chat() {
  const { user } = useAuth();
  const { uid } = useParams();
  const navigate = useNavigate();
  const ringtoneRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  if (!uid) {
    return <div className="text-white text-center mt-10">Invalid chat ❌</div>;
  }

  useEffect(() => {
    if (user && uid) {
      fetchHistory();
      connectSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [user, uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const token = await user.getIdToken();

      const res = await fetch(`${API}/chat/history/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("History error:", err);
    }
  };

  useEffect(() => {
    if (incomingCall) {
      ringtoneRef.current?.play().catch(() => {});
    } else {
      ringtoneRef.current?.pause();
      if (ringtoneRef.current) {
        ringtoneRef.current.currentTime = 0;
      }
    }
  }, [incomingCall]);

  const connectSocket = async () => {
    try {
      const token = await user.getIdToken();
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      const myUid = payload.user_id || payload.uid;

      if (!myUid) return;

      const ws = new WebSocket(`${WS}/${myUid}`);

      ws.onopen = () => {
        console.log("WebSocket connected ✅");
        setConnected(true);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error ❌", err);
      };

      ws.onclose = () => {
        setConnected(false);
      };

      ws.onmessage = (event) => {
        try {
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

          // ✅ NEW: Incoming call
          if (data.call) {
            setIncomingCall(data.from);
          }

          // ✅ NEW: Call accepted
          if (data.call_accept) {
            navigate(`/call/${data.from}`);
          }

          // ✅ NEW: Call rejected
          if (data.call_reject) {
            alert("Call rejected ❌");
          }
        } catch (err) {
          console.error("WS parse error:", err);
        }
      };

      socketRef.current = ws;
    } catch (err) {
      console.error("Socket error:", err);
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current || !connected) return;

    socketRef.current.send(
      JSON.stringify({
        to: uid,
        message: input,
      }),
    );

    setMessages((prev) => [
      ...prev,
      {
        from: "me",
        message: input,
        time: new Date(),
      },
    ]);

    setInput("");
  };

  const handleTyping = () => {
    if (!socketRef.current || !connected) return;

    socketRef.current.send(
      JSON.stringify({
        to: uid,
        typing: true,
      }),
    );
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* HEADER */}
      <div className="p-4 bg-gray-900 flex justify-between items-center">
        <div>
          <h2 className="font-bold">Chat</h2>
          <p className="text-sm text-gray-400">
            {onlineUsers.includes(uid) ? "🟢 Online" : "⚫ Offline"}
          </p>
        </div>

        {/* ✅ UPDATED CALL BUTTON */}
        <button
          onClick={() =>
            socketRef.current?.send(
              JSON.stringify({
                to: uid,
                call: true,
              }),
            )
          }
          className="bg-blue-500 px-3 py-1 rounded"
        >
          📞
        </button>
      </div>

      {/* ✅ INCOMING CALL POPUP */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl text-center">
            <h2 className="text-xl mb-4">📞 Incoming Call</h2>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  socketRef.current.send(
                    JSON.stringify({
                      to: incomingCall,
                      call_reject: true,
                    }),
                  );
                  setIncomingCall(null);
                }}
                className="bg-red-500 px-4 py-2 rounded"
              >
                Reject
              </button>

              <button
                onClick={() => {
                  socketRef.current.send(
                    JSON.stringify({
                      to: incomingCall,
                      call_accept: true,
                    }),
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
                m.from === "me" ? "bg-green-500 text-black" : "bg-gray-800"
              }`}
            >
              <p>{m.message}</p>
              <span className="text-xs block mt-1 opacity-70">
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
          className="flex-1 p-2 text-black rounded"
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
