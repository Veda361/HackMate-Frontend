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

  // 🔥 REGISTER HANDLER (FIXED)
  const handleRegister = async () => {
    if (!email || !password || !username) {
      setMsg("❌ Fill all fields");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      setMsg("");

      // 🔥 STEP 1: Firebase
      const res = await registerUser(email, password);

      if (!res?.user) {
        throw new Error("Registration failed");
      }

      // 🔥 STEP 2: Force fresh token
      await res.user.getIdToken(true);

      // 🔥 STEP 3: Send to backend (FIXED)
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

  // ⌨️ ENTER KEY SUPPORT
  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleRegister();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800">

      <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-96 text-white border border-white/20">

        {/* TITLE */}
        <h2 className="text-3xl font-bold mb-6 text-center tracking-wide">
          Create Account 🚀
        </h2>

        {/* MESSAGE */}
        {msg && (
          <div className="mb-4 text-sm text-center bg-gray-800 px-3 py-2 rounded animate-pulse">
            {msg}
          </div>
        )}

        {/* USERNAME */}
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyPress}
          className="w-full p-3 mb-3 rounded-lg bg-white/20 outline-none focus:ring-2 focus:ring-green-500"
        />

        {/* EMAIL */}
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyPress}
          className="w-full p-3 mb-3 rounded-lg bg-white/20 outline-none focus:ring-2 focus:ring-green-500"
        />

        {/* PASSWORD */}
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyPress}
          className="w-full p-3 mb-6 rounded-lg bg-white/20 outline-none focus:ring-2 focus:ring-green-500"
        />

        {/* BUTTON */}
        <button
          onClick={handleRegister}
          disabled={loading}
          className={`w-full p-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
            loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600 hover:scale-105"
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
        <p className="mt-4 text-center text-sm">
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
  );
}