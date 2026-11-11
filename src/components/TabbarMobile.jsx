import React from "react";
import styled from "styled-components";
import { NavLink } from "react-router-dom";
import { FiHome, FiClock, FiShield } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContexto";

export default function TabbarMobile({ mostrarAdmin }) {
  const { empresaConfig } = useAuth();
  const corPrimaria = empresaConfig?.config?.visual?.corPrimaria || "#2f81f7";
  const cols = mostrarAdmin ? 3 : 2;

  return (
    <Barra $cols={cols} style={{ "--cor-primaria": corPrimaria }}>
      <Item to="/home">
        <FiHome size={18} />
        <span>Home</span>
      </Item>

      <Item to="/historico">
        <FiClock size={18} />
        <span>Histórico</span>
      </Item>

      {mostrarAdmin && (
        <Item to="/admin">
          <FiShield size={18} />
          <span>Admin</span>
        </Item>
      )}
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
  grid-template-columns: repeat(${({ $cols }) => $cols}, 1fr);
  padding: 0 10px;
  z-index: 999;
  box-shadow: ${({ theme }) => theme.sombra.forte};
  transition: background 0.2s ease, border-color 0.2s ease;
`;

const baseItem = `
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: var(--cor-tabbar-texto, inherit);
`;

const Item = styled(NavLink)`
  ${baseItem}
  text-decoration: none;
  cursor: pointer;
  color: ${({ theme }) => theme.cores.texto2};

  &.active {
    color: var(--cor-primaria, ${({ theme }) => theme.cores.azul});
  }
`;

const Desativado = styled.div`
  ${baseItem}
  opacity: 0.35;
`;