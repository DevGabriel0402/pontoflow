import React, { useState } from "react";
import styled from "styled-components";
import { FiX, FiMapPin, FiNavigation, FiClock, FiCheckCircle, FiAlertTriangle, FiCalendar, FiUser } from "react-icons/fi";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import MapaVisualizacao from "../MapaVisualizacao";

export default function ModalMapaDiaPonto({ aberto, onFechar, dia, funcionario }) {
  if (!aberto || !dia) return null;

  const entradaMeta = dia.ponto_indices?.entrada;
  const saidaMeta = dia.ponto_indices?.saida;

  const temGeoEntrada = !!entradaMeta?.geolocation?.lat && !!entradaMeta?.geolocation?.lng;
  const temGeoSaida = !!saidaMeta?.geolocation?.lat && !!saidaMeta?.geolocation?.lng;

  // Seleciona aba inicial: se tiver entrada com geo, vai na entrada; senão vai na saída
  const [tipoAtivo, setTipoAtivo] = useState(temGeoEntrada ? "ENTRADA" : temGeoSaida ? "SAIDA" : "ENTRADA");

  const metaAtiva = tipoAtivo === "ENTRADA" ? entradaMeta : saidaMeta;
  const latAtiva = metaAtiva?.geolocation?.lat;
  const lngAtiva = metaAtiva?.geolocation?.lng;
  const distanciaAtiva = metaAtiva?.distanciaRelativa;
  const dentroRaioAtivo = metaAtiva?.dentroDoRaio;

  const dataFormatada = dia.data
    ? format(new Date(dia.data), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : dia.dataKey;

  return (
    <Overlay onClick={onFechar}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Topo>
          <Titulo>
            <IconeTopo>
              <FiMapPin size={20} />
            </IconeTopo>
            <div>
              <h3>Localização das Batidas</h3>
              <SubTitulo>
                <FiUser size={12} /> {funcionario?.nome || "Colaborador"} • {funcionario?.exigirGeo === false ? "GPS Livre (Sem Geofencing)" : "Geofencing Padrão"}
              </SubTitulo>
            </div>
          </Titulo>
          <BotaoFechar onClick={onFechar}>
            <FiX size={20} />
          </BotaoFechar>
        </Topo>

        <Corpo>
          <DataBadge>
            <FiCalendar size={14} />
            <span>{dataFormatada}</span>
          </DataBadge>

          {/* Abas para alternar entre Entrada e Saída */}
          <AbasWrapper>
            <AbaBtn
              $ativo={tipoAtivo === "ENTRADA"}
              $temGeo={temGeoEntrada}
              onClick={() => setTipoAtivo("ENTRADA")}
            >
              <div className="indicador entrada" />
              <span>Entrada</span>
              <strong>
                {entradaMeta?.time
                  ? format(new Date(entradaMeta.time), "HH:mm")
                  : "Não registrada"}
              </strong>
              {temGeoEntrada ? (
                <span className="geo-tag ok"><FiMapPin size={10} /> GPS</span>
              ) : (
                <span className="geo-tag sem">Sem GPS</span>
              )}
            </AbaBtn>

            <AbaBtn
              $ativo={tipoAtivo === "SAIDA"}
              $temGeo={temGeoSaida}
              onClick={() => setTipoAtivo("SAIDA")}
            >
              <div className="indicador saida" />
              <span>Saída</span>
              <strong>
                {saidaMeta?.time
                  ? format(new Date(saidaMeta.time), "HH:mm")
                  : "Não registrada"}
              </strong>
              {temGeoSaida ? (
                <span className="geo-tag ok"><FiMapPin size={10} /> GPS</span>
              ) : (
                <span className="geo-tag sem">Sem GPS</span>
              )}
            </AbaBtn>
          </AbasWrapper>

          {/* Card com Detalhes da Batida Selecionada */}
          <CardInfoBatida>
            <div className="linha-principal">
              <div className="tipo-badge">
                <FiClock size={14} />
                <span>Ponto de {tipoAtivo === "ENTRADA" ? "Entrada" : "Saída"}</span>
              </div>
              {metaAtiva?.foiJustificado && (
                <span className="badge-justificado">Horário Justificado</span>
              )}
            </div>

            <div className="dados-grid">
              <div className="dado-item">
                <span className="label">Horário Registrado</span>
                <span className="valor">
                  {metaAtiva?.time
                    ? format(new Date(metaAtiva.time), "HH:mm:ss")
                    : "—"}
                </span>
              </div>

              <div className="dado-item">
                <span className="label">Status da Sede</span>
                <span className="valor">
                  {metaAtiva?.ponto ? (
                    dentroRaioAtivo ? (
                      <span className="tag-status verde"><FiCheckCircle size={12} /> Na Sede</span>
                    ) : (
                      <span className="tag-status amarelo"><FiAlertTriangle size={12} /> Fora da Sede</span>
                    )
                  ) : "—"}
                </span>
              </div>

              <div className="dado-item">
                <span className="label">Distância da Sede</span>
                <span className="valor">
                  {distanciaAtiva !== undefined && distanciaAtiva !== null
                    ? `${Math.round(distanciaAtiva)} metros`
                    : "—"}
                </span>
              </div>

              <div className="dado-item">
                <span className="label">Coordenadas</span>
                <span className="valor coords">
                  {latAtiva && lngAtiva
                    ? `${latAtiva.toFixed(5)}, ${lngAtiva.toFixed(5)}`
                    : "Não disponíveis"}
                </span>
              </div>
            </div>
          </CardInfoBatida>

          {/* Mapa Visual */}
          {latAtiva && lngAtiva ? (
            <MapaWrapper>
              <MapaVisualizacao
                lat={latAtiva}
                lng={lngAtiva}
                dentroDoRaio={dentroRaioAtivo}
              />
            </MapaWrapper>
          ) : (
            <SemMapaBox>
              <FiMapPin size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <strong>Coordenadas GPS não disponíveis para esta batida.</strong>
              <p>
                {metaAtiva?.foiJustificado
                  ? "Este ponto foi lançado via justificativa ou abono administrativo."
                  : "O dispositivo do colaborador não transmitiu as coordenadas ou a permissão de GPS estava inativa."}
              </p>
            </SemMapaBox>
          )}

          {/* Ações / Links */}
          {latAtiva && lngAtiva && (
            <AcoesFooter>
              <BtnGoogleMaps
                href={`https://www.google.com/maps?q=${latAtiva},${lngAtiva}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FiNavigation size={15} />
                <span>Abrir coordenadas no Google Maps</span>
              </BtnGoogleMaps>
            </AcoesFooter>
          )}
        </Corpo>
      </Modal>
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
  z-index: 10000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Modal = styled.div`
  width: 100%;
  max-width: 600px;
  background: ${({ theme }) => theme.cores.card};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  animation: modalSlide 0.25s ease-out;
  display: flex;
  flex-direction: column;
  max-height: 92vh;

  @keyframes modalSlide {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

const Topo = styled.div`
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie2};
`;

const Titulo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    color: ${({ theme }) => theme.cores.texto};
  }
`;

const IconeTopo = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(47, 129, 247, 0.12);
  color: #2f81f7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const SubTitulo = styled.p`
  margin: 3px 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme.cores.texto2};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const BotaoFechar = styled.button`
  background: transparent;
  border: 0;
  color: ${({ theme }) => theme.cores.texto2};
  cursor: pointer;
  display: flex;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.cores.destaqueHover};
    color: ${({ theme }) => theme.cores.texto};
  }
`;

const Corpo = styled.div`
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
`;

const DataBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.cores.texto};
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  padding: 6px 12px;
  border-radius: 10px;
  width: fit-content;
  text-transform: capitalize;
`;

const AbasWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const AbaBtn = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${({ theme, $ativo }) => $ativo ? theme.cores.superficie2 : theme.cores.card};
  border: 1.5px solid ${({ theme, $ativo }) => $ativo ? (theme.cores.azul || "#2f81f7") : theme.cores.borda};
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  position: relative;

  .indicador {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-bottom: 2px;
    &.entrada { background: #2ecc71; box-shadow: 0 0 8px rgba(46, 204, 113, 0.4); }
    &.saida { background: #e74c3c; box-shadow: 0 0 8px rgba(231, 76, 60, 0.4); }
  }

  span {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: ${({ theme }) => theme.cores.texto2};
  }

  strong {
    font-size: 16px;
    font-weight: 800;
    color: ${({ theme }) => theme.cores.texto};
  }

  .geo-tag {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 9.5px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 4px;

    &.ok {
      background: rgba(46, 204, 113, 0.12);
      color: #2ecc71;
    }
    &.sem {
      background: rgba(141, 141, 153, 0.12);
      color: #8d8d99;
    }
  }

  &:hover {
    background: ${({ theme }) => theme.cores.destaqueHover};
  }
`;

const CardInfoBatida = styled.div`
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .linha-principal {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .tipo-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 700;
      color: ${({ theme }) => theme.cores.texto};
    }

    .badge-justificado {
      font-size: 10px;
      font-weight: 700;
      background: rgba(241, 196, 15, 0.15);
      color: #f1c40f;
      padding: 2px 8px;
      border-radius: 6px;
    }
  }

  .dados-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 10px;

    .dado-item {
      display: flex;
      flex-direction: column;
      gap: 3px;

      .label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        color: ${({ theme }) => theme.cores.texto2};
      }

      .valor {
        font-size: 12.5px;
        font-weight: 700;
        color: ${({ theme }) => theme.cores.texto};

        &.coords {
          font-family: monospace;
          font-size: 11px;
        }

        .tag-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10.5px;
          &.verde { background: rgba(46, 204, 113, 0.12); color: #2ecc71; }
          &.amarelo { background: rgba(241, 196, 15, 0.12); color: #f1c40f; }
        }
      }
    }
  }
`;

const MapaWrapper = styled.div`
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.cores.borda};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const SemMapaBox = styled.div`
  padding: 36px 20px;
  text-align: center;
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px dashed ${({ theme }) => theme.cores.borda};
  border-radius: 14px;
  color: ${({ theme }) => theme.cores.texto2};
  display: flex;
  flex-direction: column;
  align-items: center;

  strong {
    font-size: 13.5px;
    color: ${({ theme }) => theme.cores.texto};
    margin-bottom: 4px;
  }

  p {
    font-size: 12px;
    margin: 0;
    max-width: 380px;
    line-height: 1.4;
  }
`;

const AcoesFooter = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const BtnGoogleMaps = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  color: ${({ theme }) => theme.cores.texto};
  font-size: 12px;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: 10px;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.cores.destaqueHover};
    border-color: ${({ theme }) => theme.cores.azul || "#2f81f7"};
    color: ${({ theme }) => theme.cores.azul || "#2f81f7"};
    transform: translateY(-1px);
  }
`;
