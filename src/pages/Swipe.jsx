import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Chat() {
  const { user } = useAuth();
  const { uid } = useParams();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchHistory();
    connectSocket();
  }, []);

  // 🔥 Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔥 Fetch history
  const fetchHistory = async () => {
    const token = await user.getIdToken();

    const res = await fetch(
      `https://web-production-80241.up.railway.app/chat/history/${uid}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();
    setMessages(data);
  };

  // 🔥 WebSocket
  const connectSocket = async () => {
    const token = await user.getIdToken();
    const decoded = JSON.parse(atob(token.split(".")[1]));
    const myUid = decoded.user_id || decoded.uid;

    const ws = new WebSocket(`wss://web-production-80241.up.railway.app/chat/ws/${myUid}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // 💬 New message
      if (data.message) {
        setMessages((prev) => [
          ...prev,
          { from: data.from, message: data.message, time: new Date() },
        ]);
      }

      // ✍️ Typing
      if (data.typing) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 1500);
      }

      // 🟢 Online users
      if (data.online) {
        setOnlineUsers(data.online);
      }
    };

    socketRef.current = ws;
  };

  // 🔥 Send message
  const sendMessage = () => {
    if (!input.trim()) return;

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

  // 🔥 Typing event
  const handleTyping = () => {
    socketRef.current.send(
      JSON.stringify({
        to: uid,
        typing: true,
      })
    );
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col">

      {/* HEADER */}
      <div className="p-4 bg-gray-900 flex items-center justify-between">
        <div>
          <h2 className="font-bold">Chat</h2>
          <p className="text-sm text-gray-400">
            {onlineUsers.includes(uid) ? "🟢 Online" : "⚫ Offline"}
          </p>
        </div>
      </div>

      {/* CHAT AREA */}
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
              <span className="text-xs block mt-1 opacity-70">
                {new Date(m.time).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="text-gray-400 text-sm">Typing...</div>
        )}

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
          placeholder="Type a message..."
          className="flex-1 p-2 text-black rounded"
        />

        <button
          onClick={sendMessage}
          className="ml-2 bg-green-500 px-4 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}