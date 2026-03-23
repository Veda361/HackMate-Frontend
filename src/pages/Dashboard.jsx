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

  // 🔥 PREDEFINED SKILLS
  const allSkills = [
    "react",
    "node",
    "python",
    "java",
    "c++",
    "ai",
    "ml",
    "firebase",
    "fastapi",
    "mongodb",
    "docker",
    "aws",
    "tailwind",
    "nextjs",
  ];

  // 🔥 FETCH USER
  const fetchUser = async () => {
    try {
      const token = await user.getIdToken();
      const data = await getCurrentUser(token);

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

  // 🔍 SUGGESTIONS
  useEffect(() => {
    if (!skillInput) {
      setSuggestions([]);
      return;
    }

    const filtered = allSkills.filter(
      (s) => s.includes(skillInput.toLowerCase()) && !skillList.includes(s),
    );

    setSuggestions(filtered);
  }, [skillInput, skillList]);

  // ➕ ADD SKILL
  const addSkill = (skill) => {
    const val = skill.trim().toLowerCase();
    if (!val || skillList.includes(val)) return;

    setSkillList((prev) => [...prev, val]);
    setSkillInput("");
    setSuggestions([]);
  };

  // ❌ REMOVE
  const removeSkill = (skill) => {
    setSkillList((prev) => prev.filter((s) => s !== skill));
  };

  // ⌨️ INPUT
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  // 🖼️ UPLOAD
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setMsg("Uploading...");
      const token = await user.getIdToken();

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
    } catch {
      setMsg("❌ Upload failed");
    }
  };

  // 💾 SAVE
  const handleSave = async () => {
    try {
      setLoading(true);
      setMsg("");

      const token = await user.getIdToken();
      const res = await updateSkills(token, skillList.join(","));

      if (res?.error) setMsg("❌ " + res.error);
      else setMsg("✅ Skills updated!");
    } catch {
      setMsg("❌ Failed to update skills");
    } finally {
      setLoading(false);
    }
  };

  // 🔓 LOGOUT
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">
        Welcome, {profile?.username || user?.email} 👋
      </h1>

      {/* PROFILE */}
      <div className="bg-gray-900 p-6 rounded-xl mb-6 flex gap-6 items-center">
        <div>
          {profile?.avatar ? (
            <img
              src={`${API}/${profile.avatar}`}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
              👤
            </div>
          )}
          <input type="file" onChange={handleUpload} className="mt-2 text-sm" />
        </div>

        <div>
          <p>
            <strong>Email:</strong> {profile?.email}
          </p>
          <p>
            <strong>Username:</strong> {profile?.username}
          </p>
        </div>
      </div>

      {/* MESSAGE */}
      {msg && <div className="mb-4 bg-gray-800 px-4 py-2 rounded">{msg}</div>}

      {/*Profile */}
      <button
        onClick={() => navigate("/profile")}
        className="bg-yellow-500 px-4 py-2 rounded"
      >
        👤 Profile
      </button>

      {/* SKILLS */}
      <div className="bg-gray-900 p-6 rounded-xl">
        <h2 className="text-xl mb-4">🧠 Your Skills</h2>

        {/* CHIPS */}
        <div className="flex flex-wrap gap-2 mb-4">
          {skillList.map((skill, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 rounded-full text-sm transform hover:scale-110 transition"
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
            className="w-full p-3 rounded text-black"
          />

          {/* DROPDOWN */}
          {suggestions.length > 0 && (
            <div className="absolute bg-gray-800 w-full mt-1 rounded shadow-lg z-10">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onClick={() => addSkill(s)}
                  className="p-2 hover:bg-gray-700 cursor-pointer"
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SAVE */}
        <button
          onClick={handleSave}
          disabled={loading}
          className={`mt-4 px-4 py-2 rounded ${
            loading ? "bg-gray-500" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Saving..." : "Save Skills"}
        </button>
      </div>

      {/* ACTIONS */}
      <div className="mt-6 flex gap-4 flex-wrap">
        <button
          onClick={() => navigate("/swipe")}
          className="bg-green-500 px-4 py-2 rounded"
        >
          🔥 Find Matches
        </button>

        <button
          onClick={() => navigate("/matches")}
          className="bg-purple-500 px-4 py-2 rounded"
        >
          💬 My Matches
        </button>

        <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded">
          Logout
        </button>
      </div>
    </div>
  );
}
