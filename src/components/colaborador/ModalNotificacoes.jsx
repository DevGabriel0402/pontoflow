import React from "react";
import styled, { keyframes, css } from "styled-components";
import { FiX, FiBell, FiCheckCircle, FiInfo, FiTrash2, FiClock } from "react-icons/fi";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Modal de notificações com estilo premium e responsivo.
 */
export default function ModalNotificacoes({ 
  aberto, 
  onFechar, 
  notificacoes, 
  onMarcarLida, 
  onMarcarTodasLidas,
  onExcluir
}) {
  if (!aberto) return null;

  return (
    <Overlay>
      <Container onClick={(e) => e.stopPropagation()}>
        <Header>
            <HeaderTitle>
                <FiBell size={20} />
                Notificações
            </HeaderTitle>
            <AcoesHeader>
                {notificacoes.some(n => !n.lida) && (
                    <BtnMarcarTudo onClick={onMarcarTodasLidas}>
                        Limpar Badge
                    </BtnMarcarTudo>
                )}
                <BtnFechar onClick={onFechar}>
                    <FiX size={24} />
                </BtnFechar>
            </AcoesHeader>
        </Header>

        <Corpo>
          {notificacoes.length > 0 ? (
            <Lista>
              {notificacoes.map((item) => (
                <Item key={item.id} $lida={item.lida} onClick={() => !item.lida && onMarcarLida(item.id)}>
                  <IconeWrapper $lida={item.lida} $tipo={item.tipo}>
                    {item.tipo === "ponto_faltante" ? <FiClock /> : <FiInfo />}
                  </IconeWrapper>
                  <Info>
                    <Mensagem $lida={item.lida}>{item.mensagem}</Mensagem>
                    <Data>
                        {format(item.data, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </Data>
                  </Info>
                  <AcoesItem onClick={(e) => e.stopPropagation()}>
                    <BtnExcluir title="Excluir notificação" onClick={() => onExcluir(item.id)}>
                        <FiTrash2 size={16} />
                    </BtnExcluir>
                    {!item.lida && <PontoNotificacao />}
                  </AcoesItem>
                </Item>
              ))}
            </Lista>
          ) : (
            <SemNotificacoes>
              <FiBell size={48} />
              <p>Tudo em dia! Nenhuma notificação por aqui.</p>
            </SemNotificacoes>
          )}
        </Corpo>
      </Container>
    </Overlay>
  );
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: ${fadeIn} 0.2s ease-out;
`;

const Container = styled.div`
  width: 100%;
  max-width: 500px;
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  animation: ${slideUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;

  @media (max-width: 600px) {
    border-radius: 24px 24px 0 0;
    position: absolute;
    bottom: 0;
    max-height: 90vh;
  }
`;

const Header = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.cores.borda};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderTitle = styled.h2`
  font-size: 18px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${({ theme }) => theme.cores.texto};

  svg {
    color: ${({ theme }) => theme.cores.azul};
  }
`;

const AcoesHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const BtnMarcarTudo = styled.button`
    background: transparent;
    border: 0;
    color: ${({ theme }) => theme.cores.azul};
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    &:hover {
        text-decoration: underline;
    }
`;

const BtnFechar = styled.button`
  background: transparent;
  border: 0;
  color: ${({ theme }) => theme.cores.texto2};
  cursor: pointer;
  display: flex;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.cores.texto};
  }
`;

const Corpo = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.cores.borda};
    border-radius: 10px;
  }
`;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
`;

const Item = styled.div`
  padding: 16px 24px;
  display: flex;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: ${props => props.$lida ? 'transparent' : props.theme.cores.azul + '08'};

  &:hover {
    background: ${({ theme }) => theme.cores.superficie2};
  }

  & + & {
    border-top: 1px solid ${({ theme }) => theme.cores.borda + '44'};
  }
`;

const IconeWrapper = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$lida ? props.theme.cores.superficie2 : (props.$tipo === 'ponto_faltante' ? '#e74c3c22' : props.theme.cores.azul + '22')};
  color: ${props => props.$lida ? props.theme.cores.texto2 : (props.$tipo === 'ponto_faltante' ? '#e74c3c' : props.theme.cores.azul)};
  flex-shrink: 0;
  font-size: 18px;
`;

const Info = styled.div`
  flex: 1;
`;

const Mensagem = styled.p`
  font-size: 14px;
  line-height: 1.5;
  color: ${props => props.$lida ? props.theme.cores.texto2 : props.theme.cores.texto};
  font-weight: ${props => props.$lida ? '400' : '600'};
  margin-bottom: 4px;
`;

const Data = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.cores.texto2};
`;

const AcoesItem = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const BtnExcluir = styled.button`
    background: transparent;
    border: 0;
    color: ${({ theme }) => theme.cores.texto2};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: 8px;
    transition: all 0.2s;
    opacity: 0.4;

    &:hover {
        background: #e74c3c22;
        color: #e74c3c;
        opacity: 1;
    }
`;

const PontoNotificacao = styled.div`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ theme }) => theme.cores.azul};
`;

const SemNotificacoes = styled.div`
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  color: ${({ theme }) => theme.cores.texto2};

  p {
    font-size: 14px;
    max-width: 250px;
  }

  svg {
    opacity: 0.2;
  }
`;
