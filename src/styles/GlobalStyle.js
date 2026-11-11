import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: ${({ theme }) => theme.nome};
    --cor-fundo: ${({ theme }) => theme.cores.fundo};
    --cor-superficie: ${({ theme }) => theme.cores.superficie};
    --cor-superficie2: ${({ theme }) => theme.cores.superficie2};
    --cor-card: ${({ theme }) => theme.cores.card};
    --cor-sidebar: ${({ theme }) => theme.cores.sidebar};
    --cor-borda: ${({ theme }) => theme.cores.borda};
    --cor-borda-forte: ${({ theme }) => theme.cores.bordaForte};
    --cor-texto: ${({ theme }) => theme.cores.texto};
    --cor-texto2: ${({ theme }) => theme.cores.texto2};
    --cor-texto-muted: ${({ theme }) => theme.cores.textoMuted};
    --cor-input-fundo: ${({ theme }) => theme.cores.inputFundo};
    --cor-input-borda: ${({ theme }) => theme.cores.inputBorda};
    --cor-azul: ${({ theme }) => theme.cores.azul};
    --cor-sucesso: ${({ theme }) => theme.cores.sucesso};
    --cor-alerta: ${({ theme }) => theme.cores.alerta};
    --cor-perigo: ${({ theme }) => theme.cores.perigo};
  }

  * { box-sizing: border-box; }

  html, body { 
    height: 100%; 
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    width: 100%;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  body {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    background: ${({ theme }) => theme.cores.fundo};
    color: ${({ theme }) => theme.cores.texto};
  }

  button, a { 
    font-family: inherit; 
    cursor: pointer;
  }

  a { 
    color: inherit; 
    text-decoration: none; 
  }

  .maplibregl-ctrl {
    display: none !important;
  }
  
  ::-webkit-scrollbar {
    background-color: transparent;
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.nome === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)"};
    border-radius: 6px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: ${({ theme }) => theme.nome === "dark" ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.25)"};
  }

  /* Remove setas de inputs numéricos */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }

  /* Indicador de calendário nos inputs de data */
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    filter: ${({ theme }) => theme.nome === "dark" ? "invert(1)" : "none"};
    cursor: pointer;
  }
`;

export default GlobalStyle;
