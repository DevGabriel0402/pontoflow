import React from "react";
import styled from "styled-components";
import { FiBell } from "react-icons/fi";

/**
 * Botão de notificação com badge circular para o contador.
 */
export default function NotificationBadge({ count, onClick }) {
  return (
    <Container onClick={onClick} title="Notificações">
      <FiBell size={20} />
      {count > 0 && (
        <Badge>
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Container>
  );
}

const Container = styled.button`
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 12px;
  color: ${({ theme }) => theme.cores.texto};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.cores.superficie};
    border-color: ${({ theme }) => theme.cores.azul};
    color: ${({ theme }) => theme.cores.azul};
  }

  &:active {
    transform: scale(0.95);
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: ${({ theme }) => theme.cores.perigo || "#e74c3c"};
  color: white;
  font-size: 10px;
  font-weight: 800;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${({ theme }) => theme.cores.fundo};
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;
