import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import PrivateRoute from "./routes/PrivateRoute";
import AdminRoute from "./routes/AdminRoute";

import Login from "./pages/auth/Login";
import HomeColaborador from "./pages/colaborador/HomeColaborador";
import Historico from "./pages/colaborador/Historico";
import DashboardAdmin from "./pages/admin/DashboardAdmin";

import { useSync } from "./hooks/useSync";
import CookieConsent from "./components/CookieConsent";

export default function App() {
  console.log("App.jsx: Renderizando...");
  // ✅ deixa sincronizando sempre que necessário
  useSync();

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <HomeColaborador />
            </PrivateRoute>
          }
        />

        <Route
          path="/historico"
          element={
            <PrivateRoute>
              <Historico />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <DashboardAdmin />
            </AdminRoute>
          }
        />
      </Routes>
      <CookieConsent />
    </BrowserRouter>
  );
}