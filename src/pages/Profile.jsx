import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getCurrentUser, updateSkills } from "../api/userApi";
import { API } from "../api/configApi";

export default function Profile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [skillList, setSkillList] = useState([]);
  const [bio, setBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);

  // 🔥 FETCH PROFILE
  const fetchUser = async () => {
    try {
      const token = await user.getIdToken(true);
      const data = await getCurrentUser(token);

      setProfile(data);
      setSkillList(data.skills ? data.skills.split(",") : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) fetchUser();
  }, [user]);

  // 💾 SAVE BIO (frontend only for now)
  const handleSaveBio = () => {
    setEditingBio(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">

      {/* HERO */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-40 rounded-xl mb-12 relative">

        {/* AVATAR */}
        <div className="absolute -bottom-10 left-6">
          {profile?.avatar ? (
            <img
              src={`${API}/${profile.avatar}`}
              className="w-24 h-24 rounded-full border-4 border-black object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl border-4 border-black">
              👤
            </div>
          )}
        </div>
      </div>

      {/* BASIC INFO */}
      <div className="mt-16 mb-8">
        <h1 className="text-3xl font-bold">
          {profile?.username || "User"}
        </h1>
        <p className="text-gray-400">{profile?.email}</p>
      </div>

      {/* BIO */}
      <div className="bg-gray-900 p-6 rounded-xl mb-6">
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
              className="bg-green-500 px-4 py-2 rounded"
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
              className="mt-3 text-blue-400"
            >
              Edit
            </button>
          </>
        )}
      </div>

      {/* SKILLS */}
      <div className="bg-gray-900 p-6 rounded-xl mb-6">
        <h2 className="text-xl mb-4">🧠 Skills</h2>

        <div className="flex flex-wrap gap-2">
          {skillList.map((skill, i) => (
            <div
              key={i}
              className="bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 rounded-full text-sm hover:scale-110 transition"
            >
              {skill}
            </div>
          ))}
        </div>
      </div>

      {/* STATS (OPTIONAL FUTURE) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 p-4 rounded-xl text-center">
          <h3 className="text-xl font-bold">12</h3>
          <p className="text-gray-400">Matches</p>
        </div>

        <div className="bg-gray-900 p-4 rounded-xl text-center">
          <h3 className="text-xl font-bold">5</h3>
          <p className="text-gray-400">Projects</p>
        </div>
      </div>
    </div>
  );
}