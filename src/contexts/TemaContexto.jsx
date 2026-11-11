import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { ThemeProvider } from "styled-components";
import { temaDark, temaLight } from "../styles/tema";

const TemaContexto = createContext(null);

const STORAGE_KEY = "pontoflow_tema";

function getPreferenciaSistema() {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function TemaProviderApp({ children }) {
  // modo pode ser: "auto" | "dark" | "light"
  const [modo, setModoState] = useState(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo === "dark" || salvo === "light" || salvo === "auto") {
        return salvo;
      }
    } catch {
      // Ignora erro de localStorage
    }
    return "auto";
  });

  const [sistemaModo, setSistemaModo] = useState(getPreferenciaSistema);

  // Escuta mudanças de tema no sistema operacional/navegador/celular
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const atualizarTemaSistema = (e) => {
      setSistemaModo(e.matches ? "dark" : "light");
    };

    // Suporte moderno e fallback
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", atualizarTemaSistema);
      return () => mediaQuery.removeEventListener("change", atualizarTemaSistema);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(atualizarTemaSistema);
      return () => mediaQuery.removeListener(atualizarTemaSistema);
    }
    return undefined;
  }, []);

  const modoEfetivo = useMemo(() => {
    return modo === "auto" ? sistemaModo : modo;
  }, [modo, sistemaModo]);

  const setModo = (novoModo) => {
    if (!["auto", "dark", "light"].includes(novoModo)) return;
    setModoState(novoModo);
    try {
      localStorage.setItem(STORAGE_KEY, novoModo);
    } catch {
      // Ignora erro de localStorage
    }
  };

  const alternarTema = () => {
    // Alterna de forma circular: auto -> claro -> escuro -> auto
    // Ou se estiver em dark -> light, se light -> dark
    if (modo === "auto") {
      setModo(modoEfetivo === "dark" ? "light" : "dark");
    } else {
      setModo(modo === "dark" ? "light" : "dark");
    }
  };

  // Atualiza meta tags e atributos no HTML
  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.setAttribute("data-theme", modoEfetivo);
    document.documentElement.style.colorScheme = modoEfetivo;

    // Atualiza theme-color para navegadores móveis / PWA
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", modoEfetivo === "dark" ? "#0F1115" : "#FFFFFF");
  }, [modoEfetivo]);

  const theme = useMemo(() => (modoEfetivo === "dark" ? temaDark : temaLight), [modoEfetivo]);

  const value = useMemo(
    () => ({
      modo,
      modoEfetivo,
      isDark: modoEfetivo === "dark",
      sistemaModo,
      setModo,
      alternarTema,
    }),
    [modo, modoEfetivo, sistemaModo]
  );

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
