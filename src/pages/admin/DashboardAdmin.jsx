import React from "react";
import styled from "styled-components";
import { useAdminPontos } from "../../hooks/useAdminPontos";
import { exportarPontosPdf } from "../../utils/exportarPontosPdf";
import { useNavigate } from "react-router-dom";
import ModalMapaPonto from "../../components/ModalMapaPonto";
import { FiFileText, FiSearch, FiGrid, FiClock, FiSettings, FiDownload, FiMapPin, FiAlertTriangle, FiCheckSquare, FiMoreVertical, FiUserPlus, FiUsers, FiUserCheck, FiUserX, FiArrowLeft, FiMap } from "react-icons/fi";
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
  const navigate = useNavigate();
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
  const [nomePainel, setNomePainel] = React.useState("PontoFlow");
  const [tempNomePainel, setTempNomePainel] = React.useState("PontoFlow");
  const [pontoParaMapa, setPontoParaMapa] = React.useState(null);
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
          if (data.nomePainel) {
            setNomePainel(data.nomePainel);
            setTempNomePainel(data.nomePainel);
          }
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
        nomePainel: tempNomePainel.trim() || "PontoFlow",
        atualizadoEm: new Date(),
      });
      setNomePainel(tempNomePainel.trim() || "PontoFlow");
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
        ? `${dataInicio || "…"} até ${dataFim || "…"} `
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
          <Logo src="/icons/pwa-512x512.png" alt={nomePainel} />
          {nomePainel}
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

          <NavSeparador />

          <NavItem onClick={() => navigate("/")}>
            <FiArrowLeft /> <span>Bater Ponto</span>
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
                    <span>De:</span>
                    <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} title="Data Início" />
                  </FiltroDataWrapper>

                  <FiltroDataWrapper>
                    <span>Até:</span>
                    <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} title="Data Fim" />
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
                              <BtnVerMapa onClick={() => setPontoParaMapa(p)} title="Ver no Mapa">
                                <FiMap size={14} />
                              </BtnVerMapa>
                            </LocalInfo>
                          </td>
                          <td>{typeof p.distanciaRelativa === "number" ? `${p.distanciaRelativa} m` : "X"}</td>
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
                        .filter(f => f.role !== 'admin') // 👈 Remove administradores da lista
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
                                  toast.success(`Usuário ${f.ativo ? 'desativado' : 'ativado'} !`);
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
                </Topo>

                <PainelConfig>
                  <ConfigBox>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <FiMapPin size={18} color="#fff" />
                      <h4 style={{ margin: 0 }}>Geofencing (Raio de Ponto)</h4>
                    </div>
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
                      <div className="input-grid" style={{ marginBottom: '16px' }}>
                        <div className="input-group">
                          <label>Latitude</label>
                          <input
                            type="text"
                            placeholder="Latitude"
                            value={configLat}
                            onChange={(e) => setConfigLat(e.target.value)}
                          />
                        </div>
                        <div className="input-group">
                          <label>Longitude</label>
                          <input
                            type="text"
                            placeholder="Longitude"
                            value={configLng}
                            onChange={(e) => setConfigLng(e.target.value)}
                          />
                        </div>
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
                      {salvandoConfig ? (
                        "Salvando..."
                      ) : (
                        <>
                          <FiCheckSquare size={18} /> Salvar Configurações
                        </>
                      )}
                    </Botao>
                  </ConfigBox>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <ConfigBox>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <FiUsers size={18} color="#fff" />
                        <h4 style={{ margin: 0 }}>Gestão de Acessos</h4>
                      </div>
                      <p>Gerencie quem pode acessar o sistema e cadastre novos funcionários.</p>
                      <BotaoGhost onClick={() => setModalAberto(true)} style={{ width: '100%', justifyContent: 'center' }}>
                        <FiUserPlus size={16} />
                        Cadastrar Novo Funcionário
                      </BotaoGhost>
                    </ConfigBox>

                    <ConfigBox>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <FiSettings size={18} color="#fff" />
                        <h4 style={{ margin: 0 }}>Identidade do Painel</h4>
                      </div>
                      <p>Personalize o nome que aparece no topo e na barra lateral.</p>

                      <div className="input-row">
                        <span>Nome do Painel</span>
                        <input
                          type="text"
                          value={tempNomePainel}
                          onChange={(e) => setTempNomePainel(e.target.value)}
                          placeholder="Ex: Minha Empresa"
                        />
                      </div>

                      <Botao
                        onClick={handleSalvarConfig}
                        disabled={salvandoConfig}
                        style={{ marginTop: '24px', width: '100%', justifyContent: 'center' }}
                      >
                        {salvandoConfig ? <FiSettings className="spin" /> : <FiCheckSquare size={18} />}
                        Salvar Identidade
                      </Botao>
                    </ConfigBox>
                  </div>
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

        <ModalMapaPonto
          aberto={!!pontoParaMapa}
          ponto={pontoParaMapa}
          onFechar={() => setPontoParaMapa(null)}
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
  width: 100%;
  overflow-x: hidden; /* Garante que nada escape do layout principal */
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

