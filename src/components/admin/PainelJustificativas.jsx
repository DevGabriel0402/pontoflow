import React from "react";
import styled from "styled-components";
import { collection, onSnapshot, query, where, updateDoc, addDoc, doc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContexto";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FiCheck, FiX, FiUser, FiClock, FiMessageSquare, FiPaperclip, FiEdit, FiCalendar, FiExternalLink } from "react-icons/fi";
import SeletorAcordeao from "../SeletorAcordeao";

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
    ABONO_FALTA: "Abono de Falta (Dia Inteiro)",
};

const TIPO_ANEXO_LABEL = {
    SEM_ANEXO: "Nenhum",
    ATESTADO_MEDICO: "Atestado Médico",
    COMPARECIMENTO: "Declaração Téc/Comparecimento",
    OBITO: "Atestado de Óbito Familiar",
    NASCIMENTO: "Atestado de Nascimento",
    OUTRO: "Outro"
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

    // Filtros de Data
    const hoje = new Date();
    const [mesSelecionado, setMesSelecionado] = React.useState(hoje.getMonth());
    const [anoSelecionado, setAnoSelecionado] = React.useState(hoje.getFullYear());
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    // View de Foto Modal
    const [anexoVisualizando, setAnexoVisualizando] = React.useState(null);

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


    // Filtragem local por mês e ano
    const itensFiltradosPorData = React.useMemo(() => {
        return itens.filter(item => {
            const dateStr = item.dataHoraSolicitada || "";
            if (!dateStr || dateStr.length < 7) return true; // fallback
            // dataHoraSolicitada = "YYYY-MM-DDTHH:mm"
            const anoloc = parseInt(dateStr.substring(0, 4));
            const mesloc = parseInt(dateStr.substring(5, 7)) - 1; // 0-indexed
            return anoloc === anoSelecionado && mesloc === mesSelecionado;
        });
    }, [itens, mesSelecionado, anoSelecionado]);

    const pendentes = itensFiltradosPorData.filter(i => i.status === "pendente");
    const filtrados = itensFiltradosPorData.filter(i => i.status === aba);

    const handleAprovar = async (item) => {
        setProcessando(item.id);
        try {
            let dataHoraFinal = item.dataHoraSolicitada;
            const dateSolicitada = item.dataHoraSolicitada.substring(0, 10); // "YYYY-MM-DD"

            // Se for justificativa de "FIM_INTERVALO", buscar o "INICIO_INTERVALO" correspondente do dia para cravar exata 1 hora depois
            if (item.tipo === "FIM_INTERVALO") {
                const q = query(
                    collection(db, "pontos"),
                    where("userId", "==", item.userId),
                    where("type", "==", "INICIO_INTERVALO")
                );

                const snap = await getDocs(q);
                let inicioEncontrado = null;

                snap.docs.forEach(d => {
                    const obj = d.data();
                    const dLocal = obj.dataHoraOriginal
                        ? obj.dataHoraOriginal.substring(0, 10)
                        : (obj.criadoEm?.toDate ? format(obj.criadoEm.toDate(), "yyyy-MM-dd") : "");

                    if (dLocal === dateSolicitada) {
                        inicioEncontrado = obj;
                    }
                });

                if (inicioEncontrado) {
                    const dataObj = inicioEncontrado.dataHoraOriginal
                        ? new Date(inicioEncontrado.dataHoraOriginal)
                        : inicioEncontrado.criadoEm.toDate();

                    // Adiciona exatamente 1 hora
                    dataObj.setHours(dataObj.getHours() + 1);
                    dataHoraFinal = format(dataObj, "yyyy-MM-dd'T'HH:mm");
                    toast.success("O sistema fixou o retorno em exatamente 1 hora após o intervalo.", { duration: 4000 });
                } else {
                    toast.error("Início do intervalo não encontrado neste dia. O horário solicitado na justificativa foi mantido.", { duration: 4500 });
                }
            }

            if (item.tipo === "ABONO_FALTA") {
                // Para abono, NÃO criamos o ponto (já que a pessoa não trabalhou).
                // Inserimos um registro no banco de horas com 0 minutos. O utilitário
                // de cálculo (pontoUtils) vai identificar a data desse abono
                // e zerar as horas "Esperadas" para aquele dia.
                const minutosAbono = 0;


                await addDoc(collection(db, "banco_horas"), {
                    userId: item.userId,
                    companyId: item.companyId,
                    tipo: "CREDITO",
                    minutos: minutosAbono,
                    descricao: `Abono de Falta ref. ${format(new Date(item.dataHoraSolicitada), "dd/MM/yyyy")}`,
                    origem: "JUSTIFICATIVA_APROVADA",
                    justificativaId: item.id,
                    criadoEm: serverTimestamp(),
                    criadoPor: usuario.uid,
                });
            } else {
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
                    dataHoraOriginal: dataHoraFinal,
                });

                // Cria um log (0 minutos) no banco_horas para registrar a aprovação
                await addDoc(collection(db, "banco_horas"), {
                    userId: item.userId,
                    companyId: item.companyId,
                    tipo: "CREDITO",
                    minutos: 0,
                    descricao: `${TIPO_LABEL[item.tipo] || item.tipo} corrigido ref. ${format(new Date(dataHoraFinal), "dd/MM/yyyy HH:mm")}`,
                    origem: "JUSTIFICATIVA_APROVADA",
                    justificativaId: item.id,
                    criadoEm: serverTimestamp(),
                    criadoPor: usuario.uid,
                });
            }

            // Atualiza status da justificativa
            await updateDoc(doc(db, "justificativas", item.id), {
                status: "aprovada",
                avaliadoPor: usuario.uid,
                avaliadoPorNome: perfil?.nome || usuario.email,
                avaliadoEm: serverTimestamp(),
            });

            toast.success("Justificativa aprovada com sucesso!");
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
                avaliadoPorNome: perfil?.nome || usuario.email,
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

    const handleVoltarPendente = async (item) => {
        if (!window.confirm("Deseja voltar esta justificativa para Análise (Pendente)? O ponto será mantido (se foi aprovado) e precisará ser ajustado manualmente se necessário.")) return;
        setProcessando(item.id);
        try {
            await updateDoc(doc(db, "justificativas", item.id), {
                status: "pendente",
                avaliadoPor: null,
                avaliadoPorNome: null,
                avaliadoEm: null,
                motivoRejeicao: null,
            });
            toast.success("Status retornado para Pendente!");
        } catch (e) {
            console.error(e);
            toast.error("Erro ao alterar o status.");
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

            <FiltrosBar>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8d8d99', fontSize: 13, fontWeight: 600 }}>
                    <FiCalendar /> Filtrar por Mês:
                </div>
                <SeletorWrapper>
                    <SeletorAcordeao
                        opcoes={meses.map((m, i) => ({ value: i, label: m }))}
                        value={mesSelecionado}
                        onChange={(val) => setMesSelecionado(Number(val))}
                    />
                </SeletorWrapper>
                <SeletorWrapper $small>
                    <SeletorAcordeao
                        opcoes={[hoje.getFullYear() - 2, hoje.getFullYear() - 1, hoje.getFullYear()].map(a => ({ value: a, label: String(a) }))}
                        value={anoSelecionado}
                        onChange={(val) => setAnoSelecionado(Number(val))}
                    />
                </SeletorWrapper>
            </FiltrosBar>

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

                                {(item.status === "aprovada" || item.status === "rejeitada") && item.avaliadoPorNome && (
                                    <AvaliadorInfo>
                                        <FiUser size={12} />
                                        Avaliado por: <strong>{item.avaliadoPorNome}</strong>
                                    </AvaliadorInfo>
                                )}

                                <Justificativa>
                                    <FiMessageSquare size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                                    {item.justificativa}
                                </Justificativa>

                                {item.tipoAnexo && item.tipoAnexo !== "SEM_ANEXO" && (
                                    <AnexoInfo>
                                        <div className="resumo">
                                            <FiPaperclip size={14} color="#4facfe" />
                                            <span>Documento anexado:</span>
                                            <strong>{TIPO_ANEXO_LABEL[item.tipoAnexo] || item.tipoAnexo}</strong>
                                        </div>
                                        {item.anexoUrl && (
                                            <BtnVerAnexo onClick={() => setAnexoVisualizando(item.anexoUrl)}>
                                                <FiExternalLink /> Ver Anexo
                                            </BtnVerAnexo>
                                        )}
                                    </AnexoInfo>
                                )}

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
                                {item.status !== "pendente" && (
                                    <AcoesSecundarias>
                                        <BtnEditar onClick={() => handleVoltarPendente(item)} disabled={processando === item.id}>
                                            <FiEdit size={13} />
                                            Editar Status
                                        </BtnEditar>
                                    </AcoesSecundarias>
                                )}
                            </Card>
                        ))}
                </Lista>
            )}

            {/* Modal de visualização de anexo */}
            {anexoVisualizando && (
                <Overlay onClick={() => setAnexoVisualizando(null)}>
                    <ModalImg>
                        <BtnFecharModal onClick={() => setAnexoVisualizando(null)}>
                            <FiX size={24} />
                        </BtnFecharModal>
                        <img src={anexoVisualizando} alt="Atestado" />
                    </ModalImg>
                </Overlay>
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

const FiltrosBar = styled.div`
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    flex-wrap: wrap;
`;

const SelectFiltro = styled.select`
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    outline: none;
    cursor: pointer;
    min-width: 120px;

    option {
        background: #1e1e24;
        color: #fff;
    }
`;

const SeletorWrapper = styled.div`
  width: ${({ $small }) => $small ? "100px" : "150px"};
  
  @media (max-width: 600px) {
    width: 100%;
  }
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

const AvaliadorInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #8d8d99;
    background: rgba(255,255,255,0.03);
    padding: 8px 12px;
    border-radius: 8px;
    margin-bottom: 12px;
    strong { color: #fff; font-weight: 600; }
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

const AcoesSecundarias = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 14px;
`;

const BtnEditar = styled.button`
    height: 34px;
    padding: 0 14px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    color: #8d8d99;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
    
    &:hover { 
        color: #fff; 
        border-color: rgba(255, 255, 255, 0.3); 
    }
    
    &:disabled { 
        opacity: 0.5; 
        cursor: not-allowed; 
    }
`;
