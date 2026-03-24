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

  // 🔥 NEW: match popup
  const [matchPopup, setMatchPopup] = useState(null);

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

  // 🔥 FETCH ALL
  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchMatches(), fetchSuggestions()]);
    setLoading(false);
  };

  // ✅ FETCH MATCHES
  const fetchMatches = async () => {
    try {
      const token = await user.getIdToken(true);

      const res = await fetch(`${API}/match/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      const arr = Array.isArray(data) ? data : [];
      setMatches(arr);
      setFiltered(arr);
    } catch (err) {
      console.error("Match fetch error:", err);
    }
  };

  // ✅ FETCH SUGGESTIONS
  const fetchSuggestions = async () => {
    try {
      const token = await user.getIdToken(true);

      const res = await fetch(`${API}/user/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      const arr = Array.isArray(data)
        ? data.map((u, i) => ({
            ...u,
            uid: u.uid || u.firebase_uid || u.email || i,
          }))
        : [];

      setSuggestions(arr);
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
      const res = await swipeUser(user, uid, true);

      // remove from suggestions instantly
      setSuggestions((prev) => prev.filter((u) => u.uid !== uid));

      // fallback if WS delay
      if (res?.msg?.includes("MATCH")) {
        setMatchPopup(uid);
        setTimeout(() => setMatchPopup(null), 3000);
      }

      fetchMatches();
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  // 🔥 WEBSOCKET
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
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // 🔥 REAL-TIME MATCH EVENT
        if (data.type === "match") {
          console.log("🎉 MATCH:", data);

          setMatchPopup(data.user);
          fetchMatches();

          setTimeout(() => setMatchPopup(null), 3000);
        }

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
    return (
      <div className="text-white p-10 text-center animate-pulse">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 bg-black min-h-screen text-white">

      {/* 🎉 MATCH POPUP */}
      {matchPopup && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-green-500 px-6 py-3 rounded-xl shadow-lg z-50 animate-bounce">
          🎉 It's a Match!
        </div>
      )}

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

      {suggestions.length === 0 ? (
        <p className="text-gray-500 mb-4">No suggestions yet</p>
      ) : (
        suggestions.map((u) => (
          <div
            key={u.uid}
            className="flex justify-between bg-gray-800 p-3 rounded mb-2 hover:bg-gray-700 transition"
          >
            <div>
              <h3>{u.username || u.email}</h3>
              <p className="text-sm text-gray-400">{u.skills}</p>
            </div>

            <button
              onClick={() => handleLike(u.uid)}
              className="bg-green-500 px-3 py-1 rounded hover:scale-105 transition"
            >
              ❤️
            </button>
          </div>
        ))
      )}

      {/* 🔥 MATCHES */}
      <h1 className="text-2xl mt-6 mb-4">🔥 Your Matches</h1>

      {filtered.length === 0 ? (
        <p className="text-gray-500">No matches yet</p>
      ) : (
        filtered.map((m) => (
          <div
            key={m.uid}
            className="flex justify-between bg-gray-900 p-4 rounded mb-3 hover:bg-gray-800 transition"
          >
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
        ))
      )}
    </div>
  );
}