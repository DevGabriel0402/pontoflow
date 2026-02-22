// src/components/LoadingGlobal.jsx
import React from "react";
import styled, { keyframes } from "styled-components";

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

export default function LoadingGlobal({ fullHeight = true }) {
    return (
        <Container $fullHeight={fullHeight}>
            <Logo src="/icons/pwa-512x512.png" alt="Carregando..." />
        </Container>
    );
}

const Container = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100dvw;
  height: 100dvh;
  background: ${({ theme }) => theme.cores.fundo};
  z-index: 9999;
`;

const Logo = styled.img`
  width: 80px;
  height: 80px;
  object-fit: contain;
  animation: ${pulse} 1.5s ease-in-out infinite;
  
  @media (max-width: 600px) {
    width: 64px;
    height: 64px;
  }
`;
