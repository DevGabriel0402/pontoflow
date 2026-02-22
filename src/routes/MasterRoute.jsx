import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContexto";
import LoadingGlobal from "../components/LoadingGlobal";

export default function MasterRoute({ children }) {
    const { usuario, carregando, isSuperAdmin } = useAuth();

    if (carregando) return <LoadingGlobal />;
    if (!usuario) return <Navigate to="/login" replace />;
    if (!isSuperAdmin) return <Navigate to="/" replace />;

    return children;
}
