import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { swipeUser } from "../api/userApi";
import { API } from "../api/configApi";

export default function Swipe() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState(false);

  const cardRef = useRef(null);

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

      console.log("🔥 suggestions:", data); // DEBUG

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

  // ❤️ ADD FRIEND (same swipe logic)
  const handleAddFriend = async () => {
    const profile = profiles[0];
    if (!profile) return;

    const res = await swipeUser(user, profile.uid, true);

    // animation FIXED
    if (cardRef.current) {
      cardRef.current.style.transition = "transform 0.4s ease";
      cardRef.current.style.transform = "translateX(400px) rotate(15deg)";
    }

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

    if (res?.match) {
      setMatchPopup(true);
      setTimeout(() => setMatchPopup(false), 2000);

      navigate(`/chat/${profile.uid}`);
    }
  };

  // ❌ REJECT
  const handleReject = async () => {
    const profile = profiles[0];
    if (!profile) return;

    await swipeUser(user, profile.uid, false);

    if (cardRef.current) {
      cardRef.current.style.transition = "transform 0.4s ease";
      cardRef.current.style.transform = "translateX(-400px) rotate(-15deg)";
    }

    setTimeout(() => {
      setProfiles((prev) => prev.slice(1));

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
    return <div className="text-white text-center mt-20">No users found 🚀</div>;
  }

  const profile = profiles[0];

  return (
    <div className="h-screen flex items-center justify-center bg-black text-white">

      {/* MATCH POPUP */}
      {matchPopup && (
        <div className="fixed top-10 bg-green-500 px-6 py-2 rounded animate-bounce">
          🎉 Match Found!
        </div>
      )}

      <div className="w-80">

        {/* CARD */}
        <div
          ref={cardRef}
          className="rounded-3xl overflow-hidden shadow-2xl"
        >
          <img
            src={profile.avatar}
            className="w-full h-[400px] object-cover"
          />

          <div className="p-4 bg-gray-900">
            <h2 className="text-xl font-bold">
              {profile.username || profile.email}
            </h2>

            <p className="text-gray-400 text-sm">
              {profile.skills || "No skills"}
            </p>
          </div>
        </div>

        {/* 🔥 NEW BUTTON UI */}
        <div className="flex justify-between mt-6">

          <button
            onClick={handleReject}
            className="bg-red-500 px-6 py-3 rounded-full text-lg hover:scale-110 transition"
          >
            ❌ Skip
          </button>

          <button
            onClick={handleAddFriend}
            className="bg-pink-500 px-6 py-3 rounded-full text-lg hover:scale-110 transition flex items-center gap-2"
          >
            ❤️ Add Friend
          </button>

        </div>
      </div>
    </div>
  );
}