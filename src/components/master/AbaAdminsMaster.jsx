import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { FiSearch, FiEdit2, FiLock, FiUnlock, FiMail, FiRefreshCw, FiToggleLeft, FiToggleRight, FiTrash2, FiShield } from "react-icons/fi";
import { db, auth } from "../../services/firebase";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import LoadingGlobal from "../LoadingGlobal";
import { useMasterCompanies } from "../../hooks/useMasterCompanies";
import ModalEditarAdmin from "./ModalEditarAdmin";
import ModalPermissoesAdmin from "./ModalPermissoesAdmin";
import ModalConfirmacao from "../ModalConfirmacao";

export default function AbaAdminsMaster() {
    const { companies } = useMasterCompanies();
    const [admins, setAdmins] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [busca, setBusca] = useState("");

    const [modalAberto, setModalAberto] = useState(false);
    const [adminEditando, setAdminEditando] = useState(null);
    const [adminExcluir, setAdminExcluir] = useState(null);
    const [excluindoAdmin, setExcluindoAdmin] = useState(false);
    const [adminPermissoes, setAdminPermissoes] = useState(null);
    const [modalPermissoesAberto, setModalPermissoesAberto] = useState(false);

    const carregarAdmins = async () => {
        setCarregando(true);
        try {
            const q = query(collection(db, "users"), where("role", "==", "admin"));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAdmins(data);
        } catch (error) {
            console.error("Erro ao carregar admins:", error);
            toast.error("Erro ao carregar lista de administradores.");
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarAdmins();
    }, []);

    const handleToggleAtivo = async (admin) => {
        const novoStatus = admin.ativo === false ? true : false;
        try {
            await updateDoc(doc(db, "users", admin.id), { ativo: novoStatus });
            setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, ativo: novoStatus } : a));
            toast.success(`Administrador ${novoStatus ? "ativado" : "bloqueado"} com sucesso!`);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao alterar status do administrador.");
        }
    };

    const handleResetSenha = async (email) => {
        if (!email) return;
        try {
            await sendPasswordResetEmail(auth, email);
            toast.success(`E-mail de redefinição enviado para ${email}!`);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao enviar e-mail de redefinição.");
        }
    };

    const handleToggleEditarDia = async (admin) => {
        const novoValor = !admin.podeEditarDia;
        try {
            await updateDoc(doc(db, "users", admin.id), { podeEditarDia: novoValor });
            setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, podeEditarDia: novoValor } : a));
            toast.success(`Permissão de editar dia ${novoValor ? "ativada" : "desativada"} para ${admin.nome}!`);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao alterar permissão.");
        }
    };

    const handleExcluirAdmin = async () => {
        if (!adminExcluir) return;
        setExcluindoAdmin(true);
        try {
            await deleteDoc(doc(db, "users", adminExcluir.id));
            setAdmins(prev => prev.filter(a => a.id !== adminExcluir.id));
            toast.success(`Administrador "${adminExcluir.nome}" excluído com sucesso!`);
            setAdminExcluir(null);
        } catch (e) {
            console.error("Erro ao excluir administrador:", e);
            toast.error("Erro ao excluir administrador.");
        } finally {
            setExcluindoAdmin(false);
        }
    };

    const filtrados = React.useMemo(() => {
        return admins.filter(a =>
            a.nome?.toLowerCase().includes(busca.toLowerCase()) ||
            a.email?.toLowerCase().includes(busca.toLowerCase()) ||
            a.companyId?.toLowerCase().includes(busca.toLowerCase())
        );
    }, [admins, busca]);

    const getNomeEmpresa = (companyId) => {
        const company = companies.find(c => c.id === companyId);
        return company ? company.nome : companyId;
    };

    if (carregando) return <LoadingGlobal />;

    return (
        <Container>
            <TopoAcoes>
                <BuscaWrapper>
                    <FiSearch />
                    <input
                        placeholder="Buscar por nome, e-mail ou empresa..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </BuscaWrapper>
                <BotaoAtualizar onClick={carregarAdmins}>
                    <FiRefreshCw /> Atualizar Base
                </BotaoAtualizar>
            </TopoAcoes>

            <TabelaContainer>
                <Tabela>
                    <thead>
                        <tr>
                            <th>Administrador</th>
                            <th>Contato</th>
                            <th>Empresa</th>
                            <th>Permissões & Privilégios</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: "center", color: "#8d8d99" }}>Nenhum administrador encontrado.</td>
                            </tr>
                        ) : (
                            filtrados.map(admin => (
                                <tr key={admin.id}>
                                    <td>
                                        <InfoUser>
                                            <div className="nome">{admin.nome}</div>
                                            <div className="id">ID: {admin.id.substring(0, 8)}...</div>
                                        </InfoUser>
                                    </td>
                                    <td>
                                        <ContatoInfo>
                                            <FiMail size={12} /> {admin.email}
                                        </ContatoInfo>
                                    </td>
                                    <td>
                                        <EmpresaBadge>{getNomeEmpresa(admin.companyId)}</EmpresaBadge>
                                    </td>
                                    <td>
                                        <PermissoesCell>
                                            <BadgesPermissoes>
                                                {admin.podeAprovarJustificativas !== false && (
                                                    <PillPermissao $cor="#2ecc71">Justificativas</PillPermissao>
                                                )}
                                                {admin.podeEditarDia && (
                                                    <PillPermissao $cor="#2f81f7">Editar Ponto</PillPermissao>
                                                )}
                                                {admin.podeAjustarBancoHoras !== false && (
                                                    <PillPermissao $cor="#f1c40f">Banco Horas</PillPermissao>
                                                )}
                                                {admin.podeZerarBancoHoras && (
                                                    <PillPermissao $cor="#e74c3c">Zerar Saldo</PillPermissao>
                                                )}
                                                {admin.podeAjustarIntervalo && (
                                                    <PillPermissao $cor="#9b59b6">Intervalo</PillPermissao>
                                                )}
                                            </BadgesPermissoes>
                                            <BtnConfigPermissoes
                                                onClick={() => { setAdminPermissoes(admin); setModalPermissoesAberto(true); }}
                                                title="Configurar permissões deste administrador"
                                            >
                                                <FiShield size={13} />
                                                <span>Gerenciar</span>
                                            </BtnConfigPermissoes>
                                        </PermissoesCell>
                                    </td>
                                    <td>
                                        <StatusBadge $ativo={admin.ativo !== false}>
                                            {admin.ativo !== false ? "Ativo" : "Bloqueado"}
                                        </StatusBadge>
                                    </td>
                                    <td>
                                        <GroupAcoes>
                                            <BotaoIcone
                                                onClick={() => { setAdminPermissoes(admin); setModalPermissoesAberto(true); }}
                                                title="Configurar Permissões"
                                            >
                                                <FiShield size={14} />
                                            </BotaoIcone>
                                            <BotaoIcone
                                                onClick={() => { setAdminEditando(admin); setModalAberto(true); }}
                                                title="Editar Informações"
                                            >
                                                <FiEdit2 size={14} />
                                            </BotaoIcone>
                                            <BotaoIcone
                                                onClick={() => handleResetSenha(admin.email)}
                                                title="Enviar link de redefinição de senha"
                                            >
                                                <FiMail size={14} />
                                            </BotaoIcone>
                                            <BotaoIcone
                                                onClick={() => handleToggleAtivo(admin)}
                                                $danger={admin.ativo !== false}
                                                title={admin.ativo !== false ? "Bloquear Acesso" : "Liberar Acesso"}
                                            >
                                                {admin.ativo !== false ? <FiLock size={14} /> : <FiUnlock size={14} />}
                                            </BotaoIcone>
                                            <BotaoIcone
                                                onClick={() => setAdminExcluir(admin)}
                                                $danger={true}
                                                title="Excluir Administrador"
                                            >
                                                <FiTrash2 size={14} />
                                            </BotaoIcone>
                                        </GroupAcoes>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Tabela>
            </TabelaContainer>

            <ModalEditarAdmin
                aberto={modalAberto}
                onFechar={() => {
                    setModalAberto(false);
                    setAdminEditando(null);
                }}
                admin={adminEditando}
                companies={companies}
                onAtualizado={carregarAdmins}
            />

            <ModalPermissoesAdmin
                aberto={modalPermissoesAberto}
                onFechar={() => {
                    setModalPermissoesAberto(false);
                    setAdminPermissoes(null);
                }}
                admin={adminPermissoes}
                nomeEmpresa={adminPermissoes ? getNomeEmpresa(adminPermissoes.companyId) : ""}
                onAtualizado={carregarAdmins}
            />

            <ModalConfirmacao
                aberto={!!adminExcluir}
                onFechar={() => setAdminExcluir(null)}
                onConfirmar={handleExcluirAdmin}
                titulo="Excluir Administrador"
                mensagem={`Tem certeza de que deseja excluir permanentemente o administrador "${adminExcluir?.nome}" (${adminExcluir?.email})? O acesso desta conta ao sistema será cancelado imediatamente.`}
                textoConfirmar={excluindoAdmin ? "Excluindo..." : "Excluir Administrador"}
                textoCancelar="Cancelar"
                perigoso={true}
            />
        </Container>
    );
}

/* Styled Components */
const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    box-sizing: border-box;
    animation: fadeIn 0.3s ease-out;

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

const TopoAcoes = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    
    @media (max-width: 600px) {
        flex-direction: column;
        align-items: stretch;
    }
`;

const BuscaWrapper = styled.div`
    flex: 1;
    max-width: 400px;
    background: ${({ theme }) => theme.cores.superficie2};
    border: 1px solid ${({ theme }) => theme.cores.borda};
    border-radius: 8px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 12px;

    input {
        background: transparent;
        border: 0;
        color: ${({ theme }) => theme.cores.texto};
        height: 44px;
        width: 100%;
        outline: none;
    }
    
    @media (max-width: 600px) {
        max-width: 100%;
    }
`;

const BotaoAtualizar = styled.button`
    background: rgba(47, 129, 247, 0.1);
    color: #2f81f7;
    border: 1px solid rgba(47, 129, 247, 0.2);
    padding: 0 16px;
    height: 44px;
    border-radius: 8px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
        background: rgba(47, 129, 247, 0.2);
    }
