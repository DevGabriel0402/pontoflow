import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }
  html, body { 
    height: 100%; 
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    width: 100%;
  }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    background: ${({ theme }) => theme.cores.fundo};
    color: ${({ theme }) => theme.cores.texto};
  }
  button, a { 
    font-family: inherit; 
    cursor: pointer;
  }
  a { color: inherit; text-decoration: none; }

  .maplibregl-ctrl{
    display: none !important;
  }
`;

export default GlobalStyle;