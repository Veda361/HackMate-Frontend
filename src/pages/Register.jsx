import { useState } from "react";
import { registerUser } from "../firebase/auth";
import { sendUserToBackend } from "../api/userApi";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // 🔥 NEW
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!email || !password || !username) {
      alert("Fill all fields ❌");
      return;
    }

    try {
      setLoading(true);

      const res = await registerUser(email, password);
      const token = await res.user.getIdToken();

      // 🔥 send username also
      await sendUserToBackend(token, username);

      alert("Registered Successfully 🚀");

      navigate("/");

    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">

      <div className="p-8 bg-gray-900 rounded-xl w-96">

        <h2 className="text-2xl mb-4">Register</h2>

        <input
          placeholder="Username"
          className="w-full p-3 mb-3 text-black rounded"
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          placeholder="Email"
          className="w-full p-3 mb-3 text-black rounded"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          className="w-full p-3 mb-3 text-black rounded"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleRegister}
          className="w-full bg-green-500 p-3 rounded"
        >
          Register
        </button>

      </div>
    </div>
  );
}