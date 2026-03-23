import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { swipeUser } from "../api/userApi";
import { API } from "../api/configApi";

export default function Swipe() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // 🚀 FETCH PROFILES
  useEffect(() => {
    if (user) fetchProfiles();
  }, [user]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setMsg("");

      const token = await user.getIdToken(true);

      const res = await fetch(`${API}/match`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch profiles");

      const data = await res.json();

      // ⚠️ IMPORTANT FIX: ensure UID exists
      const fixed = (Array.isArray(data) ? data : []).map((u, i) => ({
        ...u,
        uid: u.uid || u.firebase_uid || u.email || `temp-${i}`, // fallback
      }));

      setProfiles(fixed);

      if (!fixed.length) {
        setMsg("No profiles found");
      }

    } catch (err) {
      console.error("Fetch profiles error:", err);
      setMsg("❌ Failed to load profiles");
    } finally {
      setLoading(false);
    }
  };

  // ❤️ SWIPE HANDLER (FIXED → PASS USER NOT TOKEN)
  const handleSwipe = async (uid, liked) => {
    try {
      if (!user) return;

      const res = await swipeUser(user, uid, liked);

      console.log("Swipe response:", res);

      // 🔥 remove swiped profile instantly
      setProfiles((prev) => prev.filter((p) => p.uid !== uid));

    } catch (err) {
      console.error("Swipe error:", err);
      setMsg("❌ Swipe failed");
    }
  };

  // ⏳ LOADING
  if (loading) {
    return (
      <div className="text-white p-10 text-center">
        Loading profiles...
      </div>
    );
  }

  // 🚫 EMPTY
  if (!profiles.length) {
    return (
      <div className="text-white p-10 text-center">
        {msg || "No more profiles 🚀"}
      </div>
    );
  }

  const profile = profiles[0];

  return (
    <div className="h-screen flex items-center justify-center bg-black text-white">

      <div className="bg-gray-900 p-6 rounded-2xl text-center w-80 shadow-xl border border-gray-700">

        {/* 👤 USER */}
        <h2 className="text-xl font-semibold">
          {profile.username || profile.email}
        </h2>

        <p className="text-gray-400 mt-1">
          {profile.skills || "No skills added"}
        </p>

        {/* ⭐ MATCH SCORE */}
        {profile.score !== undefined && (
          <p className="text-green-400 text-sm mt-2">
            Match Score: {profile.score}
          </p>
        )}

        {/* ACTIONS */}
        <div className="flex gap-4 mt-6 justify-center">

          <button
            onClick={() => handleSwipe(profile.uid, false)}
            className="bg-red-500 hover:bg-red-600 px-5 py-2 rounded transition hover:scale-105"
          >
            ❌
          </button>

          <button
            onClick={() => handleSwipe(profile.uid, true)}
            className="bg-green-500 hover:bg-green-600 px-5 py-2 rounded transition hover:scale-105"
          >
            ❤️
          </button>

        </div>

        {/* MESSAGE */}
        {msg && (
          <p className="text-xs text-gray-400 mt-4">{msg}</p>
        )}

      </div>

    </div>
  );
}