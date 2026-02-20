import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContexto";

export default function AdminRoute({ children }) {
    const { usuario, carregando, isAdmin } = useAuth();

    if (carregando) return null;
    if (!usuario) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/" replace />;

    return children;
}