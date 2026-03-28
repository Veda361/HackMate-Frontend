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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [unread, setUnread] = useState({});
  const [popup, setPopup] = useState(null);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    fetchMatches();
    connectSocket();
  }, [user]);

  // 🔥 FETCH MATCHES + REQUESTS
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

  // 🔍 SEARCH
  useEffect(() => {
    const result = matches.filter((m) =>
      (m.username || m.email || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
    setFiltered(result);
  }, [search, matches]);

  // ❤️ ACCEPT REQUEST
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

    // 🔥 instant UI update
    setPopup("🎉 Match Created!");
    setTimeout(() => setPopup(null), 2000);

    fetchMatches();

    // 🔥 AUTO OPEN CHAT
    setTimeout(() => navigate(`/chat/${uid}`), 500);
  };

  // ❌ REJECT REQUEST
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

  // 🔥 SOCKET (REAL-TIME)
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

  if (loading) {
    return <div className="text-white p-10 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      {/* 🔔 POPUP */}
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

      <h1 className="text-2xl mb-4">🔥 Your Matches</h1>

      {filtered.length === 0 ? (
        <p className="text-gray-500">No matches / requests yet</p>
      ) : (
        filtered.map((m) => (
          <div
            key={m.uid}
            className="flex justify-between bg-gray-900 p-4 rounded mb-3 hover:bg-gray-800 transition"
          >
            <div
              onClick={() => m.type === "match" && navigate(`/chat/${m.uid}`)}
              className="flex gap-3 cursor-pointer"
            >
              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                👤
              </div>

              <div>
                <h3>{m.username || m.email}</h3>
                <p className="text-gray-400 text-sm">
                  {lastMessages[m.uid] || m.skills}
                </p>
              </div>
            </div>

            {/* 🔥 ACTION BUTTONS */}
            <div className="flex gap-2 items-center">
              {m.type === "match" ? (
                <>
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
                </>
              ) : (
                <>
                  <button
                    onClick={() => acceptInvite(m.uid)}
                    className="bg-green-500 px-3 py-1 rounded"
                  >
                    ❤️ Accept
                  </button>

                  <button
                    onClick={() => rejectInvite(m.uid)}
                    className="bg-red-500 px-3 py-1 rounded"
                  >
                    ❌ Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
