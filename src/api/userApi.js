// src/api/userApi.js
import { API } from "./configApi";

// 🔥 helper to ALWAYS get fresh token
const getFreshToken = async (user) => {
  return await user.getIdToken(true); // ✅ FORCE REFRESH
};

// 🔥 Create / update profile
export const sendUserToBackend = async (user, username) => {
  const token = await getFreshToken(user);

  const res = await fetch(`${API}/user/profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Backend error");

  return data;
};

// 🔥 Get current user
export const getCurrentUser = async (user) => {
  const token = await getFreshToken(user);

  const res = await fetch(`${API}/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail);

  return data;
};

// 🔥 Update skills
export const updateSkills = async (user, skills) => {
  const token = await getFreshToken(user);

  const res = await fetch(`${API}/user/update-skills`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ skills }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error);

  return data;
};

// 🔥 Swipe user
export const swipeUser = async (user, swiped_uid, liked) => {
  const token = await getFreshToken(user);

  const res = await fetch(`${API}/swipe/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ swiped_uid, liked }),
  });

  return res.json();
};