import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { FiX, FiCheck, FiShield, FiEdit2, FiCheckSquare, FiClock, FiTrash2, FiCalendar, FiAlertTriangle } from "react-icons/fi";
import { db } from "../../services/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";

export default function ModalPermissoesAdmin({ aberto, onFechar, admin, onAtualizado, nomeEmpresa }) {
    const [permissoes, setPermissoes] = useState({
        podeAprovarJustificativas: true,
        podeEditarDia: false,
        podeAjustarBancoHoras: true,
        podeZerarBancoHoras: false,
        podeExcluirPontos: false,
        podeAjustarIntervalo: false,
    });
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (admin) {
            setPermissoes({
                podeAprovarJustificativas: admin.podeAprovarJustificativas !== false,
                podeEditarDia: !!admin.podeEditarDia,
                podeAjustarBancoHoras: admin.podeAjustarBancoHoras !== false,
                podeZerarBancoHoras: !!admin.podeZerarBancoHoras,
                podeExcluirPontos: !!admin.podeExcluirPontos,
                podeAjustarIntervalo: !!admin.podeAjustarIntervalo,
            });
        }
    }, [admin]);

    if (!aberto || !admin) return null;

    const togglePermissao = (chave) => {
        setPermissoes(prev => ({ ...prev, [chave]: !prev[chave] }));
    };

    const handleSalvar = async (e) => {
        e.preventDefault();
        setSalvando(true);
        try {
            await updateDoc(doc(db, "users", admin.id), {
                ...permissoes,
                permissoesAtualizadasEm: serverTimestamp(),
            });
            toast.success(`Permissões de ${admin.nome} atualizadas!`);
            if (onAtualizado) onAtualizado();
            onFechar();
        } catch (error) {
            console.error("Erro ao salvar permissões:", error);
            toast.error("Erro ao salvar permissões.");
        } finally {
            setSalvando(false);
        }
    };

    const listaOpcoes = [
        {
            chave: "podeAprovarJustificativas",
            titulo: "Aprovar & Avaliar Justificativas",
            descricao: "Permite ao administrador analisar, aprovar, rejeitar ou reverter justificativas de ponto e atestados médicos.",
            icone: <FiCheckSquare size={18} color="#2ecc71" />,
            badge: "Essencial",
        },
        {
            chave: "podeEditarDia",
            titulo: "Editar Batidas do Dia (Correção de Ponto)",
            descricao: "Permite alterar, inserir ou corrigir horários de batida no detalhamento diário do banco de horas.",
            icone: <FiEdit2 size={18} color="#2f81f7" />,
            badge: "Operacional",
        },
        {
            chave: "podeAjustarBancoHoras",
            titulo: "Lançamentos no Banco de Horas",
            descricao: "Permite lançar créditos ou débitos manuais avulsos de horas para os colaboradores.",
            icone: <FiClock size={18} color="#f1c40f" />,
            badge: "Operacional",
        },
        {
            chave: "podeZerarBancoHoras",
            titulo: "Zerar Saldo de Banco de Horas",
            descricao: "Permite zerar o saldo acumulado de horas de um colaborador específico ou de todos da instituição.",
            icone: <FiTrash2 size={18} color="#e74c3c" />,
            badge: "Sensível",
        },
        {
            chave: "podeAjustarIntervalo",
            titulo: "Ajuste em Lote por Intervalo de Datas",
            descricao: "Permite aplicar compensações ou ajustes massivos de carga horária em intervalos de datas.",
            icone: <FiCalendar size={18} color="#9b59b6" />,
            badge: "Avançado",
        },
        {
            chave: "podeExcluirPontos",
            titulo: "Excluir Registros de Batida do Dia",
            descricao: "Permite apagar permanentemente todas as marcações de ponto de um colaborador em determinado dia.",
            icone: <FiAlertTriangle size={18} color="#e67e22" />,
            badge: "Crítico",
        },
    ];

    return (
        <Overlay onClick={onFechar}>
            <ModalConteudo onClick={e => e.stopPropagation()}>
                <Header>
                    <HeaderInfo>
                        <IconeHeader>
                            <FiShield size={22} />
                        </IconeHeader>
                        <div>
                            <h3>Controle de Permissões</h3>
                            <SubHeader>
                                <strong>{admin.nome}</strong> • {nomeEmpresa || admin.companyId}
                            </SubHeader>
                        </div>
                    </HeaderInfo>
                    <BotaoFechar onClick={onFechar}><FiX size={20} /></BotaoFechar>
                </Header>

                <Formulario onSubmit={handleSalvar}>
                    <Corpo>
                        <AvisoTexto>
                            Defina com precisão quais privilégios operacionais este administrador possui no painel da instituição.
                        </AvisoTexto>

                        <ListaPermissoes>
                            {listaOpcoes.map(op => {
                                const ativo = !!permissoes[op.chave];
                                return (
                                    <PermissaoCard key={op.chave} $ativo={ativo} onClick={() => togglePermissao(op.chave)}>
                                        <CardEsquerda>
                                            <IconeBox $ativo={ativo}>
                                                {op.icone}
                                            </IconeBox>
                                            <Textos>
                                                <div className="titulo-row">
                                                    <h4>{op.titulo}</h4>
                                                    <span className={`badge-tipo ${op.badge.toLowerCase()}`}>{op.badge}</span>
                                                </div>
                                                <p>{op.descricao}</p>
                                            </Textos>
                                        </CardEsquerda>

                                        <Switch $ativo={ativo}>
                                            <span />
                                        </Switch>
                                    </PermissaoCard>
                                );
                            })}
                        </ListaPermissoes>
                    </Corpo>

                    <Footer>
                        <BotaoGhost type="button" onClick={onFechar}>Cancelar</BotaoGhost>
                        <BotaoPrincipal type="submit" disabled={salvando}>
                            {salvando ? "Gravando..." : <><FiCheck /> Salvar Permissões</>}
                        </BotaoPrincipal>
                    </Footer>
                </Formulario>
            </ModalConteudo>
        </Overlay>
    );
}

