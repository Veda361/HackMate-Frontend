import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { swipeUser } from "../api/userApi";
import { API } from "../api/configApi";

export default function Swipe() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH PROFILES ONLY WHEN USER READY
  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);

      const token = await user.getIdToken(true);

      const res = await fetch(`${API}/match`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch profiles");

      const data = await res.json();

      // 🔥 Ensure valid array
      setProfiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch profiles error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ❤️ SWIPE HANDLER
  const handleSwipe = async (uid, liked) => {
    try {
      const token = await user.getIdToken(true);

      const res = await swipeUser(token, uid, liked);

      console.log("Swipe response:", res);

      // 🔥 Remove swiped profile instantly
      setProfiles((prev) => prev.filter((p) => p.uid !== uid));
    } catch (err) {
      console.error("Swipe error:", err);
    }
  };

  // ⏳ LOADING STATE
  if (loading) {
    return (
      <div className="text-white p-10 text-center">
        Loading profiles...
      </div>
    );
  }

  // 🚫 NO MORE PROFILES
  if (!profiles.length) {
    return (
      <div className="text-white p-10 text-center">
        No more profiles 🚀
      </div>
    );
  }

  const profile = profiles[0];

  return (
    <div className="h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-gray-900 p-6 rounded-xl text-center w-80 shadow-lg">

        {/* 👤 USER INFO */}
        <h2 className="text-xl font-semibold">
          {profile.username || profile.email}
        </h2>

        <p className="text-gray-400 mt-1">
          {profile.skills || "No skills added"}
        </p>

        {/* 🔥 ACTION BUTTONS */}
        <div className="flex gap-4 mt-6 justify-center">
          <button
            onClick={() => handleSwipe(profile.uid, false)}
            className="bg-red-500 hover:bg-red-600 px-5 py-2 rounded transition"
          >
            ❌
          </button>

          <button
            onClick={() => handleSwipe(profile.uid, true)}
            className="bg-green-500 hover:bg-green-600 px-5 py-2 rounded transition"
          >
            ❤️
          </button>
        </div>

      </div>
    </div>
  );
}