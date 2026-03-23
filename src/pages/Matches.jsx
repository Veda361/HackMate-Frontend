import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { API, WS } from "../api/configApi";
import { swipeUser } from "../api/userApi";

export default function Matches() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [unread, setUnread] = useState({});

  const socketRef = useRef(null);
  const reconnectRef = useRef(null);

  // 🚀 INIT
  useEffect(() => {
    if (!user) return;

    fetchAll();
    connectSocket();

    return () => {
      socketRef.current?.close();
      clearTimeout(reconnectRef.current);
    };
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchMatches(), fetchSuggestions()]);
    setLoading(false);
  };

  // 🔥 FETCH MATCHES
  const fetchMatches = async () => {
    try {
      const token = await user.getIdToken();

      const res = await fetch(`${API}/match/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed matches");

      const data = await res.json();

      const arr = Array.isArray(data) ? data : [];
      setMatches(arr);
      setFiltered(arr);
    } catch (err) {
      console.error("Match fetch error:", err);
    }
  };

  // 🔥 FETCH SUGGESTIONS
  const fetchSuggestions = async () => {
    try {
      const token = await user.getIdToken();

      const res = await fetch(`${API}/match`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed suggestions");

      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Suggestion error:", err);
    }
  };

  // 🔍 SEARCH
  useEffect(() => {
    const result = matches.filter((m) =>
      (m.username || m.email || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
    setFiltered(result);
  }, [search, matches]);

  // ❤️ LIKE USER
  const handleLike = async (uid) => {
    try {
      const token = await user.getIdToken();
      const res = await swipeUser(token, uid, true);

      console.log("LIKE:", res);

      setSuggestions((prev) => prev.filter((u) => u.uid !== uid));
      fetchMatches();
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  // 🔥 WEBSOCKET (STABLE VERSION)
  const connectSocket = async () => {
    try {
      if (socketRef.current) return; // 🔥 prevent duplicate

      const token = await user.getIdToken();
      const payload = JSON.parse(atob(token.split(".")[1]));
      const myUid = payload.user_id || payload.uid;

      if (!myUid) return;

      const ws = new WebSocket(`${WS}/chat/ws/${myUid}`);

      ws.onopen = () => {
        console.log("WS Connected ✅");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.online) setOnlineUsers(data.online);

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

      ws.onerror = (err) => {
        console.error("WS Error ❌", err);
      };

      ws.onclose = () => {
        console.log("WS Closed ❌ → reconnecting...");

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

  // ⏳ LOADING
  if (loading) {
    return <div className="text-white p-10 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 bg-black min-h-screen text-white">

      {/* 🔍 SEARCH */}
      <input
        type="text"
        placeholder="Search matches..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 mb-6 rounded bg-gray-800"
      />

      {/* 🧠 SUGGESTIONS */}
      <h2 className="text-xl mb-3">🧠 Suggested</h2>

      {suggestions.length === 0 && (
        <p className="text-gray-500 mb-4">No suggestions</p>
      )}

      {suggestions.map((u) => (
        <div key={u.uid} className="flex justify-between bg-gray-800 p-3 rounded mb-2">
          <div>
            <h3>{u.username || u.email}</h3>
            <p className="text-sm text-gray-400">{u.skills}</p>
          </div>

          <button
            onClick={() => handleLike(u.uid)}
            className="bg-green-500 px-3 py-1 rounded"
          >
            ❤️
          </button>
        </div>
      ))}

      {/* 🔥 MATCHES */}
      <h1 className="text-2xl mt-6 mb-4">🔥 Your Matches</h1>

      {filtered.length === 0 && (
        <p className="text-gray-500">No matches yet</p>
      )}

      {filtered.map((m) => (
        <div key={m.uid} className="flex justify-between bg-gray-900 p-4 rounded mb-3">

          {/* LEFT */}
          <div
            onClick={() => navigate(`/chat/${m.uid}`)}
            className="flex gap-3 cursor-pointer"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                👤
              </div>

              {onlineUsers.includes(m.uid) && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full"></span>
              )}
            </div>

            <div>
              <h3>{m.username || m.email}</h3>
              <p className="text-gray-400 text-sm">
                {typingUsers[m.uid]
                  ? "Typing..."
                  : lastMessages[m.uid] || m.skills}
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex gap-2 items-center">

            {unread[m.uid] > 0 && (
              <span className="bg-red-500 px-2 rounded">
                {unread[m.uid]}
              </span>
            )}

            <button
              onClick={() => navigate(`/chat/${m.uid}`)}
              className="bg-gray-700 px-2 py-1 rounded"
            >
              💬
            </button>

            <button
              onClick={() => navigate(`/call/${m.uid}`)}
              className="bg-green-500 px-2 py-1 rounded"
            >
              📞
            </button>

          </div>
        </div>
      ))}
    </div>
  );
}