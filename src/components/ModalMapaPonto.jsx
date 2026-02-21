import React from "react";
import styled from "styled-components";
import { FiX, FiMapPin, FiNavigation } from "react-icons/fi";
import MapaVisualizacao from "./MapaVisualizacao";

export default function ModalMapaPonto({ aberto, onFechar, ponto }) {
    if (!aberto || !ponto) return null;

    const lat = ponto.geolocation?.lat;
    const lng = ponto.geolocation?.lng;

    return (
        <Overlay onClick={onFechar}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <Topo>
                    <Titulo>
                        <FiMapPin size={18} />
                        Local do Registro
                    </Titulo>
                    <Fechar onClick={onFechar}>
                        <FiX size={18} />
                    </Fechar>
                </Topo>

                <Conteudo>
                    <Info>
                        <strong>Funcionário:</strong> {ponto.userName || "—"} <br />
                        <strong>Data/Hora:</strong> {new Date(ponto.criadoEm?.seconds * 1000).toLocaleString("pt-BR")}
                    </Info>

                    {lat && lng ? (
                        <MapaVisualizacao lat={lat} lng={lng} dentroDoRaio={ponto.dentroDoRaio} />
                    ) : (
                        <SemMapa>Coordenadas não disponíveis para este registro.</SemMapa>
                    )}

                    <Ações>
                        <BtnGoogleMaps
                            href={`https://www.google.com/maps?q=${lat},${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <FiNavigation size={16} /> Ver no Google Maps
                        </BtnGoogleMaps>
                    </Ações>
                </Conteudo>
            </Modal>
        </Overlay>
    );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 10000;
  backdrop-filter: blur(4px);
`;

const Modal = styled.div`
  width: 100%;
  max-width: 500px;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  position: relative;
`;

const Topo = styled.div`
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => theme.cores.borda};
`;

const Titulo = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.cores.azul};
`;

const Fechar = styled.button`
  background: transparent;
  border: 0;
  color: ${({ theme }) => theme.cores.texto2};
  cursor: pointer;
  display: flex;
  padding: 4px;
  &:hover { color: #fff; }
`;

const Conteudo = styled.div`
  padding: 20px;
`;

const Info = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.cores.texto};
  margin-bottom: 20px;
  line-height: 1.6;
  strong { color: ${({ theme }) => theme.cores.texto2}; }
`;

const SemMapa = styled.div`
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.cores.superficie};
  border-radius: 12px;
  color: ${({ theme }) => theme.cores.texto2};
  font-size: 14px;
`;

const Ações = styled.div`
  margin-top: 20px;
`;

const BtnGoogleMaps = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 48px;
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  color: #fff;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.cores.borda};
  }
`;
