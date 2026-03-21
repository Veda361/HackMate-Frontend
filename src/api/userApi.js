const API = "https://web-production-80241.up.railway.app";

// 🔥 Create / update profile
export const sendUserToBackend = async (token, username) => {
  try {
    const res = await fetch(`${API}/user/profile`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Backend Error:", data);
      throw new Error(data?.error || "Backend request failed");
    }

    return data;

  } catch (error) {
    console.error("Backend Error:", error);
    throw error;
  }
};

// 🔥 Get current user
export const getCurrentUser = async (token) => {
  try {
    if (!API) throw new Error("API URL missing");

    const res = await fetch(`${API}/user/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Failed to fetch user");
    }

    return data;

  } catch (error) {
    console.error("Fetch User Error:", error);
    throw error;
  }
};


// 🔥 Update skills
export const updateSkills = async (token, skills) => {
  if (!API) throw new Error("API URL missing");

  const res = await fetch(`${API}/user/update-skills`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ skills }),
  });

  return res.json();
};


// 🔥 Swipe user
export const swipeUser = async (token, swiped_uid, liked) => {
  if (!API) throw new Error("API URL missing");

  const res = await fetch(`${API}/swipe/`, {   // ✅ FIXED SLASH
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ swiped_uid, liked }),
  });

  return res.json();
};