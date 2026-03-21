import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { swipeUser } from "../api/userApi";

export default function Swipe() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    // 🔥 dummy profiles (replace with API later)
    setProfiles([
      { uid: "1", username: "Dev A", skills: "React" },
      { uid: "2", username: "Dev B", skills: "Python" },
    ]);
  }, []);

  const handleSwipe = async (uid, liked) => {
    try {
      const token = await user.getIdToken();
      await swipeUser(token, uid, liked);

      // remove swiped user
      setProfiles((prev) => prev.filter((p) => p.uid !== uid));
    } catch (err) {
      console.error(err);
    }
  };

  if (!profiles.length) {
    return <div className="text-white p-10">No more profiles 🚀</div>;
  }

  const profile = profiles[0];

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-black text-white">
      <div className="bg-gray-900 p-6 rounded-xl text-center">
        <h2 className="text-xl">{profile.username}</h2>
        <p className="text-gray-400">{profile.skills}</p>

        <div className="flex gap-4 mt-4 justify-center">
          <button
            onClick={() => handleSwipe(profile.uid, false)}
            className="bg-red-500 px-4 py-2 rounded"
          >
            ❌
          </button>

          <button
            onClick={() => handleSwipe(profile.uid, true)}
            className="bg-green-500 px-4 py-2 rounded"
          >
            ❤️
          </button>
        </div>
      </div>
    </div>
  );
}