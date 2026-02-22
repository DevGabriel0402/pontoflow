import React from "react";
import styled from "styled-components";
import { collection, onSnapshot, query, where, updateDoc, addDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContexto";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FiCheck, FiX, FiUser, FiClock, FiMessageSquare } from "react-icons/fi";

const STATUS_LABEL = {
    pendente: { label: "Pendente", cor: "#f39c12" },
    aprovada: { label: "Aprovada", cor: "#2ecc71" },
    rejeitada: { label: "Rejeitada", cor: "#eb4d4b" },
};

const TIPO_LABEL = {
    ENTRADA: "Entrada",
    INICIO_INTERVALO: "Início Intervalo",
    FIM_INTERVALO: "Fim Intervalo",
    SAIDA: "Saída",
};

function formatarDataHora(str) {
    if (!str) return "—";
    try {
        const d = new Date(str);
        return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch { return str; }
}

function formatarTs(ts) {
    if (!ts) return "—";
    try {
        const d = ts?.toDate ? ts.toDate() : new Date(ts);
        return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch { return "—"; }
}

export default function PainelJustificativas() {
    const { perfil, usuario } = useAuth();
    const [itens, setItens] = React.useState([]);
    const [aba, setAba] = React.useState("pendente");
    const [rejeitandoId, setRejeitandoId] = React.useState(null);
    const [motivoRejeicao, setMotivoRejeicao] = React.useState("");
    const [processando, setProcessando] = React.useState(null);

    React.useEffect(() => {
        if (!usuario) return;

        const filtros = [];
        if (perfil?.companyId) {
            filtros.push(where("companyId", "==", perfil.companyId));
        }
        // Se não há companyId (super admin), busca todas sem filtro de empresa

        const q = filtros.length > 0
            ? query(collection(db, "justificativas"), ...filtros)
            : query(collection(db, "justificativas"));

        const unsub = onSnapshot(q, snap => {
            setItens(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, e => {
            console.error("PainelJustificativas:", e);
            toast.error("Erro ao carregar justificativas: " + e.message);
        });
        return () => unsub();
    }, [usuario, perfil?.companyId]);


    const pendentes = itens.filter(i => i.status === "pendente");
    const filtrados = itens.filter(i => i.status === aba);

    const handleAprovar = async (item) => {
        setProcessando(item.id);
        try {
            // Cria o ponto retroativamente
            await addDoc(collection(db, "pontos"), {
                userId: item.userId,
                userName: item.userName,
                companyId: item.companyId,
                type: item.tipo,
                geolocation: { lat: 0, lng: 0 },
                distanciaRelativa: 0,
                dentroDoRaio: true,
                deviceInfo: { dispositivo: "Justificativa aprovada" },
                ip: "N/A",
                criadoEm: serverTimestamp(),
                origem: "justificativa_aprovada",
                justificativaId: item.id,
                dataHoraOriginal: item.dataHoraSolicitada,
            });
            // Atualiza status
            await updateDoc(doc(db, "justificativas", item.id), {
                status: "aprovada",
                avaliadoPor: usuario.uid,
                avaliadoEm: serverTimestamp(),
            });
            toast.success("Ponto aprovado e registrado com sucesso!");
        } catch (e) {
            console.error(e);
            toast.error("Erro ao aprovar. Tente novamente.");
        } finally {
            setProcessando(null);
        }
    };

    const handleRejeitar = async (item) => {
        setProcessando(item.id);
        try {
            await updateDoc(doc(db, "justificativas", item.id), {
                status: "rejeitada",
                avaliadoPor: usuario.uid,
                avaliadoEm: serverTimestamp(),
                motivoRejeicao: motivoRejeicao.trim() || null,
            });
            toast.success("Justificativa rejeitada.");
            setRejeitandoId(null);
            setMotivoRejeicao("");
        } catch (e) {
            console.error(e);
            toast.error("Erro ao rejeitar. Tente novamente.");
        } finally {
            setProcessando(null);
        }
    };

    return (
        <Container>
            <Tabs>
                {["pendente", "aprovada", "rejeitada"].map(s => (
                    <Tab key={s} $ativo={aba === s} onClick={() => setAba(s)}>
                        {STATUS_LABEL[s].label}
                        {s === "pendente" && pendentes.length > 0 && (
                            <Badge>{pendentes.length}</Badge>
                        )}
                    </Tab>
                ))}
            </Tabs>

            {filtrados.length === 0 ? (
                <Vazio>
                    <FiMessageSquare size={32} color="#555" />
                    <p>Nenhuma justificativa {STATUS_LABEL[aba].label.toLowerCase()}.</p>
                </Vazio>
            ) : (
                <Lista>
                    {filtrados
                        .sort((a, b) => {
                            const da = a.criadoEm?.toDate?.() || new Date(0);
                            const db2 = b.criadoEm?.toDate?.() || new Date(0);
                            return db2 - da;
                        })
                        .map(item => (
                            <Card key={item.id}>
                                <CardHeader>
                                    <UserInfo>
                                        <Avatar><FiUser size={14} /></Avatar>
                                        <div>
                                            <UserName>{item.userName}</UserName>
                                            <Enviada>Enviada em {formatarTs(item.criadoEm)}</Enviada>
                                        </div>
                                    </UserInfo>
                                    <StatusBadge $cor={STATUS_LABEL[item.status].cor}>
                                        {STATUS_LABEL[item.status].label}
                                    </StatusBadge>
                                </CardHeader>

                                <Detalhe>
                                    <DetalheItem>
                                        <span>Tipo</span>
                                        <strong>{TIPO_LABEL[item.tipo] || item.tipo}</strong>
                                    </DetalheItem>
                                    <DetalheItem>
                                        <span>Data/Hora</span>
                                        <strong>{formatarDataHora(item.dataHoraSolicitada)}</strong>
                                    </DetalheItem>
                                </Detalhe>

                                <Justificativa>
                                    <FiMessageSquare size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                                    {item.justificativa}
                                </Justificativa>

                                {item.motivoRejeicao && (
                                    <MotivoRejeicao>
                                        <strong>Motivo da rejeição:</strong> {item.motivoRejeicao}
                                    </MotivoRejeicao>
                                )}

                                {item.status === "pendente" && (
                                    <>
                                        {rejeitandoId === item.id ? (
                                            <RejeicaoBox>
                                                <Textarea
                                                    placeholder="Motivo da rejeição (opcional)..."
                                                    value={motivoRejeicao}
                                                    onChange={e => setMotivoRejeicao(e.target.value)}
                                                    rows={2}
                                                />
                                                <BotoesRejeicao>
                                                    <BtnSecundario onClick={() => { setRejeitandoId(null); setMotivoRejeicao(""); }}>
                                                        Cancelar
                                                    </BtnSecundario>
                                                    <BtnPerigo
                                                        onClick={() => handleRejeitar(item)}
                                                        disabled={processando === item.id}
                                                    >
                                                        <FiX size={14} />
                                                        {processando === item.id ? "..." : "Confirmar Rejeição"}
                                                    </BtnPerigo>
                                                </BotoesRejeicao>
                                            </RejeicaoBox>
                                        ) : (
                                            <Acoes>
                                                <BtnAprovar
                                                    onClick={() => handleAprovar(item)}
                                                    disabled={processando === item.id}
                                                >
                                                    <FiCheck size={15} />
                                                    {processando === item.id ? "Aprovando..." : "Aprovar"}
                                                </BtnAprovar>
                                                <BtnRejeitar onClick={() => setRejeitandoId(item.id)}>
                                                    <FiX size={15} />
                                                    Rejeitar
                                                </BtnRejeitar>
                                            </Acoes>
                                        )}
                                    </>
                                )}
                            </Card>
                        ))}
                </Lista>
            )}
        </Container>
    );
}

/* ── Styled ─────────────────────────── */
const Container = styled.div`width: 100%;`;

const Tabs = styled.div`
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
`;

const Tab = styled.button`
    padding: 8px 18px;
    border-radius: 20px;
    border: 1.5px solid ${p => p.$ativo ? "#4facfe" : "rgba(255,255,255,0.1)"};
    background: ${p => p.$ativo ? "rgba(79,172,254,0.15)" : "transparent"};
    color: ${p => p.$ativo ? "#4facfe" : "#8d8d99"};
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
`;

const Badge = styled.span`
    background: #f39c12;
    color: #000;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 800;
    padding: 1px 7px;
`;

const Vazio = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 48px 20px;
    color: #555;
    font-size: 14px;
    p { margin: 0; }
`;

const Lista = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Card = styled.div`
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 18px;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 14px;
`;

const UserInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const Avatar = styled.div`
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(79,172,254,0.15);
    border: 1px solid rgba(79,172,254,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #4facfe;
    flex-shrink: 0;
`;

const UserName = styled.div`
    font-weight: 700;
    font-size: 14px;
    color: #fff;
`;

const Enviada = styled.div`
    font-size: 11px;
    color: #555;
    margin-top: 2px;
`;

const StatusBadge = styled.div`
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    background: ${p => p.$cor}20;
    color: ${p => p.$cor};
    border: 1px solid ${p => p.$cor}40;
`;

const Detalhe = styled.div`
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
`;

const DetalheItem = styled.div`
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    span { font-size: 11px; color: #666; }
    strong { font-size: 13px; color: #fff; font-weight: 600; }
`;

const Justificativa = styled.div`
    font-size: 13px;
    color: #aaa;
    line-height: 1.6;
    padding: 12px;
    background: rgba(255,255,255,0.03);
    border-radius: 10px;
    border-left: 3px solid rgba(79,172,254,0.4);
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
`;

const MotivoRejeicao = styled.div`
    font-size: 12px;
    color: #eb4d4b;
    padding: 10px 12px;
    background: rgba(235,77,75,0.08);
    border-radius: 10px;
    margin-bottom: 10px;
`;

const Acoes = styled.div`
    display: flex;
    gap: 10px;
`;

const BtnAprovar = styled.button`
    flex: 1;
    height: 42px;
    background: linear-gradient(135deg, #2ecc71, #27ae60);
    border: 0;
    border-radius: 10px;
    color: #fff;
    font-weight: 700;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    transition: filter 0.2s;
    &:hover:not(:disabled) { filter: brightness(1.1); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const BtnRejeitar = styled.button`
    height: 42px;
    padding: 0 20px;
    background: rgba(235,77,75,0.12);
    border: 1.5px solid rgba(235,77,75,0.3);
    border-radius: 10px;
    color: #eb4d4b;
    font-weight: 700;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover { background: rgba(235,77,75,0.2); }
`;

const RejeicaoBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const Textarea = styled.textarea`
    width: 100%;
    background: rgba(255,255,255,0.05);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 10px 14px;
    color: #fff;
    font-size: 13px;
    resize: vertical;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
    &:focus { border-color: #eb4d4b; }
`;

const BotoesRejeicao = styled.div`
    display: flex;
    gap: 10px;
    justify-content: flex-end;
`;

const BtnSecundario = styled.button`
    height: 38px;
    padding: 0 16px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    color: #8d8d99;
    font-size: 13px;
    cursor: pointer;
    &:hover { color: #fff; }
`;

const BtnPerigo = styled.button`
    height: 38px;
    padding: 0 16px;
    background: #eb4d4b;
    border: 0;
    border-radius: 8px;
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