`;

const TabelaContainer = styled.div`
    background: ${({ theme }) => theme.cores.superficie};
    border: 1px solid ${({ theme }) => theme.cores.borda};
    border-radius: 12px;
    overflow-x: auto;
`;

const Tabela = styled.table`
    width: 100%;
    min-width: 600px;
    border-collapse: collapse;
    text-align: left;

    th, td {
        padding: 16px 24px;
        border-bottom: 1px solid ${({ theme }) => theme.cores.borda};
    }

    th {
        background: ${({ theme }) => theme.cores.tabelaHeader};
        color: ${({ theme }) => theme.cores.texto2};
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
`;

const InfoUser = styled.div`
    .nome { font-weight: 600;  color: ${({ theme }) => theme.cores.texto}; }
    .id { font-size: 11px;  color: ${({ theme }) => theme.cores.texto2}; margin-top: 2px; }
`;

const ContatoInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    color: ${({ theme }) => theme.cores.texto2};
    font-size: 13px;
`;

const EmpresaBadge = styled.span`
    background: ${({ theme }) => theme.nome === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)"};
    color: ${({ theme }) => theme.cores.texto};
    border: 1px solid ${({ theme }) => theme.cores.borda};
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    display: inline-block;
`;

const StatusBadge = styled.span`
    background: ${props => props.$ativo ? "rgba(46, 204, 113, 0.12)" : "rgba(235, 77, 75, 0.12)"};
    color: ${props => props.$ativo ? (props.theme.nome === "dark" ? "#2ecc71" : "#16a34a") : (props.theme.nome === "dark" ? "#eb4d4b" : "#dc2626")};
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
    border: 1px solid ${({ theme }) => theme.cores.borda};
    color: ${props => props.$danger ? (props.theme.cores.perigo || "#eb4d4b") : props.theme.cores.texto2};
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: ${props => props.$danger ? "rgba(235, 77, 75, 0.12)" : props.theme.cores.destaqueHover};
        border-color: ${props => props.$danger ? (props.theme.cores.perigo || "#eb4d4b") : (props.theme.cores.azul || "#2f81f7")};
        color: ${props => props.$danger ? (props.theme.cores.perigo || "#eb4d4b") : props.theme.cores.texto};
    }
`;

const ToggleBtn = styled.button`
    background: transparent;
    border: 0;
    color: ${props => props.$ativo ? (props.theme.nome === "dark" ? "#2ecc71" : "#16a34a") : props.theme.cores.textoMuted};
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
        background: ${props => props.$ativo ? "rgba(46, 204, 113, 0.1)" : props.theme.cores.destaqueHover};
    }
`;

const PermissoesCell = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

const BadgesPermissoes = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
    max-width: 280px;
`;

const PillPermissao = styled.span`
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
    background: ${props => props.$cor ? `${props.$cor}18` : "rgba(255,255,255,0.06)"};
    color: ${props => props.$cor || props.theme.cores.texto};
    border: 1px solid ${props => props.$cor ? `${props.$cor}33` : props.theme.cores.borda};
    white-space: nowrap;
`;

const BtnConfigPermissoes = styled.button`
    background: ${({ theme }) => theme.cores.superficie2};
    border: 1px solid ${({ theme }) => theme.cores.borda};
    color: ${({ theme }) => theme.cores.texto};
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 11.5px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover {
        background: ${({ theme }) => theme.cores.destaqueHover};
        border-color: ${({ theme }) => theme.cores.azul || "#2f81f7"};
        color: ${({ theme }) => theme.cores.azul || "#2f81f7"};
    }
`;
