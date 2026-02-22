import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import PrivateRoute from "./routes/PrivateRoute";
import AdminRoute from "./routes/AdminRoute";
import MasterRoute from "./routes/MasterRoute";

import Login from "./pages/auth/Login";
import HomeColaborador from "./pages/colaborador/HomeColaborador";
import Historico from "./pages/colaborador/Historico";
import DashboardAdmin from "./pages/admin/DashboardAdmin";
import DashboardMaster from "./pages/master/DashboardMaster";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";

import { useSync } from "./hooks/useSync";
import CookieConsent from "./components/CookieConsent";
import BannerManutencao from "./components/BannerManutencao";

export default function App() {
  // ✅ deixa sincronizando sempre que necessário
  useSync();

  return (
    <BrowserRouter>
      <BannerManutencao />
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />

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

        <Route
          path="/master"
          element={
            <MasterRoute>
              <DashboardMaster />
            </MasterRoute>
          }
        />
      </Routes>
      <CookieConsent />
    </BrowserRouter>
  );
}