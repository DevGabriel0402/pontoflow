import React from "react";
import styled from "styled-components";
import { NavLink } from "react-router-dom";
import { FiHome, FiClock, FiShield } from "react-icons/fi";

export default function TabbarMobile({ mostrarAdmin }) {
  return (
    <Barra>
      <Item to="/" end>
        <FiHome size={18} />
        <span>Home</span>
      </Item>

      <Item to="/historico">
        <FiClock size={18} />
        <span>Histórico</span>
      </Item>

      {mostrarAdmin ? (
        <Item to="/admin">
          <FiShield size={18} />
          <span>Admin</span>
        </Item>
      ) : (
        <Desativado aria-hidden="true">
          <FiShield size={18} />
          <span>Admin</span>
        </Desativado>
      )}
    </Barra>
  );
}

const Barra = styled.nav`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 70px;
  background: ${({ theme }) => theme.cores.superficie2};
  border-top: 1px solid ${({ theme }) => theme.cores.borda};
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 8px 10px env(safe-area-inset-bottom);
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