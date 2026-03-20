import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Swipe from "./pages/Swipe";
import Matches from "./pages/Matches";
import Chat from "./pages/Chat";

import ProtectedRoute from "./components/ProtectedRoute";
import Call from "./pages/Call";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔓 PUBLIC ROUTES */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 🔐 PROTECTED ROUTES */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/swipe"
          element={
            <ProtectedRoute>
              <Swipe />
            </ProtectedRoute>
          }
        />

        <Route
          path="/matches"
          element={
            <ProtectedRoute>
              <Matches />
            </ProtectedRoute>
          }
        />

        {/* 💬 CHAT ROUTE */}
        <Route
          path="/chat/:uid"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route path="/call/:uid" element={<Call />} />

      </Routes>
    </BrowserRouter>
  );
}