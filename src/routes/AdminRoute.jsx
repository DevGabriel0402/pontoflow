import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContexto";
import LoadingGlobal from "../components/LoadingGlobal";

export default function AdminRoute({ children }) {
    const { usuario, perfil, carregando, isAdmin } = useAuth();

    if (carregando) return <LoadingGlobal />;
    if (!usuario) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/" replace />;

    // Bloqueia admin inativo (pausado pelo Master)
    if (perfil?.ativo === false) return <Navigate to="/" replace />; // Ou /login para deslogar, mas aqui jogamos pra home ou barramos.

    return children;
}