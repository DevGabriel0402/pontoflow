import React from "react";
import styled from "styled-components";
import { NavLink } from "react-router-dom";
import { FiHome, FiClock, FiShield } from "react-icons/fi";

export default function TabbarMobile({ mostrarAdmin }) {
  const cols = mostrarAdmin ? 3 : 2;

  return (
    <Barra $cols={cols}>
      <Item to="/" end>
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
  background: rgba(28, 28, 30, 0.65);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, 1fr);
  padding: 0 10px;
  z-index: 999;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
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
  color: rgba(255,255,255,0.65);
`;

const Item = styled(NavLink)`
  ${baseItem}
  text-decoration: none;
  cursor: pointer;

  &.active {
    color: ${({ theme }) => theme.cores.azul};
  }
`;

const Desativado = styled.div`
  ${baseItem}
  opacity: 0.35;
`;