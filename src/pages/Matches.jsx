import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { API, WS } from "../api/configApi";

export default function Matches() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [unread, setUnread] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [lastActive, setLastActive] = useState({});
  const [popup, setPopup] = useState(null);

  const socketRef = useRef(null);

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (!user) return;

    fetchMatches();
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [user]);

  const fetchMatches = async () => {
    const token = await user.getIdToken(true);

    const res = await fetch(`${API}/match/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    const arr = Array.isArray(data) ? data : [];
    setMatches(arr);
    setFiltered(arr);
    setLoading(false);
  };

  useEffect(() => {
    const result = matches.filter((m) =>
      (m.username || m.email || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
    setFiltered(result);
  }, [search, matches]);

  const acceptInvite = async (uid) => {
    const token = await user.getIdToken(true);

    await fetch(`${API}/match/accept`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid }),
    });

    setPopup("🎉 Match Created!");
    setTimeout(() => setPopup(null), 2000);

    fetchMatches();
    setTimeout(() => navigate(`/chat/${uid}`), 500);
  };

  const rejectInvite = async (uid) => {
    const token = await user.getIdToken(true);

    await fetch(`${API}/match/reject`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid }),
    });

    fetchMatches();
  };

  const connectSocket = async () => {
    if (socketRef.current) return;

    const token = await user.getIdToken(true);
    const payload = JSON.parse(atob(token.split(".")[1]));
    const myUid = payload.uid;

    const ws = new WebSocket(`${WS}/chat/ws/${myUid}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "match") {
        setPopup("🎉 New Match!");
        fetchMatches();
      }

      if (data.type === "invite") {
        setPopup("📩 New Request!");
        fetchMatches();
      }

      if (data.type === "invite_accepted") {
        setPopup("✅ Request Accepted!");
        fetchMatches();
      }

      // 🔥 TYPING
      if (data.type === "typing") {
        setTypingUsers((prev) => ({
          ...prev,
          [data.from]: true,
        }));

        setTimeout(() => {
          setTypingUsers((prev) => ({
            ...prev,
            [data.from]: false,
          }));
        }, 2000);
      }

      // 🔥 SEEN
      if (data.type === "seen") {
        setUnread((prev) => ({
          ...prev,
          [data.from]: 0,
        }));
      }

      // 🔥 LAST ACTIVE
      if (data.type === "last_active") {
        setLastActive((prev) => ({
          ...prev,
          [data.uid]: data.time,
        }));
      }

      if (data.type === "online") {
        setOnlineUsers(data.users);
      }

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

  const formatLastSeen = (time) => {
    if (!time) return "";
    const diff = Math.floor((Date.now() - new Date(time)) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  if (loading) {
    return <div className="text-white p-10 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      {popup && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-green-500 px-6 py-2 rounded shadow-lg z-50 animate-bounce">
          {popup}
        </div>
      )}

      <input
        type="text"
        placeholder="Search matches..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 mb-6 rounded bg-gray-800"
      />

      <h1 className="text-2xl mb-4 flex items-center gap-2">
        🔥 Your Matches
        {totalUnread > 0 && (
          <span className="bg-red-500 text-white px-2 py-1 text-xs rounded-full">
            {totalUnread}
          </span>
        )}
      </h1>

      {filtered.length === 0 ? (
        <p className="text-gray-500">No matches / requests yet</p>
      ) : (
        filtered.map((m) => (
          <div
            key={m.uid}
            className="flex justify-between bg-gray-900 p-4 rounded mb-3"
          >
            <div
              onClick={() => {
                if (m.type === "match") {
                  setUnread((prev) => ({ ...prev, [m.uid]: 0 }));
                  navigate(`/chat/${m.uid}`);
                }
              }}
              className="flex gap-3 cursor-pointer"
            >
              <div className="w-12 h-12 bg-gray-700 rounded-full relative flex items-center justify-center">
                👤

                {onlineUsers.includes(m.uid) && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></span>
                )}
              </div>

              <div>
                <h3 className="flex items-center gap-2">
                  {m.username || m.email}

                  {unread[m.uid] > 0 && (
                    <span className="bg-red-500 text-xs px-2 rounded-full">
                      {unread[m.uid]}
                    </span>
                  )}
                </h3>

                <p className="text-gray-400 text-sm">
                  {typingUsers[m.uid]
                    ? "✍️ typing..."
                    : lastMessages[m.uid] || m.skills}
                </p>

                {!onlineUsers.includes(m.uid) && lastActive[m.uid] && (
                  <p className="text-xs text-gray-500">
                    last seen {formatLastSeen(lastActive[m.uid])}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 items-center">
              {m.type === "match" ? (
                <>
                  <button onClick={() => navigate(`/chat/${m.uid}`)}>💬</button>
                  <button onClick={() => navigate(`/call/${m.uid}`)}>📞</button>
                </>
              ) : m.type === "request" ? (
                <>
                  <button onClick={() => acceptInvite(m.uid)}>❤️</button>
                  <button onClick={() => rejectInvite(m.uid)}>❌</button>
                </>
              ) : (
                <span className="text-yellow-400 text-sm">⏳ Sent</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}