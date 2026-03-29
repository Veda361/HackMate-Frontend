import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { swipeUser } from "../api/userApi";
import { API, WS } from "../api/configApi";

export default function Swipe() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);
  const [seenUsers, setSeenUsers] = useState(new Set()); // ✅ used now

  const cardRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchProfiles();
      connectSocket();
    }

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [user]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);

      const token = await user.getIdToken(true);

      const res = await fetch(`${API}/user/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      const fixed = Array.isArray(data)
        ? data
            .map((u, i) => ({
              ...u,
              uid: u.uid || u.firebase_uid || i,
              avatar:
                u.avatar ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${u.username || u.email}`,
            }))
            // ✅ FILTER DUPLICATES
            .filter((u) => !seenUsers.has(u.uid))
        : [];

      // ✅ append instead of replace
      setProfiles((prev) => [...prev, ...fixed]);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      }

      if (data.type === "invite") {
        setPopup("📩 New Request!");
      }

      setTimeout(() => setPopup(null), 2000);
    };

    socketRef.current = ws;
  };

  // ❤️ ADD FRIEND
  const handleAddFriend = async () => {
    const profile = profiles[0];
    if (!profile) return;

    // ✅ MARK SEEN
    setSeenUsers((prev) => new Set(prev).add(profile.uid));

    const res = await swipeUser(user, profile.uid, true);

    animateCard("right");
    removeTopCard();

    if (res?.match) {
      setPopup("🎉 Match!");
      setTimeout(() => navigate(`/chat/${profile.uid}`), 1000);
    }
  };

  // ❌ REJECT
  const handleReject = async () => {
    const profile = profiles[0];
    if (!profile) return;

    // ✅ MARK SEEN
    setSeenUsers((prev) => new Set(prev).add(profile.uid));

    await swipeUser(user, profile.uid, false);

    animateCard("left");
    removeTopCard();
  };

  const animateCard = (dir) => {
    if (!cardRef.current) return;

    cardRef.current.style.transition = "transform 0.4s ease";
    cardRef.current.style.transform =
      dir === "right"
        ? "translateX(500px) rotate(20deg)"
        : "translateX(-500px) rotate(-20deg)";
  };

  const removeTopCard = () => {
    setTimeout(() => {
      setProfiles((prev) => {
        const updated = prev.slice(1);

        if (updated.length <= 2) fetchProfiles();

        return updated;
      });

      if (cardRef.current) {
        cardRef.current.style.transition = "none";
        cardRef.current.style.transform = "translateX(0)";
      }
    }, 400);
  };

  if (loading) {
    return <div className="text-white text-center mt-20">Loading...</div>;
  }

  if (!profiles.length) {
    return <div className="text-white text-center mt-20">No users 🚀</div>;
  }

  const current = profiles[0];
  const next = profiles[1];

  return (
    <div className="h-screen flex items-center justify-center bg-black text-white relative">

      {popup && (
        <div className="absolute top-10 bg-green-500 px-6 py-2 rounded animate-bounce z-50">
          {popup}
        </div>
      )}

      <div className="relative w-80 h-[450px]">

        {next && (
          <div className="absolute w-full h-full rounded-3xl overflow-hidden scale-95 opacity-50">
            <img src={next.avatar} className="w-full h-full object-cover" />
          </div>
        )}

        <div
          ref={cardRef}
          className="absolute w-full h-full rounded-3xl overflow-hidden shadow-2xl"
        >
          <img src={current.avatar} className="w-full h-full object-cover" />

          <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent">
            <h2 className="text-xl font-bold">
              {current.username || current.email}
            </h2>
            <p className="text-gray-300 text-sm">
              {current.skills || "No skills"}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 flex gap-6">
        <button
          onClick={handleReject}
          className="bg-red-500 px-6 py-3 rounded-full text-lg hover:scale-110"
        >
          ❌
        </button>

        <button
          onClick={handleAddFriend}
          className="bg-pink-500 px-6 py-3 rounded-full text-lg hover:scale-110"
        >
          ❤️ Add Friend
        </button>
      </div>
    </div>
  );
}