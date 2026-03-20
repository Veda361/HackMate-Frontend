import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Matches() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [unread, setUnread] = useState({});

  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchMatches();
      connectSocket();
    }
  }, [user]);

  // 🔥 Fetch matches
  const fetchMatches = async () => {
    const token = await user.getIdToken();

    const res = await fetch("https://web-production-80241.up.railway.app/match", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    setMatches(data || []);
    setFiltered(data || []);
  };

  // 🔍 Search filter
  useEffect(() => {
    const result = matches.filter((m) =>
      (m.username || m.email)
        .toLowerCase()
        .includes(search.toLowerCase())
    );
    setFiltered(result);
  }, [search, matches]);

  // 🔥 WebSocket for live data
  const connectSocket = async () => {
    const token = await user.getIdToken();
    const decoded = JSON.parse(atob(token.split(".")[1]));
    const myUid = decoded.user_id || decoded.uid;

    const ws = new WebSocket(`wss://web-production-80241.up.railway.app/chat/ws/${myUid}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // 🟢 Online users
      if (data.online) {
        setOnlineUsers(data.online);
      }

      // 💬 Last message preview
      if (data.message) {
        setLastMessages((prev) => ({
          ...prev,
          [data.from]: data.message,
        }));

        setUnread((prev) => ({
          ...prev,
          [data.from]: (prev[data.from] || 0) + 1,
        }));
      }

      // ✍️ Typing
      if (data.typing) {
        setTypingUsers((prev) => ({
          ...prev,
          [data.from]: true,
        }));

        setTimeout(() => {
          setTypingUsers((prev) => ({
            ...prev,
            [data.from]: false,
          }));
        }, 1500);
      }
    };

    socketRef.current = ws;
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white">

      {/* 🔍 SEARCH */}
      <input
        type="text"
        placeholder="Search matches..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 mb-6 rounded bg-gray-800 text-white"
      />

      <h1 className="text-2xl mb-4">🔥 Your Matches</h1>

      {filtered.map((m) => (
        <div
          key={m.uid}
          className="flex items-center justify-between bg-gray-900 p-4 rounded mb-4 hover:bg-gray-800 transition"
        >
          {/* LEFT */}
          <div
            onClick={() => {
              navigate(`/chat/${m.uid}`);
              setUnread((prev) => ({ ...prev, [m.uid]: 0 }));
            }}
            className="flex items-center gap-4 cursor-pointer flex-1"
          >

            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                👤
              </div>

              {/* 🟢 ONLINE */}
              {onlineUsers.includes(m.uid) && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full"></span>
              )}
            </div>

            {/* INFO */}
            <div>
              <h2 className="font-semibold">
                {m.username || m.email}
              </h2>

              {/* ✍️ Typing OR message */}
              <p className="text-gray-400 text-sm">
                {typingUsers[m.uid]
                  ? "Typing..."
                  : lastMessages[m.uid] || m.skills}
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3">

            {/* 🔴 UNREAD */}
            {unread[m.uid] > 0 && (
              <span className="bg-red-500 px-2 py-1 text-xs rounded-full">
                {unread[m.uid]}
              </span>
            )}

            {/* 💬 */}
            <button
              onClick={() => navigate(`/chat/${m.uid}`)}
              className="bg-gray-700 px-3 py-2 rounded"
            >
              💬
            </button>

            {/* 📞 */}
            <button
              onClick={() => navigate(`/call/${m.uid}`)}
              className="bg-green-500 px-3 py-2 rounded"
            >
              📞Call
            </button>
          </div>
        </div>
      ))}

    </div>
  );
}