import React from "react";
import styled from "styled-components";
import { FiGrid, FiClock, FiUsers, FiSettings } from "react-icons/fi";

export default function TabbarAdminMobile({ abaAtiva, setAbaAtiva }) {
    const abas = [
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
                    onClick={() => setAbaAtiva(aba.id)}
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
  left: 0;
  right: 0;
  bottom: 0;
  height: 70px;
  background: #1c1c1e;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 8px 10px env(safe-area-inset-bottom);
  z-index: 999;

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
