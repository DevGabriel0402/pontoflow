import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { FiGrid, FiUsers, FiDatabase, FiMessageSquare, FiSettings, FiUserPlus } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContexto";

export default function TabbarAdminMobile({ abaAtiva, setAbaAtiva }) {
  const navigate = useNavigate();
  const { temModulo, empresaConfig } = useAuth();
  const corPrimaria = empresaConfig?.config?.visual?.corPrimaria || "#4facfe";

  const abas = [
    { id: "DASHBOARD", label: "Geral", icon: <FiGrid size={20} />, habilitado: true },
    { id: "CADASTRO", label: "Cadastrar", icon: <FiUserPlus size={20} />, habilitado: true },
    { id: "FUNCIONARIOS", label: "Equipe", icon: <FiUsers size={20} />, habilitado: true },
    { id: "BANCO_HORAS", label: "Banco", icon: <FiDatabase size={20} />, habilitado: temModulo('bancoHoras') },
    { id: "JUSTIFICATIVAS", label: "Justif.", icon: <FiMessageSquare size={20} />, habilitado: temModulo('justificativas') },
    { id: "CONFIG", label: "Config", icon: <FiSettings size={20} />, habilitado: true },
  ].filter(a => a.habilitado);

  return (
    <Barra $cols={abas.length} style={{ "--cor-primaria": corPrimaria }}>
      {abas.map((aba) => (
        <Item
          key={aba.id}
          $ativo={abaAtiva === aba.id}
          onClick={() => aba.action ? aba.action() : setAbaAtiva(aba.id)}
        >
          {aba.icon}
          <span>{aba.label}</span>
        </Item>
      ))}
    </Barra>
  );
}

const Barra = styled.nav`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 20px;
  width: calc(100% - 32px);
  max-width: 600px;
  height: 66px;
  background: ${({ theme }) => theme.cores.tabbarFundo};
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid ${({ theme }) => theme.cores.tabbarBorda};
  border-radius: 22px;
  display: grid;
  grid-template-columns: repeat(${props => props.$cols || 5}, 1fr);
  padding: 0 10px;
  z-index: 999;
  box-shadow: ${({ theme }) => theme.sombra.forte};
  transition: background 0.2s ease, border-color 0.2s ease;

  @media (min-width: 901px) {
    display: none;
  }
`;

const Item = styled.button`
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ $ativo, theme }) => $ativo ? "var(--cor-primaria, #4facfe)" : theme.cores.texto2};
  opacity: ${({ $ativo }) => ($ativo ? 1 : 0.75)};
  cursor: pointer;
  transition: all 0.2s ease;

  span {
    font-size: 10px;
  }
`;
