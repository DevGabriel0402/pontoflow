import React from "react";
import styled from "styled-components";
import { useAdminPontos } from "../../hooks/useAdminPontos";
import { exportarPontosPdf } from "../../utils/exportarPontosPdf";
import { FiFileText, FiSearch, FiGrid, FiClock, FiSettings, FiDownload, FiMapPin, FiAlertTriangle, FiCheckSquare, FiMoreVertical, FiUserPlus, FiUsers, FiUserCheck, FiUserX } from "react-icons/fi";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import SeletorAcordeao from "../../components/SeletorAcordeao";
import ModalNovoFuncionario from "../../components/admin/ModalNovoFuncionario";
import MapaConfig from "../../components/admin/MapaConfig";
import { db } from "../../services/firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { useAdminFuncionarios } from "../../hooks/useAdminFuncionarios";
import TabbarAdminMobile from "../../components/admin/TabbarAdminMobile";

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

function formatarData(ts) {
  if (!ts) return "—";
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return "Data Inválida";
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch (e) {
    return "Erro Data";
  }
}

export default function DashboardAdmin() {
  const { itens, carregando, erro } = useAdminPontos();

  const [buscaNome, setBuscaNome] = React.useState("");
  const [tipo, setTipo] = React.useState("TODOS");
  const [dataInicio, setDataInicio] = React.useState("");
  const [dataFim, setDataFim] = React.useState("");
  const [mostrarToast, setMostrarToast] = React.useState(false);
  const [abaAtiva, setAbaAtiva] = React.useState("DASHBOARD"); // DASHBOARD, HISTORICO, FUNCIONARIOS, CONFIG
  const [modalAberto, setModalAberto] = React.useState(false);

  // Lista de funcionários para a aba específica
  const { funcionarios, carregando: carregandoFuncs, erro: erroFuncs } = useAdminFuncionarios();
  const [buscaFunc, setBuscaFunc] = React.useState("");

  // Estados para Configurações (Geofencing)
  const [configRaio, setConfigRaio] = React.useState(120);
  const [configLat, setConfigLat] = React.useState(-19.9440459);
  const [configLng, setConfigLng] = React.useState(-43.9147834);
  const [salvandoConfig, setSalvandoConfig] = React.useState(false);

  // Carregar config inicial do Firestore
  React.useEffect(() => {
    const carregar = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "geofencing"));
        if (snap.exists()) {
          const data = snap.data();
          if (data.raio) setConfigRaio(data.raio);
          if (data.lat) setConfigLat(data.lat);
          if (data.lng) setConfigLng(data.lng);
        }
      } catch (e) {
        console.error("Erro ao carregar settings:", e);
      }
    };
    carregar();
  }, []);

  const handleSalvarConfig = async () => {
    setSalvandoConfig(true);
    try {
      await setDoc(doc(db, "settings", "geofencing"), {
        raio: Number(configRaio),
        lat: Number(configLat),
        lng: Number(configLng),
        atualizadoEm: new Date(),
      });
      toast.success("Configurações salvas!");
    } catch (e) {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvandoConfig(false);
    }
  };

  React.useEffect(() => {
    if (mostrarToast) {
      const timer = setTimeout(() => {
        setMostrarToast(false);
      }, 3000); // 3 segundos
      return () => clearTimeout(timer);
    }
  }, [mostrarToast]);

  const filtrados = React.useMemo(() => {
    const ini = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
    const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;

    return itens.filter((p) => {
      const nome = (p.userName || "").toLowerCase();
      const q = buscaNome.trim().toLowerCase();

      if (q && !nome.includes(q)) return false;
      if (tipo !== "TODOS" && p.type !== tipo) return false;

      const d = p.criadoEm?.toDate ? p.criadoEm.toDate() : (p.criadoEm ? new Date(p.criadoEm) : null);
      if (!d) return true;

      if (ini && d < ini) return false;
      if (fim && d > fim) return false;

      return true;
    });
  }, [itens, buscaNome, tipo, dataInicio, dataFim]);

  const countAtivos = React.useMemo(() => {
    const ids = new Set(itens.map(p => p.userId));
    return ids.size;
  }, [itens]);

  const gerarPdf = () => {
    const periodo =
      dataInicio || dataFim
        ? `${dataInicio || "…"} até ${dataFim || "…"}`
        : "Todos os períodos";

    exportarPontosPdf(filtrados, {
      titulo: "Relatório de Pontos — PontoFlow",
      empresa: "Minha Empresa",
      periodo,
      nomeArquivo: `relatorio_pontos_${format(new Date(), "yyyy-MM-dd_HH-mm")}.pdf`,
    });

    setMostrarToast(true);
  };

  return (
    <LayoutAdmin>
      <Sidebar>
        <Branding>
          <Logo src="/icons/pwa-512x512.png" alt="PontoFlow" />
          PontoFlow
        </Branding>

        <Nav>
          <NavItem $ativo={abaAtiva === "DASHBOARD"} onClick={() => setAbaAtiva("DASHBOARD")}>
            <FiGrid /> <span>Dashboard</span>
          </NavItem>
          <NavItem $ativo={abaAtiva === "HISTORICO"} onClick={() => setAbaAtiva("HISTORICO")}>
            <FiClock /> <span>Histórico de Pontos</span>
          </NavItem>
          <NavItem $ativo={abaAtiva === "FUNCIONARIOS"} onClick={() => setAbaAtiva("FUNCIONARIOS")}>
            <FiUsers /> <span>Funcionários</span>
          </NavItem>
          <NavItem $ativo={abaAtiva === "CONFIG"} onClick={() => setAbaAtiva("CONFIG")}>
            <FiSettings /> <span>Configurações</span>
          </NavItem>
        </Nav>
      </Sidebar>

      <ConteudoPrincipal>
        {carregando && <AvisoInfo>Carregando dados...</AvisoInfo>}
        {erro && <AvisoErro>{erro}</AvisoErro>}

        {!carregando && !erro && (
          <>
            {abaAtiva === "HISTORICO" && (
              <>
                <Topo>
                  <BuscaWrapper>
                    <FiSearch />
                    <input
                      placeholder="Nome do Funcionário"
                      value={buscaNome}
                      onChange={(e) => setBuscaNome(e.target.value)}
                    />
                  </BuscaWrapper>

                  <FiltroDataWrapper>
                    <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                  </FiltroDataWrapper>

                  <SeletorAcordeaoWrapper>
                    <SeletorAcordeao
                      opcoes={TIPOS}
                      value={tipo}
                      onChange={(val) => setTipo(val)}
                    />
                  </SeletorAcordeaoWrapper>

                  <BotaoExportar onClick={gerarPdf} disabled={filtrados.length === 0}>
                    <FiFileText /> Exportar PDF
                  </BotaoExportar>
                </Topo>

                <TabelaContainer>
                  <TabelaStyled>
                    <thead>
                      <tr>
                        <th><FiCheckSquare /></th>
                        <th>Funcionário</th>
                        <th>Tipo</th>
                        <th>Data/Hora</th>
                        <th>Origem</th>
                        <th>Localização</th>
                        <th>Distância</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((p) => (
                        <tr key={p.id} className={!p.dentroDoRaio ? "row-alerta" : ""}>
                          <td><input type="checkbox" /></td>
                          <td>{p.userName || "—"}</td>
                          <td>{formatarTipo(p.type)}</td>
                          <td>{formatarData(p.criadoEm)}</td>
                          <td>{p.origem === "offline_queue" ? "Offline" : "Online"}</td>
                          <td>
                            <LocalInfo>
                              <FiMapPin className={p.dentroDoRaio ? "pin-ok" : "pin-alerta"} />
                              {p.dentroDoRaio ? "Escola Municipal Senador Levindo Coelho" : "Fora do Raio"}
                              {!p.dentroDoRaio && <FiAlertTriangle className="icon-alerta" />}
                            </LocalInfo>
                          </td>
                          <td>{typeof p.distanciaRelativa === "number" ? `${p.distanciaRelativa}m` : "X"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </TabelaStyled>
                </TabelaContainer>
              </>
            )}

            {abaAtiva === "DASHBOARD" && (
              <>
                <TituloSecao>Visão Geral</TituloSecao>
                <ResumoCards>
                  <Card>
                    <LabelCard>Funcionários Ativos</LabelCard>
                    <ValorCard>{funcionarios.filter(f => f.ativo).length}</ValorCard>
                  </Card>
                  <Card>
                    <LabelCard>Registros Totais</LabelCard>
                    <ValorCard>{itens.length}</ValorCard>
                  </Card>
                  <Card>
                    <LabelCard>Pontos com Alerta</LabelCard>
                    <ValorCard>{filtrados.filter(p => !p.dentroDoRaio).length}</ValorCard>
                  </Card>
                </ResumoCards>
              </>
            )}

            {abaAtiva === "FUNCIONARIOS" && (
              <>
                <Topo>
                  <BuscaWrapper>
                    <FiSearch />
                    <input
                      placeholder="Buscar funcionário pelo nome ou email"
                      value={buscaFunc}
                      onChange={(e) => setBuscaFunc(e.target.value)}
                    />
                  </BuscaWrapper>

                  <Botao onClick={() => setModalAberto(true)}>
                    <FiUserPlus size={16} />
                    Novo Funcionário
                  </Botao>
                </Topo>

                <TabelaContainer>
                  <TabelaStyled>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Cargo</th>
                        <th>Criado em</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funcionarios
                        .filter(f =>
                          f.nome?.toLowerCase().includes(buscaFunc.toLowerCase()) ||
                          f.email?.toLowerCase().includes(buscaFunc.toLowerCase())
                        )
                        .map((f) => (
                          <tr key={f.id}>
                            <td>
                              <StatusBadge $ativo={f.ativo}>
                                {f.ativo ? <FiUserCheck /> : <FiUserX />}
                                {f.ativo ? "Ativo" : "Inativo"}
                              </StatusBadge>
                            </td>
                            <td>{f.nome}</td>
                            <td>{f.email}</td>
                            <td>{f.role === 'admin' ? 'Administrador' : 'Colaborador'}</td>
                            <td>{formatarData(f.criadoEm)}</td>
                            <td>
                              <BotaoAcao onClick={async () => {
                                try {
                                  await updateDoc(doc(db, "users", f.id), { ativo: !f.ativo });
                                  toast.success(`Usuário ${f.ativo ? 'desativado' : 'ativado'}!`);
                                } catch (e) {
                                  toast.error("Erro ao mudar status.");
                                }
                              }}>
                                {f.ativo ? "Desativar" : "Ativar"}
                              </BotaoAcao>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </TabelaStyled>
                </TabelaContainer>
              </>
            )}

            {abaAtiva === "CONFIG" && (
              <>
                <Topo>
                  <TituloSecao>Configurações do Sistema</TituloSecao>
                  <Botao onClick={() => setModalAberto(true)}>
                    <FiUserPlus size={16} />
                    Novo Funcionário
                  </Botao>
                </Topo>

                <PainelConfig>
                  <ConfigBox>
                    <h4>Geofencing (Raio da Escola)</h4>
                    <p>Defina o raio de tolerância para batida de ponto na Escola Municipal Senador Levindo Coelho.</p>
                    <div className="input-row">
                      <input
                        type="number"
                        placeholder="Ex: 500"
                        value={configRaio}
                        onChange={(e) => setConfigRaio(e.target.value)}
                      />
                      <span>metros</span>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                      <h4>Localização da Sede</h4>
                      <p>Coordenadas centrais da escola ou arraste o marcador.</p>
                      <div className="input-row" style={{ marginBottom: '16px' }}>
                        <input
                          type="text"
                          placeholder="Latitude"
                          value={configLat}
                          onChange={(e) => setConfigLat(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Longitude"
                          value={configLng}
                          onChange={(e) => setConfigLng(e.target.value)}
                        />
                      </div>
                      <MapaConfig
                        lat={Number(configLat)}
                        lng={Number(configLng)}
                        raio={Number(configRaio)}
                        onMove={(pos) => {
                          setConfigLat(pos.lat);
                          setConfigLng(pos.lng);
                        }}
                      />
                      <BotaoGhost
                        onClick={() => {
                          setConfigLat(-19.9440459);
                          setConfigLng(-43.9147834);
                          toast.success("Mapa resetado para a Sede");
                        }}
                        style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}
                      >
                        <FiMapPin size={16} />
                        Resetar para Sede (Rua Caraça, 910)
                      </BotaoGhost>
                    </div>

                    <Botao
                      onClick={handleSalvarConfig}
                      disabled={salvandoConfig}
                      style={{ marginTop: '32px', width: '100%', justifyContent: 'center' }}
                    >
                      {salvandoConfig ? "Salvando..." : "Salvar Configurações"}
                    </Botao>
                  </ConfigBox>

                  <ConfigBox>
                    <h4>Gestão de Acessos</h4>
                    <p>Gerencie quem pode acessar o sistema e cadastre novos funcionários.</p>
                    <BotaoGhost onClick={() => setModalAberto(true)}>
                      <FiUserPlus size={16} />
                      Cadastrar Novo Funcionário
                    </BotaoGhost>
                  </ConfigBox>
                </PainelConfig>
              </>
            )}
          </>
        )}

        {/* Toast com timeout */}
        {mostrarToast && <ToastSucesso>Relatório PDF gerado com sucesso!</ToastSucesso>}

        <ModalNovoFuncionario
          aberto={modalAberto}
          onFechar={() => setModalAberto(false)}
        />

        <TabbarAdminMobile abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      </ConteudoPrincipal>
    </LayoutAdmin>
  );
}

/* ---------------- styled ---------------- */

const Tela = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.cores.fundo};
  color: ${({ theme }) => theme.cores.texto};
`;

const LayoutAdmin = styled.div`
  display: flex;
  min-height: 100vh;
  background: #121214;
  color: #e1e1e6;
`;

const Sidebar = styled.aside`
  width: 260px;
  flex-shrink: 0;
  background: #19191b;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  padding: 24px;

  @media (max-width: 900px) {
    display: none;
  }
`;

const Branding = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 20px;
  margin-bottom: 48px;
`;

const Logo = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  object-fit: contain;
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const NavItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  color: ${({ $ativo }) => $ativo ? "#fff" : "#8d8d99"};
  background: ${({ $ativo }) => $ativo ? "rgba(255, 255, 255, 0.05)" : "transparent"};
  border: 1px solid ${({ $ativo }) => $ativo ? "rgba(255, 255, 255, 0.1)" : "transparent"};

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
  }

  svg {
    font-size: 18px;
  }
`;

const ConteudoPrincipal = styled.main`
  flex: 1;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  @media (max-width: 900px) {
    padding: 20px 16px 100px;
  }
`;

const Topo = styled.header`
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const BuscaWrapper = styled.div`
  flex: 1;
  max-width: 400px;
  height: 44px;
  background: #19191b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: #8d8d99;
  }

  input {
    background: transparent;
    border: 0;
    color: #fff;
    width: 100%;
    outline: none;
    font-size: 14px;
  }
`;

const FiltroDataWrapper = styled.div`
  height: 44px;
  background: #19191b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0 12px;
  display: flex;
  align-items: center;

  input {
    background: transparent;
    border: 0;
    color: #fff;
    outline: none;
    font-size: 14px;
  }
`;

const SeletorAcordeaoWrapper = styled.div`
  min-width: 180px;
`;

const BotaoExportar = styled.button`
  height: 44px;
  padding: 0 20px;
  background: #2f81f7;
  color: #fff;
  border: 0;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: filter 0.2s;

  &:hover:not(:disabled) {
    filter: brightness(1.2);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResumoCards = styled.div`
  display: flex;
  gap: 16px;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const Card = styled.div`
  background: #19191b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px 24px;
  min-width: 200px;
`;

const LabelCard = styled.div`
  font-size: 13px;
  color: #8d8d99;
  font-weight: 600;
  margin-bottom: 8px;
`;

const ValorCard = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #fff;
`;

const TabelaContainer = styled.div`
  background: #19191b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow-x: auto;
`;

const TabelaStyled = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;

  th, td {
    padding: 16px;
    font-size: 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  th {
    background: #1c1c1e;
    color: #8d8d99;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  tr.row-alerta {
    background: rgba(235, 77, 75, 0.15);
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #2f81f7;
  }
`;

const LocalInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  .pin-ok { color: #2ecc71; }
  .pin-alerta { color: #f1c40f; }
  .icon-alerta { color: #f1c40f; font-size: 16px; }
`;

const Botao = styled.button`
  height: 44px;
  padding: 0 20px;
  background: #2f81f7;
  color: #fff;
  border: 0;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: filter 0.2s;

  &:hover {
    filter: brightness(1.2);
  }
`;

const BotaoGhost = styled.button`
  height: 44px;
  padding: 0 20px;
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: #2f81f7;
  }
`;

const TituloSecao = styled.h2`
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #fff;
`;

const PainelConfig = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ConfigBox = styled.div`
  background: #19191b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;

  h4 {
    margin: 0 0 8px;
    font-size: 16px;
    color: #fff;
  }

  p {
    font-size: 13px;
    color: #8d8d99;
    margin: 0 0 20px;
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: 12px;

    input {
      background: #121214;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      height: 44px;
      padding: 0 16px;
      color: #fff;
      outline: none;
      flex: 1;
      
      &:focus {
        border-color: #2f81f7;
      }
    }

    span {
      color: #8d8d99;
      font-size: 14px;
      font-weight: 600;
    }
  }
`;

const AvisoInfo = styled.div`
  padding: 20px;
  background: rgba(47, 129, 247, 0.1);
  border-radius: 8px;
  color: #2f81f7;
`;

const AvisoErro = styled.div`
  padding: 20px;
  background: rgba(235, 77, 75, 0.1);
  border-radius: 8px;
  color: #eb4d4b;
`;

const ToastSucesso = styled.div`
  position: fixed;
  bottom: 32px;
  right: 32px;
  background: #2ecc71;
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  background: ${({ $ativo }) => $ativo ? "rgba(46, 204, 113, 0.1)" : "rgba(235, 77, 75, 0.1)"};
  color: ${({ $ativo }) => $ativo ? "#2ecc71" : "#eb4d4b"};
  border: 1px solid ${({ $ativo }) => $ativo ? "rgba(46, 204, 113, 0.2)" : "rgba(235, 77, 75, 0.2)"};

  svg {
    font-size: 14px;
  }
`;

const BotaoAcao = styled.button`
  background: transparent;
  color: #8d8d99;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #fff;
    border-color: #2f81f7;
    background: rgba(47, 129, 247, 0.1);
  }
`;
