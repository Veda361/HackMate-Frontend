import { useState } from "react";
import { registerUser } from "../firebase/auth";
import { sendUserToBackend } from "../api/userApi";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const navigate = useNavigate();

  // 🔥 REGISTER HANDLER (UNCHANGED)
  const handleRegister = async () => {
    if (!email || !password || !username) {
      setMsg("❌ Fill all fields");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      setMsg("");

      const res = await registerUser(email, password);

      if (!res?.user) {
        throw new Error("Registration failed");
      }

      await res.user.getIdToken(true);

      await sendUserToBackend(res.user, username);

      setMsg("✅ Registered successfully!");

      setTimeout(() => {
        navigate("/");
      }, 800);

    } catch (err) {
      console.error("Register Error:", err);

      if (err.code === "auth/email-already-in-use") {
        setMsg("❌ Email already exists");
      } else if (err.code === "auth/weak-password") {
        setMsg("❌ Password should be at least 6 characters");
      } else if (err.code === "auth/invalid-email") {
        setMsg("❌ Invalid email");
      } else {
        setMsg(err.message || "❌ Registration failed");
      }

    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleRegister();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050816] via-[#0B1120] to-black text-white">

      <div className="relative w-96">

        {/* 🔥 Glow Background */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-500 blur-2xl opacity-30 rounded-2xl"></div>

        <div className="relative bg-white/5 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10">

          {/* TITLE */}
          <h2 className="text-3xl font-bold mb-6 text-center tracking-wide bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Create Account 🚀
          </h2>

          {/* MESSAGE */}
          {msg && (
            <div className="mb-4 text-sm text-center bg-white/10 px-3 py-2 rounded-lg border border-white/10">
              {msg}
            </div>
          )}

          {/* USERNAME */}
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full p-3 mb-3 rounded-lg bg-white/10 border border-white/10 outline-none focus:ring-2 focus:ring-purple-400 transition placeholder-gray-400"
          />

          {/* EMAIL */}
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full p-3 mb-3 rounded-lg bg-white/10 border border-white/10 outline-none focus:ring-2 focus:ring-purple-400 transition placeholder-gray-400"
          />

          {/* PASSWORD */}
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full p-3 mb-6 rounded-lg bg-white/10 border border-white/10 outline-none focus:ring-2 focus:ring-purple-400 transition placeholder-gray-400"
          />

          {/* BUTTON */}
          <button
            onClick={handleRegister}
            disabled={loading}
            className={`w-full p-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              loading
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-blue-500 hover:scale-105 shadow-lg"
            }`}
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Registering...
              </>
            ) : (
              "Register"
            )}
          </button>

          {/* LOGIN LINK */}
          <p className="mt-5 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/")}
              className="text-blue-400 cursor-pointer hover:underline"
            >
              Login
            </span>
          </p>

        </div>
      </div>
    </div>
  );
}