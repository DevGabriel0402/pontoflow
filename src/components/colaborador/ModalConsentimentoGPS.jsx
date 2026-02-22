import React from "react";
import styled from "styled-components";
import { FiMapPin, FiShield, FiCheck } from "react-icons/fi";

export default function ModalConsentimentoGPS({ aberto, onAceitar }) {
    if (!aberto) return null;

    return (
        <Overlay>
            <Modal>
                <IconePrincipal>
                    <FiMapPin size={32} />
                </IconePrincipal>

                <Titulo>Ativar Geolocalização</Titulo>
                <Descricao>
                    Para garantir a segurança e conformidade do registro de ponto, precisamos verificar se você está no local de trabalho.
                </Descricao>

                <ListaBeneficios>
                    <Item>
                        <FiCheck size={16} />
                        <span>Validação automática do raio de serviço</span>
                    </Item>
                    <Item>
                        <FiCheck size={16} />
                        <span>Conformidade com as normas da empresa</span>
                    </Item>
                    <Item>
                        <FiShield size={16} />
                        <span>Seus dados são protegidos e usados apenas para o ponto</span>
                    </Item>
                </ListaBeneficios>

                <Acoes>
                    <BotaoAcao onClick={onAceitar}>
                        Entendi e desejo ativar
                    </BotaoAcao>
                </Acoes>

                <NotaRodape>
                    Ao clicar em ativar, o seu navegador solicitará permissão de localização. Escolha "Permitir" para prosseguir.
                </NotaRodape>
            </Modal>
        </Overlay>
    );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 9999;
  animation: fadeIn 0.3s ease-out;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 24px;
  padding: 32px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
`;

const IconePrincipal = styled.div`
  width: 64px;
  height: 64px;
  background: ${({ theme }) => theme.cores.azul + "15"};
  color: ${({ theme }) => theme.cores.azul};
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
`;

const Titulo = styled.h2`
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 12px;
`;

const Descricao = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.cores.texto2};
  line-height: 1.6;
  margin-bottom: 24px;
`;

const ListaBeneficios = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
  text-align: left;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: ${({ theme }) => theme.cores.texto2};

  svg {
    color: ${({ theme }) => theme.cores.sucesso};
    flex-shrink: 0;
  }
`;

const Acoes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const BotaoAcao = styled.button`
  height: 52px;
  background: ${({ theme }) => theme.cores.azul};
  color: #fff;
  border: 0;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const NotaRodape = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.cores.texto2};
  opacity: 0.6;
  margin-top: 20px;
  line-height: 1.4;
`;

const fadeIn = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;
