import { useState } from "react";
import { loginUser } from "../firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const navigate = useNavigate();

  // 🔥 LOGIN HANDLER (FIXED)
  const handleLogin = async () => {
    if (!email || !password) {
      setMsg("❌ Please fill all fields");
      return;
    }

    if (loading) return; // 🚫 prevent spam click

    try {
      setLoading(true);
      setMsg("");

      const res = await loginUser(email, password);

      if (!res?.user) {
        throw new Error("Invalid login response");
      }

      // 🔥 FORCE FRESH TOKEN
      await res.user.getIdToken(true);

      setMsg("✅ Login successful!");

      // ⏳ small delay for UX
      setTimeout(() => {
        navigate("/dashboard");
      }, 800);

    } catch (err) {
      console.error("Login Error:", err);

      if (err.code === "auth/user-not-found") {
        setMsg("❌ User not found");
      } else if (err.code === "auth/wrong-password") {
        setMsg("❌ Wrong password");
      } else if (err.code === "auth/invalid-email") {
        setMsg("❌ Invalid email");
      } else {
        setMsg(err.message || "❌ Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800">

      <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-96 text-white border border-white/20">

        {/* TITLE */}
        <h2 className="text-3xl font-bold mb-6 text-center tracking-wide">
          HackMate 🚀
        </h2>

        {/* MESSAGE */}
        {msg && (
          <div className="mb-4 text-sm text-center bg-gray-800 px-3 py-2 rounded animate-pulse">
            {msg}
          </div>
        )}

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 rounded-lg bg-white/20 outline-none focus:ring-2 focus:ring-blue-500 transition"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyPress}
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-6 rounded-lg bg-white/20 outline-none focus:ring-2 focus:ring-blue-500 transition"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyPress}
        />

        {/* BUTTON */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full p-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
            loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 hover:scale-105"
          }`}
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span> Logging in...
            </>
          ) : (
            "Login"
          )}
        </button>

        {/* REGISTER */}
        <p className="mt-4 text-center text-sm">
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-blue-400 cursor-pointer hover:underline"
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
}