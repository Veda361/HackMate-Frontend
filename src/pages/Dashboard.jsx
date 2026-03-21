import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getAuth, signOut } from "firebase/auth";
import { app } from "../firebase/config";
import { getCurrentUser } from "../api/userApi";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;
const WS = import.meta.env.VITE_WS_URL;

export default function Dashboard() {
  const { user } = useAuth();
  const auth = getAuth(app);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // 🔥 Fetch profile
  const fetchUser = async () => {
    try {
      const token = await user.getIdToken();
      const data = await getCurrentUser(token);

      setProfile(data);
      setSkills(data.skills || "");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) fetchUser();
  }, [user]);

  // 🖼️ Upload avatar
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();

      setMsg("✅ Avatar updated!");
      console.log("Uploaded:", data);

      // 🔄 Refresh profile to show new avatar
      fetchUser();
    } catch (err) {
      console.error(err);
      setMsg("❌ Upload failed");
    }
  };

  // 🔥 Save skills
  const handleSave = async () => {
    try {
      setLoading(true);
      setMsg("");

      const token = await user.getIdToken();

      const res = await fetch(`${API}/user/update-skills`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ skills }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setMsg("✅ Skills updated!");
    } catch (err) {
      console.error(err);
      setMsg("❌ Error updating skills");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-6">
        Welcome, {profile?.username || user?.email} 👋
      </h1>

      {/* PROFILE CARD */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg mb-6 flex items-center gap-6">
        {/* AVATAR */}
        <div>
          {profile?.avatar ? (
            <img
              src={`${API}/${profile.avatar}`}
              alt="avatar"
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
              👤
            </div>
          )}

          <input type="file" onChange={handleUpload} className="mt-2 text-sm" />
        </div>

        {/* USER INFO */}
        <div>
          <p>
            <strong>Email:</strong> {profile?.email}
          </p>
          <p>
            <strong>Username:</strong> {profile?.username}
          </p>
        </div>
      </div>

      {/* STATUS MESSAGE */}
      {msg && (
        <div className="mb-4 text-sm bg-gray-800 px-4 py-2 rounded">{msg}</div>
      )}

      {/* SKILLS */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl mb-4">🧠 Your Skills</h2>

        <input
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="e.g. react, node, ai"
          className="w-full p-3 rounded text-black mb-4"
        />

        <button
          onClick={handleSave}
          disabled={loading}
          className={`px-4 py-2 rounded ${
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
          className="bg-green-500 px-4 py-2 rounded-lg hover:bg-green-600"
        >
          🔥 Find Matches
        </button>

        <button
          onClick={() => navigate("/matches")}
          className="bg-purple-500 px-4 py-2 rounded-lg hover:bg-purple-600"
        >
          💬 My Matches
        </button>


        <button
          onClick={handleLogout}
          className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
