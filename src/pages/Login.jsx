import { useState } from "react";
import { loginUser } from "../firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const navigate = useNavigate();

  // 🔥 LOGIN HANDLER (UNCHANGED)
  const handleLogin = async () => {
    if (!email || !password) {
      setMsg("❌ Please fill all fields");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      setMsg("");

      const res = await loginUser(email, password);

      if (!res?.user) {
        throw new Error("Invalid login response");
      }

      await res.user.getIdToken(true);

      setMsg("✅ Login successful!");

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050816] via-[#0B1120] to-black text-white">

      <div className="relative w-96">

        {/* 🔥 Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 blur-2xl opacity-30 rounded-2xl"></div>

        <div className="relative bg-white/5 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10">

          {/* TITLE */}
          <h2 className="text-3xl font-bold mb-6 text-center tracking-wide bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            HackMate 🚀
          </h2>

          {/* MESSAGE */}
          {msg && (
            <div className="mb-4 text-sm text-center bg-white/10 px-3 py-2 rounded-lg border border-white/10">
              {msg}
            </div>
          )}

          {/* EMAIL */}
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 mb-4 rounded-lg bg-white/10 border border-white/10 outline-none focus:ring-2 focus:ring-cyan-400 transition placeholder-gray-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyPress}
          />

          {/* PASSWORD */}
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 mb-6 rounded-lg bg-white/10 border border-white/10 outline-none focus:ring-2 focus:ring-cyan-400 transition placeholder-gray-400"
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
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-cyan-400 hover:scale-105 shadow-lg"
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
          <p className="mt-5 text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <span
              onClick={() => navigate("/register")}
              className="text-cyan-400 cursor-pointer hover:underline"
            >
              Register
            </span>
          </p>

        </div>
      </div>
    </div>
  );
}