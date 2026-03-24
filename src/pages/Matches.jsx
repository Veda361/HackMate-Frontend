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
  const [lastMessages, setLastMessages] = useState({});
  const [unread, setUnread] = useState({});
  const [matchPopup, setMatchPopup] = useState(null);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    fetchAll();
    connectSocket();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchMatches(), fetchSuggestions()]);
    setLoading(false);
  };

  const fetchMatches = async () => {
    const token = await user.getIdToken(true);

    const res = await fetch(`${API}/match/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    const arr = Array.isArray(data) ? data : [];
    setMatches(arr);
    setFiltered(arr);
  };

  const fetchSuggestions = async () => {
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
  };

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
    const res = await swipeUser(user, uid, true);

    setSuggestions((prev) => prev.filter((u) => u.uid !== uid));

    if (res?.msg?.includes("MATCH")) {
      setMatchPopup(uid);
      setTimeout(() => setMatchPopup(null), 3000);
    }

    fetchMatches();
  };

  // 🔥 SEND INVITE
  const sendInvite = async (uid) => {
    const token = await user.getIdToken(true);

    await fetch(`${API}/invite/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid }),
    });

    fetchMatches();
  };

  // 🔥 ACCEPT INVITE
  const acceptInvite = async (uid) => {
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
  };

  // 🔥 SOCKET
  const connectSocket = async () => {
    if (socketRef.current) return;

    const token = await user.getIdToken(true);
    const payload = JSON.parse(atob(token.split(".")[1]));
    const myUid = payload.uid;

    const ws = new WebSocket(`${WS}/chat/ws/${myUid}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "match") {
        setMatchPopup(data.user);
        fetchMatches();
      }

      if (data.type === "invite") {
        alert("📩 New Chat Invite!");
        fetchMatches();
      }

      if (data.type === "invite_accepted") {
        alert("✅ Invite accepted!");
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
  };

  if (loading) {
    return <div className="text-white p-10 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 bg-black min-h-screen text-white">

      {matchPopup && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-green-500 px-6 py-2 rounded">
          🎉 Match!
        </div>
      )}

      <input
        type="text"
        placeholder="Search matches..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 mb-6 rounded bg-gray-800"
      />

      <h1 className="text-2xl mb-4">🔥 Your Matches</h1>

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

            {m.chat_enabled ? (
              <>
                <button onClick={() => navigate(`/chat/${m.uid}`)}>💬</button>
                <button onClick={() => navigate(`/call/${m.uid}`)}>📞</button>
              </>
            ) : m.is_sender ? (
              <button className="bg-gray-600 px-3 py-1 rounded">
                Sent
              </button>
            ) : m.can_accept ? (
              <button
                onClick={() => acceptInvite(m.uid)}
                className="bg-blue-500 px-3 py-1 rounded"
              >
                Accept
              </button>
            ) : (
              <button
                onClick={() => sendInvite(m.uid)}
                className="bg-yellow-500 px-3 py-1 rounded"
              >
                Invite
              </button>
            )}

          </div>
        </div>
      ))}
    </div>
  );
}