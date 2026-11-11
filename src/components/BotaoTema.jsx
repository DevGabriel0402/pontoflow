import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { FiSun, FiMoon, FiSmartphone, FiCheck } from "react-icons/fi";
import { useTema } from "../contexts/TemaContexto";

export default function BotaoTema({ compacto = false, texto = false }) {
  const { modo, modoEfetivo, setModo } = useTema();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false);
      }
    };
    if (aberto) {
      document.addEventListener("mousedown", handleClickFora);
      document.addEventListener("touchstart", handleClickFora);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickFora);
      document.removeEventListener("touchstart", handleClickFora);
    };
  }, [aberto]);

  const iconeAtual = () => {
    if (modo === "auto") {
      return <FiSmartphone size={compacto ? 18 : 20} />;
    }
    if (modoEfetivo === "light") {
      return <FiSun size={compacto ? 18 : 20} />;
    }
    return <FiMoon size={compacto ? 18 : 20} />;
  };

  const labelAtual = () => {
    if (modo === "auto") return "Tema: Auto";
    if (modo === "light") return "Tema: Claro";
    return "Tema: Escuro";
  };

  return (
    <Wrapper ref={containerRef} $texto={texto}>
      <BotaoTrigger
        type="button"
        onClick={() => setAberto(!aberto)}
        $compacto={compacto}
        $texto={texto}
        title={`Tema: ${modo === "auto" ? "Automático (Dispositivo)" : modo === "light" ? "Claro" : "Escuro"}`}
        aria-label="Alterar tema"
      >
        {iconeAtual()}
        {texto && <span>{labelAtual()}</span>}
      </BotaoTrigger>

      {aberto && (
        <MenuDropdown>
          <OpcaoMenu
            type="button"
            $ativo={modo === "auto"}
            onClick={() => {
              setModo("auto");
              setAberto(false);
            }}
          >
            <div className="icone-label">
              <FiSmartphone size={18} />
              <span>Automático</span>
            </div>
            {modo === "auto" && <FiCheck className="check" size={14} />}
          </OpcaoMenu>

          <OpcaoMenu
            type="button"
            $ativo={modo === "light"}
            onClick={() => {
              setModo("light");
              setAberto(false);
            }}
          >
            <div className="icone-label">
              <FiSun size={18} />
              <span>Modo Claro</span>
            </div>
            {modo === "light" && <FiCheck className="check" size={14} />}
          </OpcaoMenu>

          <OpcaoMenu
            type="button"
            $ativo={modo === "dark"}
            onClick={() => {
              setModo("dark");
              setAberto(false);
            }}
          >
            <div className="icone-label">
              <FiMoon size={18} />
              <span>Modo Escuro</span>
            </div>
            {modo === "dark" && <FiCheck className="check" size={18} />}
          </OpcaoMenu>
        </MenuDropdown>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  width: ${({ $texto }) => ($texto ? "100%" : "auto")};
`;

const BotaoTrigger = styled.button`
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie2};
  color: ${({ theme }) => theme.cores.texto2};
  height: 40px;
  padding: ${({ $compacto }) => ($compacto ? "10px" : "10px 14px")};
  width: ${({ $texto }) => ($texto ? "100%" : "auto")};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: ${({ $texto }) => ($texto ? "flex-start" : "center")};
  gap: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    color: ${({ theme }) => theme.cores.texto};
    border-color: ${({ theme }) => theme.cores.bordaForte};
    background: ${({ theme }) => theme.cores.destaqueHover};
  }

  svg {
    flex-shrink: 0;
  }
`;

const MenuDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 185px;
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.bordaForte};
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 2px;
  animation: fadeInDown 0.15s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translate(-50%, -6px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
`;

const OpcaoMenu = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 12px;
  border: 0;
  border-radius: 8px;
  background: ${({ $ativo, theme }) => ($ativo ? theme.cores.azul + "18" : "transparent")};
  color: ${({ $ativo, theme }) => ($ativo ? theme.cores.azul : theme.cores.texto)};
  font-size: 13px;
  font-weight: ${({ $ativo }) => ($ativo ? "700" : "500")};
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;

  .icone-label {
    display: flex;
    align-items: center;
    gap: 10px;
    
  }

  .check {
    color: ${({ theme }) => theme.cores.azul};
  }

  &:hover {
    background: ${({ $ativo, theme }) => ($ativo ? theme.cores.azul + "25" : theme.cores.destaqueHover)};
  }
`;
