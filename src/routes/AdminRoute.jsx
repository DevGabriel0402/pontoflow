import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContexto";
import LoadingGlobal from "../components/LoadingGlobal";

export default function AdminRoute({ children }) {
    const { usuario, carregando, isAdmin } = useAuth();

    if (carregando) return <LoadingGlobal />;
    if (!usuario) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/" replace />;

    return children;
}