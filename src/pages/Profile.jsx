import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getCurrentUser } from "../api/userApi";
import { API } from "../api/configApi";

export default function Profile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [skillList, setSkillList] = useState([]);
  const [bio, setBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH PROFILE (FIXED TOKEN ISSUE)
  const fetchUser = async () => {
    try {
      setLoading(true);

      const data = await getCurrentUser(user);

      setProfile(data);
      setSkillList(data.skills ? data.skills.split(",") : []);

      // 🔥 LOAD BIO FROM LOCAL STORAGE
      const savedBio = localStorage.getItem(`bio_${data.email}`);
      if (savedBio) setBio(savedBio);

    } catch (err) {
      console.error("Profile error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchUser();
  }, [user]);

  // 💾 SAVE BIO (LOCAL STORAGE)
  const handleSaveBio = () => {
    if (profile?.email) {
      localStorage.setItem(`bio_${profile.email}`, bio);
    }
    setEditingBio(false);
  };

  // ⏳ LOADING UI
  if (loading) {
    return (
      <div className="text-white p-10 text-center animate-pulse">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">

      {/* 🔥 HERO */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 h-44 rounded-xl mb-16 relative shadow-lg">

        {/* AVATAR */}
        <div className="absolute -bottom-12 left-6">
          {profile?.avatar ? (
            <img
              src={`${API}/${profile.avatar}`}
              className="w-28 h-28 rounded-full border-4 border-black object-cover shadow-xl"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center text-3xl border-4 border-black shadow-xl">
              👤
            </div>
          )}
        </div>
      </div>

      {/* 👤 BASIC INFO */}
      <div className="mt-16 mb-8">
        <h1 className="text-3xl font-bold tracking-wide">
          {profile?.username || "User"}
        </h1>
        <p className="text-gray-400">{profile?.email}</p>
      </div>

      {/* 📝 BIO */}
      <div className="bg-gray-900 p-6 rounded-xl mb-6 shadow hover:shadow-xl transition">
        <h2 className="text-xl mb-3">📝 About</h2>

        {editingBio ? (
          <>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 text-black rounded mb-3"
              placeholder="Write something about yourself..."
            />

            <button
              onClick={handleSaveBio}
              className="bg-green-500 px-4 py-2 rounded hover:scale-105 transition"
            >
              Save
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-300">
              {bio || "No bio added yet..."}
            </p>

            <button
              onClick={() => setEditingBio(true)}
              className="mt-3 text-blue-400 hover:underline"
            >
              Edit
            </button>
          </>
        )}
      </div>

      {/* 🧠 SKILLS */}
      <div className="bg-gray-900 p-6 rounded-xl mb-6 shadow hover:shadow-xl transition">
        <h2 className="text-xl mb-4">🧠 Skills</h2>

        {skillList.length === 0 ? (
          <p className="text-gray-500">No skills added yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skillList.map((skill, i) => (
              <div
                key={i}
                className="bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 rounded-full text-sm hover:scale-110 transition shadow-md"
              >
                {skill}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📊 STATS */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 p-4 rounded-xl text-center shadow hover:shadow-xl transition">
          <h3 className="text-2xl font-bold">{skillList.length}</h3>
          <p className="text-gray-400">Skills</p>
        </div>

        <div className="bg-gray-900 p-4 rounded-xl text-center shadow hover:shadow-xl transition">
          <h3 className="text-2xl font-bold">{Math.floor(skillList.length / 2)}</h3>
          <p className="text-gray-400">Matches</p>
        </div>
      </div>
    </div>
  );
}