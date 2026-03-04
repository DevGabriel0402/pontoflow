import React from "react";
import styled from "styled-components";
import { FiAlertTriangle, FiX, FiCheck } from "react-icons/fi";

export default function ModalConfirmacao({
    aberto,
    onFechar,
    onConfirmar,
    titulo = "Confirmar Ação",
    mensagem = "Tem certeza que deseja realizar esta ação?",
    textoConfirmar = "Confirmar",
    textoCancelar = "Cancelar",
    perigoso = false
}) {
    if (!aberto) return null;

    return (
        <Overlay onClick={onFechar}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
                <Header>
                    <IconWrapper $perigoso={perigoso}>
                        <FiAlertTriangle size={24} />
                    </IconWrapper>
                    <Titulo>{titulo}</Titulo>
                    <FecharBtn onClick={onFechar}><FiX size={20} /></FecharBtn>
                </Header>

                <Corpo>
                    <Mensagem>{mensagem}</Mensagem>
                </Corpo>

                <Rodape>
                    <BtnCancelar onClick={onFechar}>{textoCancelar}</BtnCancelar>
                    <BtnConfirmar $perigoso={perigoso} onClick={onConfirmar}>
                        <FiCheck size={18} />
                        {textoConfirmar}
                    </BtnConfirmar>
                </Rodape>
            </ModalBox>
        </Overlay>
    );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  backdrop-filter: blur(4px);
`;

const ModalBox = styled.div`
  background: #19191b;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  animation: modalEntrada 0.3s ease-out;

  @keyframes modalEntrada {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

const Header = styled.div`
  padding: 24px 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  text-align: center;
`;

const IconWrapper = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: ${({ $perigoso }) => $perigoso ? "rgba(231, 76, 60, 0.15)" : "rgba(241, 196, 15, 0.15)"};
  color: ${({ $perigoso }) => $perigoso ? "#e74c3c" : "#f1c40f"};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
`;

const Titulo = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #fff;
`;

const FecharBtn = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: 0;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  display: flex;
  transition: all 0.2s;
  &:hover { background: rgba(255,255,255,0.05); color: #fff; }
`;

const Corpo = styled.div`
  padding: 0 24px 24px;
  text-align: center;
`;

const Mensagem = styled.p`
  margin: 0;
  font-size: 15px;
  color: #aaa;
  line-height: 1.6;
`;

const Rodape = styled.div`
  padding: 16px 24px 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  background: rgba(0,0,0,0.2);
`;

const BtnBase = styled.button`
  height: 48px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const BtnCancelar = styled(BtnBase)`
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: #8d8d99;
  &:hover { background: rgba(255,255,255,0.05); color: #fff; }
`;

const BtnConfirmar = styled(BtnBase)`
  background: ${({ $perigoso }) => $perigoso ? "#e74c3c" : "#2f81f7"};
  border: 0;
  color: #fff;
  &:hover { filter: brightness(1.1); transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`;
