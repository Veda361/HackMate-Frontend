import { useState } from "react";
import { loginUser } from "../firebase/auth";
import { sendUserToBackend } from "../api/userApi";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const res = await loginUser(email, password);

      const token = await res.user.getIdToken();

      await sendUserToBackend(token);

      alert("Login Successful 🚀");

      // ✅ redirect to dashboard
      navigate("/dashboard");

    } catch (err) {
      console.error(err);

      if (err.code === "auth/user-not-found") {
        alert("User not found ❌");
      } else if (err.code === "auth/wrong-password") {
        alert("Wrong password ❌");
      } else {
        alert(err.message || "Login Failed ❌");
      }

    } finally {
      setLoading(false);
    }
  };

  // ✅ allow Enter key login
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800">
      
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-96 text-white">
        
        <h2 className="text-3xl font-bold mb-6 text-center">
          HackMate Login 🚀
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 rounded-lg bg-white/20 outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyPress}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-6 rounded-lg bg-white/20 outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyPress}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full p-3 rounded-lg font-semibold transition ${
            loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

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