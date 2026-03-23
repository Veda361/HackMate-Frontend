// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../firebase/config";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const auth = getAuth(app);
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("🔥 Auth state:", currentUser?.uid);
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, [auth]);

  return (
    <AuthContext.Provider value={{ user }}>
      {user !== undefined && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);