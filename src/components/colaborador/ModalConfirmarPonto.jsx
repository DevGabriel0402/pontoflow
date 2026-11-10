import React from "react";
import styled from "styled-components";
import { FiClock, FiX, FiCheck, FiCalendar } from "react-icons/fi";

const LABELS_TIPO = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  INICIO_INTERVALO: "Início do Intervalo",
  FIM_INTERVALO: "Fim do Intervalo",
};

export default function ModalConfirmarPonto({
  aberto,
  onFechar,
  onConfirmar,
  tipo,
  hora,
  data,
  corPrimaria = "#4facfe",
  carregando = false,
}) {
  if (!aberto) return null;

  const labelTipo = LABELS_TIPO[tipo] || tipo || "Ponto";
  const ehEntrada = tipo === "ENTRADA";

  return (
    <Overlay onClick={onFechar}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <FecharBtn onClick={onFechar} disabled={carregando} title="Cancelar">
          <FiX size={20} />
        </FecharBtn>

        <IconeDestaque style={{ "--cor": corPrimaria }}>
          <FiClock size={28} />
        </IconeDestaque>

        <Titulo>Confirmar Registro</Titulo>
        <Subtitulo>
          Verifique as informações antes de confirmar o seu registro de ponto.
        </Subtitulo>

        <CartaoInfo>
          <LinhaTipo>
            <span className="rotulo">Tipo de Registro:</span>
            <BadgeTipo $ehEntrada={ehEntrada} style={{ "--cor": corPrimaria }}>
              {labelTipo}
            </BadgeTipo>
          </LinhaTipo>

          <LinhaHorario>
            <HorarioTexto>{hora || "--:--:--"}</HorarioTexto>
            <DataTexto>
              <FiCalendar size={13} />
              <span>{data || "Hoje"}</span>
            </DataTexto>
          </LinhaHorario>
        </CartaoInfo>

        <Acoes>
          <BotaoCancelar onClick={onFechar} disabled={carregando}>
            Cancelar
          </BotaoCancelar>
          <BotaoConfirmar
            onClick={onConfirmar}
            disabled={carregando}
            style={{
              background: `linear-gradient(135deg, ${corPrimaria}, ${corPrimaria}dd)`,
            }}
          >
            <FiCheck size={18} />
            {carregando ? "Registrando..." : `Confirmar ${labelTipo}`}
          </BotaoConfirmar>
        </Acoes>
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 99999;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const Modal = styled.div`
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 22px;
  width: 100%;
  max-width: 400px;
  padding: 28px 24px 24px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
  animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.94) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

const FecharBtn = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  background: transparent;
  border: 0;
  color: #71717a;
  cursor: pointer;
  padding: 6px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const IconeDestaque = styled.div`
  width: 58px;
  height: 58px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--cor, #4facfe);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
`;

const Titulo = styled.h3`
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 6px 0;
  letter-spacing: -0.3px;
`;

const Subtitulo = styled.p`
  font-size: 13px;
  color: #a1a1aa;
  margin: 0 0 20px 0;
  line-height: 1.5;
`;

const CartaoInfo = styled.div`
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 22px;
`;

const LinhaTipo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 10px;

  .rotulo {
    font-size: 12px;
    color: #a1a1aa;
    font-weight: 600;
  }
`;

const BadgeTipo = styled.span`
  font-size: 12px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ $ehEntrada }) =>
    $ehEntrada ? "rgba(46, 204, 113, 0.15)" : "rgba(243, 156, 18, 0.15)"};
  color: ${({ $ehEntrada }) => ($ehEntrada ? "#2ecc71" : "#f39c12")};
  border: 1px solid
    ${({ $ehEntrada }) =>
      $ehEntrada ? "rgba(46, 204, 113, 0.35)" : "rgba(243, 156, 18, 0.35)"};
`;

const LinhaHorario = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const HorarioTexto = styled.div`
  font-size: 32px;
  font-weight: 900;
  color: #fff;
  letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
`;

const DataTexto = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #71717a;
  text-transform: uppercase;
  letter-spacing: 0.8px;
`;

const Acoes = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const BotaoCancelar = styled.button`
  height: 48px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #d4d4d8;
  font-size: 14px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.06);
    color: #fff;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const BotaoConfirmar = styled.button`
  height: 48px;
  border: 0;
  color: #111;
  font-size: 14px;
  font-weight: 800;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

