import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getAuth, signOut } from "firebase/auth";
import { app } from "../firebase/config";
import { getCurrentUser, updateSkills } from "../api/userApi";
import { useNavigate } from "react-router-dom";
import { API } from "../api/configApi";

export default function Dashboard() {
  const { user } = useAuth();
  const auth = getAuth(app);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [skillInput, setSkillInput] = useState("");
  const [skillList, setSkillList] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const allSkills = [
    "react","node","python","java","c++",
    "ai","ml","firebase","fastapi",
    "mongodb","docker","aws","tailwind","nextjs"
  ];

  const fetchUser = async () => {
    try {
      if (!user) return;
      const data = await getCurrentUser(user);
      setProfile(data);
      setSkillList(data.skills ? data.skills.split(",") : []);
    } catch (err) {
      console.error(err);
      setMsg("❌ Failed to load profile");
    }
  };

  useEffect(() => {
    if (user) fetchUser();
  }, [user]);

  useEffect(() => {
    if (!skillInput) return setSuggestions([]);

    const filtered = allSkills.filter(
      (s) =>
        s.includes(skillInput.toLowerCase()) &&
        !skillList.includes(s)
    );

    setSuggestions(filtered);
  }, [skillInput, skillList]);

  const addSkill = (skill) => {
    const val = skill.trim().toLowerCase();
    if (!val || skillList.includes(val)) return;

    setSkillList((prev) => [...prev, val]);
    setSkillInput("");
    setSuggestions([]);
  };

  const removeSkill = (skill) => {
    setSkillList((prev) => prev.filter((s) => s !== skill));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    try {
      setMsg("Uploading...");
      const token = await user.getIdToken(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API}/upload/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error();

      setMsg("✅ Avatar updated!");
      fetchUser();
    } catch (err) {
      console.error(err);
      setMsg("❌ Upload failed");
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setMsg("");

      const res = await updateSkills(user, skillList.join(","));

      if (res?.error) setMsg("❌ " + res.error);
      else setMsg("✅ Skills updated!");
    } catch (err) {
      console.error(err);
      setMsg("❌ Failed to update skills");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#0B1120] to-black text-white p-6">

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
        Welcome, {profile?.username || user?.email} 👋
      </h1>

      {/* PROFILE CARD */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl mb-6 flex gap-6 items-center shadow-lg">

        <div>
          {profile?.avatar ? (
            <img
              src={`${API}/${profile.avatar}`}
              className="w-20 h-20 rounded-full object-cover border border-white/20"
            />
          ) : (
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-xl">
              👤
            </div>
          )}
          <input type="file" onChange={handleUpload} className="mt-2 text-xs text-gray-400" />
        </div>

        <div>
          <p className="text-gray-300"><strong>Email:</strong> {profile?.email}</p>
          <p className="text-gray-300"><strong>Username:</strong> {profile?.username}</p>
        </div>
      </div>

      {/* MESSAGE */}
      {msg && (
        <div className="mb-4 bg-white/10 border border-white/10 px-4 py-2 rounded">
          {msg}
        </div>
      )}

      {/* PROFILE BUTTON */}
      <button
        onClick={() => navigate("/profile")}
        className="bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 rounded-lg mb-6 hover:scale-105 transition"
      >
        👤 Profile
      </button>

      {/* SKILLS */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl shadow-lg">

        <h2 className="text-xl mb-4">🧠 Your Skills</h2>

        {/* SKILL CHIPS */}
        <div className="flex flex-wrap gap-2 mb-4">
          {skillList.map((skill, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 px-3 py-1 rounded-full text-sm shadow-md hover:scale-105 transition"
            >
              {skill}
              <button onClick={() => removeSkill(skill)}>✕</button>
            </div>
          ))}
        </div>

        {/* INPUT */}
        <div className="relative">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type skill..."
            className="w-full p-3 rounded-lg bg-white/10 border border-white/10 outline-none focus:ring-2 focus:ring-cyan-400"
          />

          {suggestions.length > 0 && (
            <div className="absolute bg-[#0B1120] border border-white/10 w-full mt-1 rounded shadow-lg z-10">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onClick={() => addSkill(s)}
                  className="p-2 hover:bg-white/10 cursor-pointer"
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SAVE BUTTON */}
        <button
          onClick={handleSave}
          disabled={loading}
          className={`mt-4 px-4 py-2 rounded-lg ${
            loading
              ? "bg-gray-600"
              : "bg-gradient-to-r from-blue-500 to-cyan-400 hover:scale-105"
          }`}
        >
          {loading ? "Saving..." : "Save Skills"}
        </button>
      </div>

      {/* ACTIONS */}
      <div className="mt-6 flex gap-4 flex-wrap">
        <button
          onClick={() => navigate("/swipe")}
          className="bg-gradient-to-r from-green-400 to-cyan-400 px-4 py-2 rounded-lg hover:scale-105"
        >
          🔥 Find Matches
        </button>

        <button
          onClick={() => navigate("/matches")}
          className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-lg hover:scale-105"
        >
          💬 My Matches
        </button>

        <button
          onClick={handleLogout}
          className="bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 rounded-lg hover:scale-105"
        >
          Logout
        </button>
      </div>

    </div>
  );
}