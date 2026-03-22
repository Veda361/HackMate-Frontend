const API =
  import.meta.env.VITE_API_URL ||
  "https://hackmate-backend.onrender.com/";

// 🔥 Create / update profile (ONLY FOR REGISTER)
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
      throw new Error(data?.detail || data?.error || "Backend request failed");
    }

    return data;

  } catch (error) {
    console.error("❌ Backend Error:", error.message);
    throw error;
  }
};


// 🔥 Get current user
export const getCurrentUser = async (token) => {
  try {
    const res = await fetch(`${API}/user/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.detail || "Failed to fetch user");
    }

    return data;

  } catch (error) {
    console.error("❌ Fetch User Error:", error.message);
    throw error;
  }
};


// 🔥 Update skills
export const updateSkills = async (token, skills) => {
  try {
    const res = await fetch(`${API}/user/update-skills`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ skills }),
    });

    const data = await res.json();
    return data;

  } catch (error) {
    console.error("❌ Update Skills Error:", error.message);
    throw error;
  }
};


// 🔥 Swipe user
export const swipeUser = async (token, swiped_uid, liked) => {
  try {
    const res = await fetch(`${API}/swipe/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ swiped_uid, liked }),
    });

    const data = await res.json();
    return data;

  } catch (error) {
    console.error("❌ Swipe Error:", error.message);
    throw error;
  }
};