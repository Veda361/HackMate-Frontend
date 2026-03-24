import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { swipeUser } from "../api/userApi";
import { API } from "../api/configApi";

export default function Swipe() {
  const { user } = useAuth();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState(false);
  const [history, setHistory] = useState([]);
  const [glow, setGlow] = useState(null); // 🔥 NEW

  const cardRef = useRef(null);

  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  // 🔊 SOUND
  let swipeSound;
  try {
    swipeSound = new Audio("https://www.soundjay.com/buttons/sounds/button-16.mp3");
  } catch {
    swipeSound = null;
  }

  useEffect(() => {
    if (user) fetchProfiles();
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
        ? data.map((u, i) => ({
            ...u,
            uid: u.uid || u.firebase_uid || i,
            avatar:
              u.avatar ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${u.username || u.email}`,
          }))
        : [];

      setProfiles(fixed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 SWIPE
  const handleSwipe = async (liked) => {
    const profile = profiles[0];
    if (!profile) return;

    setHistory((prev) => [{ ...profile, liked }, ...prev]);

    if (swipeSound) swipeSound.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(100);

    const res = await swipeUser(user, profile.uid, liked);

    cardRef.current.style.transition = "transform 0.4s ease";
    cardRef.current.style.transform = liked
      ? "translateX(500px) rotate(20deg)"
      : "translateX(-500px) rotate(-20deg)";

    setTimeout(() => {
      setProfiles((prev) => prev.slice(1));
      setGlow(null);

      if (cardRef.current) {
        cardRef.current.style.transition = "none";
        cardRef.current.style.transform = "translateX(0)";
      }

      if (profiles.length <= 2) fetchProfiles();
    }, 400);

    if (res?.msg?.includes("MATCH")) {
      setMatchPopup(true);
      setTimeout(() => setMatchPopup(false), 2500);
    }
  };

  // 🔥 UNDO
  const handleUndo = () => {
    if (!history.length) return;

    const last = history[0];
    setProfiles((prev) => [last, ...prev]);
    setHistory((prev) => prev.slice(1));

    setGlow(null);

    if (cardRef.current) {
      cardRef.current.style.transform = "translateX(0)";
    }
  };

  // 🖱️ / 📱 START
  const startDrag = (x) => {
    isDragging.current = true;
    startX.current = x;
  };

  // MOVE
  const onMove = (x) => {
    if (!isDragging.current) return;

    currentX.current = x - startX.current;
    const rotate = currentX.current / 20;

    // 🔥 GLOW LOGIC
    if (currentX.current > 80) setGlow("right");
    else if (currentX.current < -80) setGlow("left");
    else setGlow(null);

    cardRef.current.style.transform = `translateX(${currentX.current}px) rotate(${rotate}deg)`;
  };

  // END
  const endDrag = () => {
    isDragging.current = false;

    if (currentX.current > 120) {
      handleSwipe(true);
    } else if (currentX.current < -120) {
      handleSwipe(false);
    } else {
      setGlow(null);
      cardRef.current.style.transition = "transform 0.3s ease";
      cardRef.current.style.transform = "translateX(0)";
    }

    currentX.current = 0;
  };

  // EVENTS
  const handleMouseDown = (e) => startDrag(e.clientX);
  const handleMouseMove = (e) => onMove(e.clientX);
  const handleMouseUp = () => endDrag();

  const handleTouchStart = (e) => startDrag(e.touches[0].clientX);
  const handleTouchMove = (e) => onMove(e.touches[0].clientX);
  const handleTouchEnd = () => endDrag();

  if (loading) {
    return <div className="text-white text-center mt-20">Loading...</div>;
  }

  if (!profiles.length) {
    return <div className="text-white text-center mt-20">No more profiles 🚀</div>;
  }

  const profile = profiles[0];

  return (
    <div
      className="h-screen flex items-center justify-center text-white relative overflow-hidden"
      style={{
        backgroundImage: `url(${profile.avatar})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 🌫️ BLUR OVERLAY */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl"></div>

      {/* 🎉 MATCH */}
      {matchPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-green-500 px-8 py-6 rounded-2xl text-xl font-bold animate-bounce">
            🎉 It's a Match!
          </div>
        </div>
      )}

      {/* 🃏 CARD */}
      <div className="relative w-80 h-[450px] z-10">

        <div
          ref={cardRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`w-full h-full rounded-3xl overflow-hidden shadow-2xl transition 
            ${glow === "right" ? "ring-4 ring-green-500" : ""}
            ${glow === "left" ? "ring-4 ring-red-500" : ""}
          `}
        >
          {/* IMAGE */}
          <img
            src={profile.avatar}
            alt="profile"
            className="w-full h-full object-cover"
          />

          {/* INFO OVERLAY */}
          <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent">
            <h2 className="text-xl font-semibold">
              {profile.username || profile.email}
            </h2>

            <p className="text-sm text-gray-300">
              {profile.skills || "No skills"}
            </p>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex justify-center gap-4 mt-4">
          <button onClick={() => handleSwipe(false)} className="bg-red-500 px-5 py-2 rounded-full">
            ❌
          </button>

          <button onClick={() => handleSwipe(true)} className="bg-green-500 px-5 py-2 rounded-full">
            ❤️
          </button>

          <button onClick={handleUndo} className="bg-yellow-500 px-5 py-2 rounded-full">
            ↩️
          </button>
        </div>
      </div>
    </div>
  );
}