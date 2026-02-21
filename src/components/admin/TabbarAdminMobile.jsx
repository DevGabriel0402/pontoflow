import React from "react";
import styled from "styled-components";
import { FiGrid, FiClock, FiUsers, FiSettings, FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function TabbarAdminMobile({ abaAtiva, setAbaAtiva }) {
  const navigate = useNavigate();
  const abas = [
    { id: "VOLTAR", label: "Ponto", icon: <FiArrowLeft size={20} />, action: () => navigate("/") },
    { id: "DASHBOARD", label: "Geral", icon: <FiGrid size={20} /> },
    { id: "HISTORICO", label: "Histórico", icon: <FiClock size={20} /> },
    { id: "FUNCIONARIOS", label: "Equipe", icon: <FiUsers size={20} /> },
    { id: "CONFIG", label: "Config", icon: <FiSettings size={20} /> },
  ];

  return (
    <Barra>
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
  background: rgba(28, 28, 30, 0.65);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 0 10px;
  z-index: 999;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);

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
  color: ${({ $ativo }) => $ativo ? "#4facfe" : "rgba(255, 255, 255, 0.45)"};
  cursor: pointer;
  transition: all 0.2s ease;

  span {
    font-size: 10px;
  }
`;
