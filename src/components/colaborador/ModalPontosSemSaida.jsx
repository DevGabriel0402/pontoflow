import React from "react";
import styled, { keyframes } from "styled-components";
import { FiAlertTriangle, FiX, FiCalendar, FiClock, FiSend, FiCheckCircle, FiInfo } from "react-icons/fi";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Modal popup para alertar o colaborador sobre dias anteriores
 * em que ele bateu a entrada mas não registrou a saída.
 */
export default function ModalPontosSemSaida({
  aberto,
  onFechar,
  diasSemSaida = [],
  justificativas = [],
  onJustificar
}) {
  if (!aberto || diasSemSaida.length === 0) return null;

  return (
    <Overlay onClick={onFechar}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <Header>
          <IconeDestaque>
            <FiAlertTriangle size={24} />
          </IconeDestaque>
          <TituloBloco>
            <Titulo>Atenção: Saída não Registrada</Titulo>
            <Subtitulo>
              {diasSemSaida.length === 1
                ? "Identificamos 1 dia anterior com entrada sem registro de saída."
                : `Identificamos ${diasSemSaida.length} dias anteriores com entrada sem registro de saída.`}
            </Subtitulo>
          </TituloBloco>
          <BotaoFechar onClick={onFechar} aria-label="Fechar">
            <FiX size={20} />
          </BotaoFechar>
        </Header>

        <AlertaInformativo>
          <FiInfo size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Dias sem saída são considerados como <strong>falta</strong> no banco de horas.
            Envie uma justificativa para regularizar os horários com o gestor.
          </span>
        </AlertaInformativo>

        <ListaDias>
          {diasSemSaida.map((dia) => {
            const dataObj = dia.data || new Date(`${dia.dataKey}T12:00:00`);
            const dataFormatada = format(dataObj, "dd 'de' MMMM (EEEE)", { locale: ptBR });
            const horaEntrada = dia.ponto_indices?.entrada?.time
              ? format(dia.ponto_indices.entrada.time, "HH:mm")
              : "--:--";

            // Verifica se já existe justificativa para esse dia
            const justifPendente = justificativas.find(
              (j) =>
                j.status === "pendente" &&
                j.dataHoraSolicitada?.startsWith(dia.dataKey) &&
                (j.tipo === "SAIDA" || j.tipo === "ABONO_FALTA")
            );

            return (
              <ItemDia key={dia.dataKey}>
                <ItemTopo>
                  <DataWrapper>
                    <FiCalendar size={15} />
                    <strong>{dataFormatada}</strong>
                  </DataWrapper>
                  {justifPendente ? (
                    <BadgeJustificativa $pendente>
                      <FiClock size={12} />
                      Justificativa em Análise
                    </BadgeJustificativa>
                  ) : (
                    <BadgeStatus>
                      <FiAlertTriangle size={12} />
                      Ponto Incompleto
                    </BadgeStatus>
                  )}
                </ItemTopo>

                <ItemDetalhes>
                  <DetalhePonto>
                    <LabelPonto>Entrada:</LabelPonto>
                    <ValorPonto>{horaEntrada}</ValorPonto>
                  </DetalhePonto>
                  <SeparadorPonto>→</SeparadorPonto>
                  <DetalhePonto>
                    <LabelPonto>Saída:</LabelPonto>
                    <ValorPonto $ausente>Não Registrada</ValorPonto>
                  </DetalhePonto>
                </ItemDetalhes>

                <ItemAcoes>
                  {justifPendente ? (
                    <TextoAguardando>
                      <FiCheckCircle size={13} />
                      Aguardando aprovação do gestor
                    </TextoAguardando>
                  ) : (
                    <BotaoJustificar
                      onClick={() => {
                        onFechar();
                        if (onJustificar) onJustificar(dia);
                      }}
                    >
                      <FiSend size={13} />
                      Justificar Saída
                    </BotaoJustificar>
                  )}
                </ItemAcoes>
              </ItemDia>
            );
          })}
        </ListaDias>

        <Rodape>
          <BotaoEntendi onClick={onFechar}>
            Entendi
          </BotaoEntendi>
        </Rodape>
      </ModalBox>
    </Overlay>
  );
}

/* ── Animações ── */
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleUp = keyframes`
  from { transform: scale(0.95) translateY(12px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
`;

/* ── Estilos ── */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(8, 10, 16, 0.82);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalBox = styled.div`
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: #151821;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(243, 156, 18, 0.15);
  overflow: hidden;
  animation: ${scaleUp} 0.25s cubic-bezier(0.16, 1, 0.3, 1);
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const IconeDestaque = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(243, 156, 18, 0.14);
  color: #f39c12;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const TituloBloco = styled.div`
  flex: 1;
`;

const Titulo = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.2px;
`;

const Subtitulo = styled.p`
  margin: 4px 0 0;
  font-size: 12px;
  color: #8c96a8;
  line-height: 1.4;
`;

const BotaoFechar = styled.button`
  background: transparent;
  border: none;
  color: #6c7789;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }
`;

const AlertaInformativo = styled.div`
  margin: 16px 20px 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(243, 156, 18, 0.08);
  border: 1px solid rgba(243, 156, 18, 0.2);
  color: #e6b055;
  font-size: 12px;
  line-height: 1.5;
  display: flex;
  gap: 10px;
  align-items: flex-start;

  strong {
    color: #f39c12;
  }
`;

const ListaDias = styled.div`
  padding: 10px 20px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 3px;
  }
`;

const ItemDia = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(243, 156, 18, 0.25);
    background: rgba(255, 255, 255, 0.045);
  }
`;

const ItemTopo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`;

const DataWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e2e8f0;
  font-size: 13px;

  strong {
    text-transform: capitalize;
  }
`;

const BadgeStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(231, 76, 60, 0.15);
  color: #ff6b6b;
  border: 1px solid rgba(231, 76, 60, 0.25);
`;

const BadgeJustificativa = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(243, 156, 18, 0.15);
  color: #f39c12;
  border: 1px solid rgba(243, 156, 18, 0.25);
`;

const ItemDetalhes = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.25);
  padding: 8px 12px;
  border-radius: 10px;
`;

const DetalhePonto = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
`;

const LabelPonto = styled.span`
  color: #718096;
`;

const ValorPonto = styled.span`
  font-weight: 700;
  color: ${({ $ausente }) => ($ausente ? "#eb4d4b" : "#2ecc71")};
`;

const SeparadorPonto = styled.span`
  color: #4a5568;
  font-size: 12px;
`;

const ItemAcoes = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-top: 2px;
`;

const BotaoJustificar = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #3182ce, #2b6cb0);
  color: #fff;
  border: none;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const TextoAguardando = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #9ae6b4;
  font-weight: 500;
`;

const Rodape = styled.div`
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.2);
`;

const BotaoEntendi = styled.button`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  padding: 9px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
`;
