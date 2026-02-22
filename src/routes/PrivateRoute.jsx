import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContexto";
import LoadingGlobal from "../components/LoadingGlobal";

export default function PrivateRoute({ children }) {
    const { usuario, carregando } = useAuth();

    if (carregando) return <LoadingGlobal />;
    if (!usuario) return <Navigate to="/login" replace />;

    return children;
}