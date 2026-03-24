import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { swipeUser } from "../api/userApi";
import { API } from "../api/configApi";

export default function Swipe() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [matchPopup, setMatchPopup] = useState(false);

  useEffect(() => {
    if (user) fetchProfiles();
  }, [user]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setMsg("");

      const token = await user.getIdToken(true);

      // ✅ CORRECT API
      const res = await fetch(`${API}/user/suggestions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      const fixed = Array.isArray(data)
        ? data.map((u, i) => ({
            ...u,
            uid: u.uid || u.firebase_uid || u.email || `temp-${i}`,
          }))
        : [];

      setProfiles(fixed);

      if (!fixed.length) {
        setMsg("No more profiles 🚀");
      }

    } catch (err) {
      console.error(err);
      setMsg("❌ Failed to load profiles");
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (uid, liked) => {
    try {
      const res = await swipeUser(user, uid, liked);

      // remove instantly
      setProfiles((prev) => prev.filter((p) => p.uid !== uid));

      // 🎉 MATCH POPUP
      if (res?.msg?.includes("MATCH")) {
        setMatchPopup(true);

        setTimeout(() => {
          setMatchPopup(false);
        }, 2500);
      }

    } catch (err) {
      console.error(err);
      setMsg("❌ Swipe failed");
    }
  };

  // ⏳ LOADING
  if (loading) {
    return (
      <div className="text-white h-screen flex items-center justify-center">
        Loading profiles...
      </div>
    );
  }

  // 🚫 EMPTY
  if (!profiles.length) {
    return (
      <div className="text-white h-screen flex items-center justify-center">
        {msg}
      </div>
    );
  }

  const profile = profiles[0];

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black text-white">

      {/* 🎉 MATCH POPUP */}
      {matchPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-green-500 px-8 py-6 rounded-2xl text-xl font-bold shadow-xl animate-bounce">
            🎉 It's a Match!
          </div>
        </div>
      )}

      <div className="bg-gray-900/70 backdrop-blur p-6 rounded-3xl text-center w-80 shadow-2xl border border-gray-700 hover:scale-105 transition">

        <h2 className="text-xl font-semibold">
          {profile.username || profile.email}
        </h2>

        <p className="text-gray-400 mt-1">
          {profile.skills || "No skills added"}
        </p>

        {profile.score !== undefined && (
          <p className="text-green-400 text-sm mt-2">
            Match Score: {profile.score}
          </p>
        )}

        <div className="flex gap-4 mt-6 justify-center">

          <button
            onClick={() => handleSwipe(profile.uid, false)}
            className="bg-red-500 px-5 py-2 rounded-full hover:scale-110 transition"
          >
            ❌
          </button>

          <button
            onClick={() => handleSwipe(profile.uid, true)}
            className="bg-green-500 px-5 py-2 rounded-full hover:scale-110 transition"
          >
            ❤️
          </button>

        </div>

        {msg && (
          <p className="text-xs text-gray-400 mt-4">{msg}</p>
        )}
      </div>
    </div>
  );
}