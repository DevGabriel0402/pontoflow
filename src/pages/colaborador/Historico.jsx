import React from "react";
import styled from "styled-components";
import TabbarMobile from "../../components/TabbarMobile";
import { useAuth } from "../../contexts/AuthContexto";
import { useHistoricoPontos } from "../../hooks/useHistoricoPontos";
import { useSync } from "../../hooks/useSync";
import { obterFila } from "../../services/offlineQueue";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FiFilter, FiUploadCloud, FiMapPin, FiCheck, FiX, FiAlertTriangle, FiAlertCircle, FiSun, FiMoon } from "react-icons/fi";
import { startOfToday, startOfWeek, isAfter } from "date-fns";
import SeletorAcordeao from "../../components/SeletorAcordeao";
import ModalFiltroHistorico from "../../components/colaborador/ModalFiltroHistorico";

const TIPOS = [
  { value: "TODOS", label: "Todos" },
  { value: "ENTRADA", label: "Entrada" },
  { value: "INICIO_INTERVALO", label: "Início Intervalo" },
  { value: "FIM_INTERVALO", label: "Fim Intervalo" },
  { value: "SAIDA", label: "Saída" },
];

function formatarTipo(tipo) {
  const map = {
    ENTRADA: "Entrada",
    INICIO_INTERVALO: "Início Intervalo",
    FIM_INTERVALO: "Fim Intervalo",
    SAIDA: "Saída",
  };
  return map[tipo] || tipo;
}

/**
 * ✅ Data preferida:
 * - criadoEmLocal (timestamp number do device) quando existir
 * - senão criadoEm (Firestore Timestamp)
 */
function getDataPreferida(p) {
  if (p?.criadoEmLocal) return new Date(p.criadoEmLocal);
  if (p?.criadoEm?.toDate) return p.criadoEm.toDate();
  if (p?.criadoEm) return new Date(p.criadoEm);
  return null;
}

function formatarDataPonto(p) {
  const d = getDataPreferida(p);
  if (!d) return "—";
  return format(d, "HH:mm", { locale: ptBR });
}

function getIcone(tipo, dentroDoRaio) {
  if (!dentroDoRaio) return <FiAlertTriangle />;

  switch (tipo) {
    case "ENTRADA": return <FiCheck />;
    case "INICIO_INTERVALO": return <FiSun />;
    case "FIM_INTERVALO": return <FiSun />;
    case "SAIDA": return <FiCheck />;
    default: return <FiCheck />;
  }
}

