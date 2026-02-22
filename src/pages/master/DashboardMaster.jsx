import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { FiGrid, FiSettings, FiArrowLeft, FiPlus, FiBriefcase, FiActivity, FiDollarSign, FiSearch, FiEdit2, FiLock, FiUnlock } from "react-icons/fi";
import { db } from "../../services/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { FiSave, FiInfo, FiTag, FiPhone, FiMail } from "react-icons/fi";
import LoadingGlobal from "../../components/LoadingGlobal";
import { useMasterCompanies } from "../../hooks/useMasterCompanies";
import { useAuth } from "../../contexts/AuthContexto";
import ModalNovaEmpresa from "../../components/master/ModalNovaEmpresa";

export default function DashboardMaster() {
    const navigate = useNavigate();
    const { companies, carregando, erro } = useMasterCompanies();
    const { perfil } = useAuth();

    const [abaAtiva, setAbaAtiva] = React.useState("DASHBOARD");
    const [busca, setBusca] = React.useState("");
    const [modalAberto, setModalAberto] = React.useState(false);
    const [empresaEditando, setEmpresaEditando] = React.useState(null);

    // Configurações SaaS
    const [saasConfig, setSaasConfig] = React.useState({
        nomeSaaS: "PontoFlow",
        logoUrl: "",
        planoBasicoValor: 99,
        planoProValor: 199,
        emailSuporte: "contato@pontoflow.com.br",
        whatsappVendas: "",
        modoManutencao: false
    });
    const [carregandoConfig, setCarregandoConfig] = React.useState(false);
    const [salvandoConfig, setSalvandoConfig] = React.useState(false);

    React.useEffect(() => {
        carregarConfigSaaS();
    }, [abaAtiva]); // Mantém a dependência para estabilidade, mas a lógica interna carrega uma vez se necessário

    const carregarConfigSaaS = async () => {
        if (saasConfig.logoUrl && abaAtiva !== "CONFIG") return; // Evita recarregar se já tiver dados e não estiver na aba de config
        setCarregandoConfig(true);
        try {
            const docRef = doc(db, "settings", "saas");
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setSaasConfig(prev => ({ ...prev, ...snap.data() }));
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar configurações SaaS.");
        } finally {
            setCarregandoConfig(false);
        }
    };

    const handleSalvarConfig = async (e) => {
        e.preventDefault();
        setSalvandoConfig(true);
        try {
            await setDoc(doc(db, "settings", "saas"), {
                ...saasConfig,
                atualizadoEm: new Date().toISOString()
            }, { merge: true });
            toast.success("Configurações salvas com sucesso!");
        } catch (e) {
            console.error(e);
            toast.error("Erro ao salvar configurações.");
        } finally {
            setSalvandoConfig(false);
        }
    };

    const filtradas = React.useMemo(() => {
        return companies.filter(c =>
            c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
            c.cnpj?.includes(busca)
        );
    }, [companies, busca]);

    const stats = React.useMemo(() => {
        const ativas = companies.filter(c => c.status === "ativo").length;
        return {
            total: companies.length,
            ativas,
            bloqueadas: companies.length - ativas
        };
    }, [companies]);

    const handleToggleStatus = async (empresa) => {
        const novoStatus = empresa.status === "ativo" ? "bloqueado" : "ativo";
        try {
            await updateDoc(doc(db, "companies", empresa.id), { status: novoStatus });
            toast.success(`Empresa ${novoStatus === "ativo" ? "ativada" : "bloqueada"}!`);
        } catch (e) {
            toast.error("Erro ao mudar status.");
        }
    };

    if (carregando) return <LoadingGlobal />;

    return (
        <Layout>
            <Sidebar>
                <Branding>
                    <Logo src="/icons/pwa-512x512.png" />
                    PontoFlow Master
                </Branding>

                <Nav>
                    <NavItem $ativo={abaAtiva === "DASHBOARD"} onClick={() => setAbaAtiva("DASHBOARD")}>
                        <FiGrid /> <span>Painel Global</span>
                    </NavItem>
                    <NavItem $ativo={abaAtiva === "EMPRESAS"} onClick={() => setAbaAtiva("EMPRESAS")}>
                        <FiBriefcase /> <span>Empresas</span>
                    </NavItem>
                    <NavItem $ativo={abaAtiva === "CONFIG"} onClick={() => setAbaAtiva("CONFIG")}>
                        <FiSettings /> <span>Configurações SaaS</span>
                    </NavItem>

                    <NavSeparador />

                    <NavItem onClick={() => navigate("/admin")}>
                        <FiArrowLeft /> <span>Painel Admin</span>
                    </NavItem>
                </Nav>
            </Sidebar>

            <Conteudo>
                {abaAtiva === "DASHBOARD" && (
                    <>
                        <TituloSecao>Visão Geral do SaaS</TituloSecao>
                        <GridCards>
                            <Card>
                                <IconCircle color="#2f81f7"><FiBriefcase /></IconCircle>
                                <div>
                                    <LabelCard>Total de Empresas</LabelCard>
                                    <ValorCard>{stats.total}</ValorCard>
                                </div>
                            </Card>
                            <Card>
                                <IconCircle color="#2ecc71"><FiActivity /></IconCircle>
                                <div>
                                    <LabelCard>Empresas Ativas</LabelCard>
                                    <ValorCard>{stats.ativas}</ValorCard>
                                </div>
                            </Card>
                            <Card>
                                <IconCircle color="#f1c40f"><FiDollarSign /></IconCircle>
                                <div>
                                    <LabelCard>Receita Estimada (Base)</LabelCard>
                                    <ValorCard>R$ {(stats.ativas * (saasConfig.planoBasicoValor || 99)).toLocaleString()}</ValorCard>
                                </div>
                            </Card>
                        </GridCards>
                    </>
                )}

                {abaAtiva === "CONFIG" && (
                    <ConfigContainer>
                        <TituloSecao>Configurações Globais do SaaS</TituloSecao>
                        <p style={{ color: '#8d8d99', marginTop: '-16px', fontSize: '14px' }}>
                            Gerencie a identidade, faturamento e canais de suporte padrão do sistema.
                        </p>

                        <FormConfig onSubmit={handleSalvarConfig}>
                            <GridConfig>
                                <SecaoConfig>
                                    <Subtitulo><FiTag /> Identidade e Branding</Subtitulo>
                                    <InputGroup>
                                        <label>Nome do Sistema (SaaS)</label>
                                        <input
                                            value={saasConfig.nomeSaaS}
                                            onChange={e => setSaasConfig({ ...saasConfig, nomeSaaS: e.target.value })}
                                            placeholder="Ex: PontoFlow"
                                        />
                                    </InputGroup>
                                    <InputGroup>
                                        <label>URL do Logotipo Master</label>
                                        <input
                                            value={saasConfig.logoUrl}
                                            onChange={e => setSaasConfig({ ...saasConfig, logoUrl: e.target.value })}
                                            placeholder="https://..."
                                        />
                                    </InputGroup>
                                </SecaoConfig>

                                <SecaoConfig>
                                    <Subtitulo><FiDollarSign /> Tabelas de Preços (Mensal)</Subtitulo>
                                    <InputGroup>
                                        <label>Valor Plano Básico (R$)</label>
                                        <input
                                            type="number"
                                            value={saasConfig.planoBasicoValor}
                                            onChange={e => setSaasConfig({ ...saasConfig, planoBasicoValor: Number(e.target.value) })}
                                        />
                                    </InputGroup>
                                    <InputGroup>
                                        <label>Valor Plano Pro (R$)</label>
                                        <input
                                            type="number"
                                            value={saasConfig.planoProValor}
                                            onChange={e => setSaasConfig({ ...saasConfig, planoProValor: Number(e.target.value) })}
                                        />
                                    </InputGroup>
                                </SecaoConfig>

                                <SecaoConfig>
                                    <Subtitulo><FiMail /> Canais de Suporte e Vendas</Subtitulo>
                                    <InputGroup>
                                        <label>Email de Suporte</label>
                                        <input
                                            type="email"
                                            value={saasConfig.emailSuporte}
                                            onChange={e => setSaasConfig({ ...saasConfig, emailSuporte: e.target.value })}
                                            placeholder="suporte@..."
                                        />
                                    </InputGroup>
                                    <InputGroup>
                                        <label>WhatsApp de Vendas (DDD + Número)</label>
                                        <input
                                            value={saasConfig.whatsappVendas}
                                            onChange={e => setSaasConfig({ ...saasConfig, whatsappVendas: e.target.value })}
                                            placeholder="319..."
                                        />
                                    </InputGroup>
                                </SecaoConfig>

                                <SecaoConfig>
                                    <Subtitulo><FiInfo /> Status do Sistema</Subtitulo>
                                    <ToggleWrapper>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={saasConfig.modoManutencao}
                                                onChange={e => setSaasConfig({ ...saasConfig, modoManutencao: e.target.checked })}
                                            />
                                            Modo Manutenção Global
                                        </label>
                                        <small>Se ativado, impede o acesso de todos os usuários às plataformas admin e colaborador.</small>
                                    </ToggleWrapper>
                                </SecaoConfig>
                            </GridConfig>

                            <FooterAcoes>
                                <BotaoPrincipal type="submit" disabled={salvandoConfig}>
                                    {salvandoConfig ? "Salvando..." : <><FiSave /> Salvar Alterações</>}
                                </BotaoPrincipal>
                            </FooterAcoes>
                        </FormConfig>
                    </ConfigContainer>
                )}

                {abaAtiva === "EMPRESAS" && (
                    <>
                        <TopoAcoes>
                            <BuscaWrapper>
                                <FiSearch />
                                <input
                                    placeholder="Buscar empresa por nome ou CNPJ..."
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                />
                            </BuscaWrapper>
                            <BotaoPrincipal onClick={() => { setEmpresaEditando(null); setModalAberto(true); }}>
                                <FiPlus /> Nova Empresa
                            </BotaoPrincipal>
                        </TopoAcoes>

                        <TabelaContainer>
                            <Tabela>
                                <thead>
                                    <tr>
                                        <th>Empresa</th>
                                        <th>CNPJ</th>
                                        <th>Plano</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtradas.map(c => (
                                        <tr key={c.id}>
                                            <td>
                                                <InfoEmpresa>
                                                    <div className="nome">{c.nome}</div>
                                                    <div className="id">ID: {c.id}</div>
                                                </InfoEmpresa>
                                            </td>
                                            <td>{c.cnpj || "—"}</td>
                                            <td><PlanoBadge>{c.plano || "Básico"}</PlanoBadge></td>
                                            <td>
                                                <StatusBadge $ativo={c.status === "ativo"}>
                                                    {c.status === "ativo" ? "Ativo" : "Bloqueado"}
                                                </StatusBadge>
                                            </td>
                                            <td>
                                                <GroupAcoes>
                                                    <BotaoIcone onClick={() => { setEmpresaEditando(c); setModalAberto(true); }} title="Editar">
                                                        <FiEdit2 size={14} />
                                                    </BotaoIcone>
                                                    <BotaoIcone
                                                        onClick={() => handleToggleStatus(c)}
                                                        $danger={c.status === "ativo"}
                                                        title={c.status === "ativo" ? "Bloquear" : "Ativar"}
                                                    >
                                                        {c.status === "ativo" ? <FiLock size={14} /> : <FiUnlock size={14} />}
                                                    </BotaoIcone>
                                                </GroupAcoes>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Tabela>
                        </TabelaContainer>
                    </>
                )}
            </Conteudo>

            <ModalNovaEmpresa
                aberto={modalAberto}
                onFechar={() => setModalAberto(false)}
                empresa={empresaEditando}
            />
        </Layout>
    );
}

/* Styled Components */

const Layout = styled.div`
    display: flex;
    min-height: 100vh;
    background: #121214;
    color: #e1e1e6;
`;

const Sidebar = styled.aside`
    width: 260px;
    background: #19191b;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    padding: 24px;
`;

const Branding = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 700;
    font-size: 18px;
    margin-bottom: 40px;
`;

const Logo = styled.img`
    width: 32px;
    height: 32px;
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
    color: ${props => props.$ativo ? "#fff" : "#8d8d99"};
    background: ${props => props.$ativo ? "rgba(255, 255, 255, 0.05)" : "transparent"};

    &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
    }
`;

const NavSeparador = styled.div`
    height: 1px;
    background: rgba(255, 255, 255, 0.05);
    margin: 16px 0;
`;

const Conteudo = styled.main`
    flex: 1;
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
`;

const TituloSecao = styled.h2`
    font-size: 24px;
    font-weight: 700;
    margin: 0;
`;

const GridCards = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
`;

const Card = styled.div`
    background: #19191b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
`;

const IconCircle = styled.div`
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: ${props => props.color}22;
    color: ${props => props.color};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
`;

const LabelCard = styled.div`
    font-size: 13px;
    color: #8d8d99;
    margin-bottom: 4px;
`;

const ValorCard = styled.div`
    font-size: 24px;
    font-weight: 700;
`;

const TopoAcoes = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
`;

const BuscaWrapper = styled.div`
    flex: 1;
    max-width: 400px;
    background: #19191b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 12px;

    input {
        background: transparent;
        border: 0;
        color: #fff;
        height: 44px;
        width: 100%;
        outline: none;
    }
`;

const BotaoPrincipal = styled.button`
    background: #2f81f7;
    color: #fff;
    border: 0;
    padding: 0 24px;
    height: 44px;
    border-radius: 8px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
`;

const TabelaContainer = styled.div`
    background: #19191b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
`;

const Tabela = styled.table`
    width: 100%;
    border-collapse: collapse;
    text-align: left;

    th, td {
        padding: 16px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    th {
        background: rgba(255, 255, 255, 0.02);
        color: #8d8d99;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
`;

const InfoEmpresa = styled.div`
    .nome { font-weight: 600; }
    .id { font-size: 11px; color: #8d8d99; }
`;

const PlanoBadge = styled.span`
    background: rgba(47, 129, 247, 0.1);
    color: #2f81f7;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
`;

const StatusBadge = styled.span`
    background: ${props => props.$ativo ? "rgba(46, 204, 113, 0.1)" : "rgba(235, 77, 75, 0.1)"};
    color: ${props => props.$ativo ? "#2ecc71" : "#eb4d4b"};
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
`;

const GroupAcoes = styled.div`
    display: flex;
    gap: 8px;
`;

const BotaoIcone = styled.button`
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: ${props => props.$danger ? "#eb4d4b" : "#8d8d99"};
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: ${props => props.$danger ? "rgba(235, 77, 75, 0.1)" : "rgba(255, 255, 255, 0.05)"};
        border-color: ${props => props.$danger ? "#eb4d4b" : "#2f81f7"};
    }
`;

const ConfigContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 32px;
    animation: fadeIn 0.3s ease-out;

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

const FormConfig = styled.form`
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const GridConfig = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

const SecaoConfig = styled.div`
    background: #19191b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Subtitulo = styled.h3`
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    svg { color: #2f81f7; }
`;

const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    label { font-size: 12px; font-weight: 600; color: #8d8d99; }

    input {
        background: #121214;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        height: 44px;
        padding: 0 16px;
        color: #fff;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;

        &:focus { border-color: #2f81f7; }
    }
`;

const ToggleWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;

    label {
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 600;
        cursor: pointer;
        
        input {
            width: 20px;
            height: 20px;
            cursor: pointer;
        }
    }

    small { color: #8d8d99; font-size: 12px; line-height: 1.5; }
`;

const FooterAcoes = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
`;
