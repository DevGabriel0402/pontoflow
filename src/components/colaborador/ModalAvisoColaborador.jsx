import React from "react";
import styled from "styled-components";
import { FiBell, FiCheck, FiClock, FiAlertTriangle, FiFileText, FiInfo, FiX } from "react-icons/fi";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ModalAvisoColaborador({ notificacao, onConfirmarLeitura, onFechar }) {
  if (!notificacao) return null;

  const getTipoInfo = () => {
    switch (notificacao.tipoAlerta) {
      case "URGENTE":
        return {
          icon: <FiAlertTriangle size={24} color="#e74c3c" />,
          cor: "#e74c3c",
          label: "Aviso Urgente",
          bg: "rgba(231, 76, 60, 0.12)"
        };
      case "LEMBRETE":
        return {
          icon: <FiClock size={24} color="#f1c40f" />,
          cor: "#f1c40f",
          label: "Lembrete de Ponto",
          bg: "rgba(241, 196, 15, 0.12)"
        };
      case "RH":
        return {
          icon: <FiFileText size={24} color="#9b59b6" />,
          cor: "#9b59b6",
          label: "Recursos Humanos / Gestão",
          bg: "rgba(155, 89, 182, 0.12)"
        };
      default:
        return {
          icon: <FiBell size={24} color="#2f81f7" />,
          cor: "#2f81f7",
          label: "Comunicado Oficial",
          bg: "rgba(47, 129, 247, 0.12)"
        };
    }
  };

  const tipoInfo = getTipoInfo();

  let dataFormatada = "";
  try {
    if (notificacao.data) {
      let d = null;
      if (typeof notificacao.data.toDate === "function") {
        d = notificacao.data.toDate();
      } else if (notificacao.data?.seconds) {
        d = new Date(notificacao.data.seconds * 1000);
      } else if (notificacao.data instanceof Date) {
        d = notificacao.data;
      } else {
        d = new Date(notificacao.data);
      }

      if (d && !isNaN(d.getTime())) {
        dataFormatada = format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      }
    }
  } catch (err) {
    console.warn("Erro ao formatar data do aviso:", err);
  }

  const handleConfirmar = () => {
    if (onConfirmarLeitura && notificacao.id) {
      onConfirmarLeitura(notificacao.id);
    }
    if (onFechar) {
      onFechar();
    }
  };

  return (
    <Overlay onClick={onFechar || handleConfirmar}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <Header $bg={tipoInfo.bg}>
          {onFechar && (
            <BotaoFecharTop onClick={onFechar} title="Fechar visualização">
              <FiX size={20} />
            </BotaoFecharTop>
          )}
          <IconeCirculo $bg={tipoInfo.bg}>
            {tipoInfo.icon}
          </IconeCirculo>
          <TipoTag $cor={tipoInfo.cor}>{tipoInfo.label}</TipoTag>
          <Titulo>{notificacao.titulo || "Comunicado da Administração"}</Titulo>
          <SubInfo>
            Enviado por: <strong>{notificacao.criadoPorNome || "Administração"}</strong>
            {dataFormatada && ` • ${dataFormatada}`}
          </SubInfo>
        </Header>

        <Corpo>
          <MensagemBox>
            <p>{notificacao.mensagem}</p>
          </MensagemBox>
        </Corpo>

        <Rodape>
          <BtnConfirmar onClick={handleConfirmar} $cor={tipoInfo.cor}>
            <FiCheck size={18} />
            <span>{notificacao.lida ? "Fechar Aviso" : "Entendi / Confirmar Leitura"}</span>
          </BtnConfirmar>
        </Rodape>
      </ModalBox>
    </Overlay>
  );
}

/* ── Styled Components ────────────────────────── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 10001;
  backdrop-filter: blur(6px);
  animation: fadeIn 0.25s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalBox = styled.div`
  width: 100%;
  max-width: 480px;
  background: ${({ theme }) => theme.cores.card};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
  animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;

  @keyframes modalPop {
    from { opacity: 0; transform: scale(0.92) translateY(12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

const Header = styled.div`
  position: relative;
  padding: 28px 24px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme, $bg }) => $bg || theme.cores.superficie2};
`;

const BotaoFecharTop = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 0;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.cores.texto2};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: ${({ theme }) => theme.cores.texto};
  }
`;

const IconeCirculo = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: ${({ theme }) => theme.cores.card};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  margin-bottom: 4px;
`;

const TipoTag = styled.span`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: ${({ $cor }) => $cor || "#2f81f7"};
`;

const Titulo = styled.h3`
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  color: ${({ theme }) => theme.cores.texto};
  line-height: 1.35;
`;

const SubInfo = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.cores.texto2};

  strong {
    color: ${({ theme }) => theme.cores.texto};
  }
`;

const Corpo = styled.div`
  padding: 24px;
`;

const MensagemBox = styled.div`
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 16px;
  padding: 18px 20px;
  max-height: 240px;
  overflow-y: auto;

  p {
    margin: 0;
    font-size: 14.5px;
    line-height: 1.6;
    color: ${({ theme }) => theme.cores.texto};
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

const Rodape = styled.div`
  padding: 16px 24px 24px;
  display: flex;
  justify-content: center;
`;

const BtnConfirmar = styled.button`
  width: 100%;
  height: 48px;
  border-radius: 14px;
  background: ${({ $cor }) => $cor || "#2f81f7"};
  color: #fff;
  border: 0;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;
