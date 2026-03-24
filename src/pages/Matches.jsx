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

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchMatches(), fetchSuggestions()]);
    setLoading(false);
  };

  // ✅ MATCHES
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
      console.error(err);
    }
  };

  // ✅ SUGGESTIONS
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
      console.error(err);
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

  // ❤️ LIKE
  const handleLike = async (uid) => {
    try {
      const res = await swipeUser(user, uid, true);

      setSuggestions((prev) => prev.filter((u) => u.uid !== uid));

      if (res?.msg?.includes("MATCH")) {
        setMatchPopup(uid);
        setTimeout(() => setMatchPopup(null), 3000);
      }

      fetchMatches();
    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 NEW: SEND INVITE
  const sendInvite = async (uid) => {
    try {
      const token = await user.getIdToken(true);

      await fetch(`${API}/invite/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid }),
      });

      alert("📩 Invite sent");
    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 NEW: ACCEPT INVITE
  const acceptInvite = async (uid) => {
    try {
      const token = await user.getIdToken(true);

      await fetch(`${API}/invite/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid }),
      });

      fetchMatches();
    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 WEBSOCKET (unchanged)
  const connectSocket = async () => {
    try {
      if (socketRef.current) return;

      const token = await user.getIdToken(true);
      const payload = JSON.parse(atob(token.split(".")[1]));
      const myUid = payload.user_id || payload.uid;

      const ws = new WebSocket(`${WS}/chat/ws/${myUid}`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "match") {
          setMatchPopup(data.user);
          fetchMatches();
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
      };

      socketRef.current = ws;
    } catch (err) {
      console.error(err);
    }
  };

  // ⏳ LOADING
  if (loading) {
    return <div className="text-white p-10 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 bg-black min-h-screen text-white">

      <input
        type="text"
        placeholder="Search matches..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 mb-6 rounded bg-gray-800"
      />

      <h1 className="text-2xl mt-6 mb-4">🔥 Your Matches</h1>

      {filtered.map((m) => (
        <div
          key={m.uid}
          className="flex justify-between bg-gray-900 p-4 rounded mb-3"
        >
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
              👤
            </div>

            <div>
              <h3>{m.username || m.email}</h3>
              <p className="text-gray-400 text-sm">{m.skills}</p>
            </div>
          </div>

          <div className="flex gap-2">

            {/* 🔥 ONLY CHANGE HERE */}
            {m.chat_enabled ? (
              <>
                <button onClick={() => navigate(`/chat/${m.uid}`)}>💬</button>
                <button onClick={() => navigate(`/call/${m.uid}`)}>📞</button>
              </>
            ) : (
              <>
                <button onClick={() => sendInvite(m.uid)}>Invite</button>
                <button onClick={() => acceptInvite(m.uid)}>Accept</button>
              </>
            )}

          </div>
        </div>
      ))}
    </div>
  );
}