export default function Historico() {
  const { usuario, isAdmin } = useAuth();
  const { itens, carregando, erro } = useHistoricoPontos(usuario?.uid);

  const { pendentes, online, sincronizando, syncAgora } = useSync();

  const [tipo, setTipo] = React.useState("TODOS");
  const [aba, setAba] = React.useState("HOJE"); // HOJE, SEMANA
  const [dataInicio, setDataInicio] = React.useState("");
  const [dataFim, setDataFim] = React.useState("");
  const [modalFiltroAberto, setModalFiltroAberto] = React.useState(false);

  const filaOffline = React.useMemo(() => obterFila(), [pendentes]); // recarrega quando pendentes muda

  const itensFiltrados = React.useMemo(() => {
    let final = [...itens];

    if (aba === "HOJE") {
      const hoje = startOfToday();
      final = final.filter(p => isAfter(getDataPreferida(p), hoje));
    } else if (aba === "SEMANA") {
      const semana = startOfWeek(new Date(), { locale: ptBR });
      final = final.filter(p => isAfter(getDataPreferida(p), semana));
    }

    if (tipo !== "TODOS") {
      final = final.filter(p => p.type === tipo);
    }

    if (dataInicio || dataFim) {
      const ini = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
      const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;
      final = final.filter(p => {
        const d = getDataPreferida(p);
        if (!d) return true;
        if (ini && d < ini) return false;
        if (fim && d > fim) return false;
        return true;
      });
    }

    return final;
  }, [itens, tipo, dataInicio, dataFim, aba]);

  return (
    <Tela>
      <Topo>
        <Branding>
          <Logo src="/icons/pwa-512x512.png" alt="PontoFlow" />
          PontoFlow
        </Branding>
        <BotaoFiltro onClick={() => setModalFiltroAberto(true)}>
          <FiFilter size={20} />
          {(tipo !== "TODOS" || dataInicio || dataFim) && <BadgeNotificacao />}
        </BotaoFiltro>
      </Topo>

      <ModalFiltroHistorico
        aberto={modalFiltroAberto}
        aoFechar={() => setModalFiltroAberto(false)}
        tipo={tipo}
        setTipo={setTipo}
        dataInicio={dataInicio}
        setDataInicio={setDataInicio}
        dataFim={dataFim}
        setDataFim={setDataFim}
        aoLimpar={() => {
          setTipo("TODOS");
          setDataInicio("");
          setDataFim("");
        }}
      />

      <Corpo>
        <HeaderSecao>
          <TituloPrincipal>Histórico de Pontos</TituloPrincipal>

          <Tabs>
            <Tab $ativo={aba === "HOJE"} onClick={() => setAba("HOJE")}>Hoje</Tab>
            <Tab $ativo={aba === "SEMANA"} onClick={() => setAba("SEMANA")}>Semana</Tab>
          </Tabs>
        </HeaderSecao>

        <ListaRefatorada>
          {/* Exemplo de Layout conforme imagem */}
          {itensFiltrados.length === 0 && !carregando && (
            <Vazio>Nenhum registro encontrado</Vazio>
          )}

          {(() => {
            let ultimaData = "";
            return itensFiltrados.map((p) => {
              const dataObj = getDataPreferida(p);
              const dataKey = dataObj ? format(dataObj, "yyyy-MM-dd") : "";
              const mostrarHeader = dataKey !== ultimaData && aba === "SEMANA";
              if (mostrarHeader) ultimaData = dataKey;

              return (
                <React.Fragment key={p.id}>
                  {mostrarHeader && (
                    <DataSeparador>
                      {format(dataObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </DataSeparador>
                  )}
                  <ItemFlow>
                    <LinhaPrincipal>
                      <IconCol $tipo={p.type} $raio={p.dentroDoRaio}>
                        {getIcone(p.type, p.dentroDoRaio)}
                      </IconCol>

                      <InfoCol>
                        <TextoTipo>{formatarTipo(p.type)}</TextoTipo>
                        <TextoLocal>
                          <FiMapPin size={12} />
                          {p.dentroDoRaio ? "Escola Municipal Senador Levindo Coelho" : "Fora do Raio"}
                        </TextoLocal>
                      </InfoCol>

                      <ValorCol>
                        <HoraPonto>{formatarDataPonto(p)}</HoraPonto>
                        {p.dentroDoRaio === false && (
                          <BadgeStatus $cor="erro">
                            <FiAlertCircle size={14} />
                          </BadgeStatus>
                        )}
                        {p.origem === "offline_queue" && (
                          <BadgeStatus $cor="alerta">
                            <FiAlertTriangle size={14} />
                          </BadgeStatus>
                        )}
                      </ValorCol>
                    </LinhaPrincipal>
                  </ItemFlow>
                </React.Fragment>
              );
            });
          })()}
        </ListaRefatorada>

        {online && pendentes > 0 && (
          <BotaoSincronizar Floating onClick={syncAgora} disabled={sincronizando}>
            {sincronizando ? "Sincronizando..." : `Sincronizar ${pendentes} pontos`}
          </BotaoSincronizar>
        )}
      </Corpo>

      <TabbarMobile mostrarAdmin={isAdmin} />
    </Tela>
  );
}

/* ---------------- styled ---------------- */

const Tela = styled.div`
  min-height: 100vh;
  padding-bottom: 90px;
  background: #000; /* Darker as per image */
  color: #fff;
`;

const Topo = styled.header`
  height: 64px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Branding = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 18px;
`;

const Logo = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  object-fit: contain;
`;

const BotaoFiltro = styled.button`
  background: transparent;
  border: 0;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const BadgeNotificacao = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: #4facfe;
  border-radius: 50%;
  border: 2px solid #000;
`;

const Corpo = styled.div`
  padding: 0 20px;
`;

const HeaderSecao = styled.div`
  margin-bottom: 24px;
`;

const TituloPrincipal = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px;
`;

const Tabs = styled.div`
  display: flex;
  gap: 12px;
`;

const Tab = styled.div`
  padding: 8px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  
  ${({ $ativo, theme }) => $ativo ? `
    background: transparent;
    color: #4facfe;
    border-bottom: 2px solid #4facfe;
    border-radius: 0;
  ` : `
    background: #1c1c1e;
    color: #8e8e93;
  `}
`;

const ListaRefatorada = styled.div`
  display: flex;
  flex-direction: column;
`;

const DataSeparador = styled.div`
  padding: 16px 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: #4facfe;
  text-transform: capitalize;
  border-bottom: 1px solid rgba(79, 172, 254, 0.2);
  margin-bottom: 4px;
`;

const ItemFlow = styled.div`
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const LinhaPrincipal = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const IconCol = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  
  ${({ $tipo, $raio, theme }) => {
    if (!$raio) return "background: #f39c12; color: #fff;"; // Fora do raio
    if ($tipo === "ENTRADA" || $tipo === "SAIDA") return "background: #2ecc71; color: #fff;";
    return "background: #f1c40f; color: #fff;"; // Intervalos
  }}
`;

const InfoCol = styled.div`
  flex: 1;
`;

const TextoTipo = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
`;

const TextoLocal = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #8e8e93;
`;

const ValorCol = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HoraPonto = styled.div`
  font-size: 16px;
  font-weight: 600;
`;

const BadgeStatus = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  ${({ $cor }) => $cor === "erro" ? "background: #eb4d4b; color: #fff;" : "background: #f9ca24; color: #000;"}
`;

const Vazio = styled.div`
  padding: 40px 0;
  text-align: center;
  color: #8e8e93;
  font-size: 14px;
`;

const BotaoSincronizar = styled.button`
  margin-top: 20px;
  width: 100%;
  height: 44px;
  background: #2f81f7;
  color: #fff;
  border: 0;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
`;
