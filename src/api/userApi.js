const API = import.meta.env.VITE_API_URL;

// 🔥 Create / update profile (with username)
export const sendUserToBackend = async (token, username) => {
  try {
    const res = await fetch(`${API}/user/profile`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    if (!res.ok) {
      throw new Error("Backend request failed");
    }

    return await res.json();

  } catch (error) {
    console.error("Backend Error:", error);
    throw error;
  }
};

// 🔥 Get current user (username, email, skills)
export const getCurrentUser = async (token) => {
  try {
    const res = await fetch(`${API}/user/me`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch user");
    }

    return await res.json();

  } catch (error) {
    console.error("Fetch User Error:", error);
    throw error;
  }
};

export const updateSkills = async (token, skills) => {
  const res = await fetch(`${API}/user/update-skills`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ skills }),
  });

  return res.json();
};

export const swipeUser = async (token, swiped_uid, liked) => {
  const res = await fetch(`${API}/swipe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ swiped_uid, liked }),
  });

  return res.json();
};