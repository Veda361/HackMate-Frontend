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
  const [seenUsers, setSeenUsers] = useState(new Set());
  const [offset, setOffset] = useState(0);

  const LIMIT = 5;

  const cardRef = useRef(null);
  const socketRef = useRef(null);

  const startX = useRef(0);
  const currentX = useRef(0);
  const startTime = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (user) {
      fetchProfiles(0);
      connectSocket();
    }

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [user]);

  const fetchProfiles = async (customOffset = offset) => {
    try {
      setLoading(true);

      const token = await user.getIdToken(true);

      const res = await fetch(
        `${API}/user/suggestions?limit=${LIMIT}&offset=${customOffset}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

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
            .filter((u) => !seenUsers.has(u.uid))
        : [];

      setProfiles((prev) => [...prev, ...fixed]);
      setOffset((prev) => prev + LIMIT);

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

      if (data.type === "match") setPopup("🎉 New Match!");
      if (data.type === "invite") setPopup("📩 New Request!");

      setTimeout(() => setPopup(null), 2000);
    };

    socketRef.current = ws;
  };

  const handleAddFriend = async () => {
    const profile = profiles[0];
    if (!profile) return;

    setSeenUsers((prev) => new Set(prev).add(profile.uid));

    const res = await swipeUser(user, profile.uid, true);

    animateCard("right");
    removeTopCard();

    if (res?.match) {
      setPopup("🎉 Match!");
      setTimeout(() => navigate(`/chat/${profile.uid}`), 1000);
    }
  };

  const handleReject = async () => {
    const profile = profiles[0];
    if (!profile) return;

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
        cardRef.current.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
      }
    }, 400);
  };

  const startDrag = (x) => {
    isDragging.current = true;
    startX.current = x;
    startTime.current = Date.now();

    if (cardRef.current) cardRef.current.style.transition = "none";
  };

  const onMove = (x) => {
    if (!isDragging.current || !cardRef.current) return;

    currentX.current = x - startX.current;

    const rotate = currentX.current / 15;
    const tilt = currentX.current / 30;

    if (currentX.current > 80) {
      cardRef.current.style.boxShadow = "0 0 40px rgba(34,211,238,0.8)";
    } else if (currentX.current < -80) {
      cardRef.current.style.boxShadow = "0 0 40px rgba(239,68,68,0.8)";
    } else {
      cardRef.current.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
    }

    cardRef.current.style.transform =
      `translateX(${currentX.current}px) rotate(${rotate}deg) rotateY(${tilt}deg)`;
  };

  const endDrag = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const dx = currentX.current;
    const dt = Date.now() - startTime.current;
    const velocity = dx / dt;

    if (dx > 120 || velocity > 0.5) handleAddFriend();
    else if (dx < -120 || velocity < -0.5) handleReject();
    else {
      if (cardRef.current) {
        cardRef.current.style.transition = "transform 0.3s ease";
        cardRef.current.style.transform = "translateX(0)";
        cardRef.current.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
      }
    }

    currentX.current = 0;
  };

  if (loading && profiles.length === 0) {
    return <div className="text-white text-center mt-20">Loading...</div>;
  }

  if (!profiles.length) {
    return <div className="text-white text-center mt-20">No users 🚀</div>;
  }

  const current = profiles[0];
  const next = profiles[1];

  return (
    <div
      className="h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${current.avatar})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onMouseMove={(e) => onMove(e.clientX)}
      onMouseUp={endDrag}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={endDrag}
    >
      {/* DARK GLASS BG */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl"></div>

      {/* POPUP */}
      {popup && (
        <div className="absolute top-10 bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-2 rounded-full shadow-lg animate-bounce z-50">
          {popup}
        </div>
      )}

      <div className="relative w-80 h-[450px] z-10">

        {profiles[2] && (
          <div className="absolute w-full h-full scale-90 opacity-30">
            <img src={profiles[2].avatar} className="w-full h-full object-cover rounded-3xl" />
          </div>
        )}

        {next && (
          <div className="absolute w-full h-full scale-95 opacity-50">
            <img src={next.avatar} className="w-full h-full object-cover rounded-3xl" />
          </div>
        )}

        <div
          ref={cardRef}
          onMouseDown={(e) => startDrag(e.clientX)}
          onTouchStart={(e) => startDrag(e.touches[0].clientX)}
          className="absolute w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(34,211,238,0.2)]"
        >
          <img src={current.avatar} className="w-full h-full object-cover" />

          <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent">
            <h2 className="text-xl font-bold">
              {current.username || current.email}
            </h2>
            <p className="text-gray-300 text-sm">
              {current.skills || "No skills"}
            </p>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="absolute bottom-10 flex gap-6 z-10">
        <button
          onClick={handleReject}
          className="bg-gradient-to-r from-red-500 to-pink-500 px-6 py-3 rounded-full shadow-lg hover:scale-110 transition"
        >
          ❌
        </button>

        <button
          onClick={handleAddFriend}
          className="bg-gradient-to-r from-blue-500 to-cyan-400 px-6 py-3 rounded-full shadow-lg hover:scale-110 transition"
        >
          ❤️
        </button>
      </div>
    </div>
  );
}