/* Styled Components */

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2100;
    padding: 20px;
`;

const ModalConteudo = styled.div`
    background: ${({ theme }) => theme.cores.card};
    border: 1px solid ${({ theme }) => theme.cores.borda};
    width: 100%;
    max-width: 620px;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
    animation: modalFade 0.25s ease-out;
    max-height: 90vh;
    overflow: hidden;

    @keyframes modalFade {
        from { opacity: 0; transform: scale(0.97) translateY(8px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
    }
`;

const Header = styled.div`
    padding: 22px 26px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid ${({ theme }) => theme.cores.borda};
`;

const HeaderInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;

    h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        color: ${({ theme }) => theme.cores.texto};
    }
`;

const SubHeader = styled.p`
    margin: 3px 0 0;
    font-size: 12px;
    color: ${({ theme }) => theme.cores.texto2};

    strong {
        color: ${({ theme }) => theme.cores.texto};
    }
`;

const IconeHeader = styled.div`
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(47, 129, 247, 0.12);
    color: #2f81f7;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const BotaoFechar = styled.button`
    background: transparent;
    border: 0;
    color: ${({ theme }) => theme.cores.texto2};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
        background: ${({ theme }) => theme.cores.destaqueHover};
        color: ${({ theme }) => theme.cores.texto};
    }
`;

const Formulario = styled.form`
    display: flex;
    flex-direction: column;
    overflow-y: auto;
`;

const Corpo = styled.div`
    padding: 24px 26px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow-y: auto;
    max-height: calc(90vh - 170px);
`;

const AvisoTexto = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${({ theme }) => theme.cores.texto2};
    line-height: 1.5;
`;

const ListaPermissoes = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const PermissaoCard = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    border-radius: 14px;
    background: ${({ theme, $ativo }) => $ativo ? theme.cores.superficie2 : theme.cores.superficie};
    border: 1px solid ${({ theme, $ativo }) => $ativo ? (theme.cores.azul + "44") : theme.cores.borda};
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;

    &:hover {
        border-color: ${({ theme }) => theme.cores.azul || "#2f81f7"};
        transform: translateY(-1px);
    }
`;

const CardEsquerda = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
`;

const IconeBox = styled.div`
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: ${({ $ativo }) => $ativo ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const Textos = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;

    .titulo-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;

        h4 {
            margin: 0;
            font-size: 13.5px;
            font-weight: 700;
            color: ${({ theme }) => theme.cores.texto};
        }

        .badge-tipo {
            font-size: 9.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 2px 7px;
            border-radius: 6px;

            &.essencial { background: rgba(46, 204, 113, 0.15); color: #2ecc71; }
            &.operacional { background: rgba(47, 129, 247, 0.15); color: #2f81f7; }
            &.avançado { background: rgba(155, 89, 182, 0.15); color: #9b59b6; }
            &.sensível { background: rgba(231, 76, 60, 0.15); color: #e74c3c; }
            &.crítico { background: rgba(230, 126, 34, 0.15); color: #e67e22; }
        }
    }

    p {
        margin: 0;
        font-size: 11.5px;
        color: ${({ theme }) => theme.cores.texto2};
        line-height: 1.4;
    }
`;

const Switch = styled.div`
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: ${({ theme, $ativo }) => $ativo ? "#2f81f7" : theme.cores.bordaForte};
    position: relative;
    cursor: pointer;
    transition: background 0.25s;
    flex-shrink: 0;

    span {
        position: absolute;
        top: 3px;
        left: ${({ $ativo }) => $ativo ? "23px" : "3px"};
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #fff;
        transition: left 0.25s;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
`;

const Footer = styled.div`
    padding: 16px 26px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    border-top: 1px solid ${({ theme }) => theme.cores.borda};
    background: ${({ theme }) => theme.cores.superficie2};
`;

const BotaoGhost = styled.button`
    background: transparent;
    border: 1px solid ${({ theme }) => theme.cores.borda};
    color: ${({ theme }) => theme.cores.texto2};
    padding: 0 18px;
    height: 42px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: ${({ theme }) => theme.cores.destaqueHover};
        color: ${({ theme }) => theme.cores.texto};
    }
`;

const BotaoPrincipal = styled.button`
    background: #2f81f7;
    color: #fff;
    border: 0;
    padding: 0 22px;
    height: 42px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

