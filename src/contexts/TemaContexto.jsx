import React, { createContext, useContext } from "react";
import { ThemeProvider } from "styled-components";
import { temaDark, temaLight } from "../styles/tema";

const TemaContexto = createContext(null);

export function TemaProviderApp({ children }) {
    const [modo, setModo] = React.useState("dark");

    const theme = React.useMemo(() => (modo === "dark" ? temaDark : temaLight), [modo]);

    const alternarTema = () => setModo((m) => (m === "dark" ? "light" : "dark"));

    const value = React.useMemo(() => ({ modo, alternarTema }), [modo]);

    return (
        <TemaContexto.Provider value={value}>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </TemaContexto.Provider>
    );
}

export function useTema() {
    const ctx = useContext(TemaContexto);
    if (!ctx) throw new Error("useTema deve ser usado dentro de TemaProviderApp");
    return ctx;
}