const NavSeparador = styled.div`
height: 1px;
background: rgba(255, 255, 255, 0.05);
margin: 16px 0;
`;

const ConteudoPrincipal = styled.main`
  flex: 1;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0; /* Permite que o flex child encolha */

  @media (max-width: 900px) {
    padding: 20px 16px 100px;
  }
`;

const Topo = styled.header`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  @media (max-width: 900px) {
    gap: 12px;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const BuscaWrapper = styled.div`
  flex: 1;
  max-width: 400px;
  height: 44px;
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: ${({ theme }) => theme.raio.lg};
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;

  &:focus-within {
    border-color: ${({ theme }) => theme.cores.azul};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.cores.azul}22;
  }

  @media (max-width: 600px) {
    max-width: none;
    width: 100%;
  }

  svg {
    color: ${({ theme }) => theme.cores.texto2};
    font-size: 18px;
  }

  input {
    background: transparent;
    border: 0;
    color: ${({ theme }) => theme.cores.texto};
    width: 100%;
    outline: none;
    font-size: 14px;
    &::placeholder { color: ${({ theme }) => theme.cores.texto2}88; }
  }
`;

const FiltroDataWrapper = styled.div`
  height: 44px;
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: ${({ theme }) => theme.raio.lg};
  padding: 0 12px;
  display: flex;
  align-items: center;
  transition: all 0.2s;

  &:focus-within {
    border-color: ${({ theme }) => theme.cores.azul};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.cores.azul}22;
  }

  @media (max-width: 600px) {
    width: 100%;
  }

  input {
    background: transparent;
    border: 0;
    color: ${({ theme }) => theme.cores.texto};
    outline: none;
    font-size: 14px;
    flex: 1;

    &::-webkit-calendar-picker-indicator {
      filter: invert(1);
      cursor: pointer;
    }
  }

  span {
    font-size: 11px;
    font-weight: 800;
    color: ${({ theme }) => theme.cores.texto2};
    text-transform: uppercase;
    margin-right: 8px;
    user-select: none;
    letter-spacing: 0.5px;
  }
`;

const SeletorAcordeaoWrapper = styled.div`
  min-width: 180px;
  @media (max-width: 600px) {
    min-width: 0;
    width: 100%;
  }
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

  &: hover: not(: disabled) {
  filter: brightness(1.2);
}
  
  &:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`;

const ResumoCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  width: 100%;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: #19191b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px 24px;
  min-width: 180px;

  @media (max-width: 600px) {
    min-width: 0;
    width: 100%;
  }
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
  width: 100%; /* Garante que a div não estoure o pai */
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
`;

const TabelaStyled = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  min-width: 900px;

  th, td {
    padding: 14px 16px;
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
    background: rgba(235, 77, 75, 0.06);
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #2f81f7;
    cursor: pointer;
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
  border - color: #2f81f7;
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
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 600px) {
    gap: 16px;
  }
`;

const ConfigBox = styled.div`
  background: #19191b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;

  @media (max-width: 600px) {
    padding: 20px 16px;
  }

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
    flex-wrap: wrap;

    @media (max-width: 480px) {
      gap: 8px;
      
      input {
        width: 100%;
        flex: none;
      }
    }

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
      color: ${({ theme }) => theme.cores.texto2};
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
    }
  }

  .input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: ${({ theme }) => theme.cores.texto2};
        margin-bottom: 0;
      }

      input {
        background: #121214;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        height: 44px;
        padding: 0 16px;
        color: #fff;
        outline: none;
        width: 100%;
        
        &:focus {
          border-color: #2f81f7;
        }
      }
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
box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
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
    &.spin {
      animation: spin 2s linear infinite;
    }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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

const BtnVerMapa = styled.button`
  background: rgba(47, 129, 247, 0.1);
  border: 1px solid rgba(47, 129, 247, 0.2);
  color: #2f81f7;
  padding: 4px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: auto;

  &:hover {
    background: #2f81f7;
    color: #fff;
  }
`;
