import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import GlobalStyle from "./styles/GlobalStyle";
import { TemaProviderApp } from "./contexts/TemaContexto";
import { AuthProvider } from "./contexts/AuthContexto";
import { ConfigProvider } from "./contexts/ConfigContexto";
import { registerSW } from 'virtual:pwa-register';

// Registra o Service Worker do PWA
registerSW({ immediate: true });

console.log("main.jsx: Iniciando PontoFlow...");

try {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("Erro fatal: Elemento #root não encontrado no DOM.");
  } else {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <TemaProviderApp>
          <ConfigProvider>
            <AuthProvider>
              <GlobalStyle />
              <App />
            </AuthProvider>
          </ConfigProvider>
        </TemaProviderApp>
      </React.StrictMode>
    );
    console.log("main.jsx: Render command enviado com sucesso.");
  }
} catch (error) {
  console.error("main.jsx: Erro durante a inicialização:", error);
  if (document.body) {
    document.body.innerHTML = `
      <div style="padding: 20px; color: red; font-family: sans-serif;">
        <h1>Erro de Inicialização do React</h1>
        <pre style="background: #f0f0f0; padding: 10px; overflow: auto;">${error.stack || error.message}</pre>
      </div>
    `;
  }
}