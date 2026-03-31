import React from "react";
import styled from "styled-components";
import { collection, onSnapshot, query, where, updateDoc, addDoc, doc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContexto";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FiCheck, FiX, FiUser, FiClock, FiMessageSquare, FiPaperclip, FiEdit, FiCalendar, FiExternalLink, FiDownload } from "react-icons/fi";
import SeletorAcordeao from "../SeletorAcordeao";
import ModalConfirmacao from "../ModalConfirmacao";

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

export default function PainelJustificativas({ funcionarios = [] }) {
    const { perfil, usuario } = useAuth();
    const [itens, setItens] = React.useState([]);
    const [aba, setAba] = React.useState("pendente");
    const [rejeitandoId, setRejeitandoId] = React.useState(null);
    const [motivoRejeicao, setMotivoRejeicao] = React.useState("");
    const [confirmarVoltarPendente, setConfirmarVoltarPendente] = React.useState({ aberto: false, item: null });
    const [processando, setProcessando] = React.useState(null);

    // Filtros de Data
    const hoje = new Date();
    const [mesSelecionado, setMesSelecionado] = React.useState(hoje.getMonth());
    const [anoSelecionado, setAnoSelecionado] = React.useState(hoje.getFullYear());
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    // View de Foto Modal (Full-screen)
    const [anexoVisualizando, setAnexoVisualizando] = React.useState(null);

    // Filtro por Funcionário
    const [idFuncSelecionado, setIdFuncSelecionado] = React.useState("todos");


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


    // Filtragem local por mês, ano e funcionário
    const itensFiltradosLocal = React.useMemo(() => {
        return itens.filter(item => {
            // 1. Filtro de Data
            const dateStr = item.dataHoraSolicitada || "";
            if (!dateStr || dateStr.length < 7) return true; // fallback
            const anoloc = parseInt(dateStr.substring(0, 4));
            const mesloc = parseInt(dateStr.substring(5, 7)) - 1; // 0-indexed
            const bateData = anoloc === anoSelecionado && mesloc === mesSelecionado;

            // 2. Filtro de Funcionário
            const bateFunc = idFuncSelecionado === "todos" || item.userId === idFuncSelecionado;

            return bateData && bateFunc;
        });
    }, [itens, mesSelecionado, anoSelecionado, idFuncSelecionado]);

    const pendentes = itensFiltradosLocal.filter(i => i.status === "pendente");
    const filtrados = itensFiltradosLocal.filter(i => i.status === aba);

    const handleAprovar = async (item) => {
        setProcessando(item.id);
        try {
            const dateSolicitada = item.dataHoraSolicitada.substring(0, 10); // "YYYY-MM-DD"
            const [datePart, timePart] = item.dataHoraSolicitada.split('T');
            const [y, m, d] = datePart.split('-').map(Number);
            const [hh, mm] = timePart.split(':').map(Number);
            const dataObjBase = new Date(y, m - 1, d, hh, mm);
            const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
            const diaNome = diasSemana[dataObjBase.getDay()];

            // Buscar dados do funcionário para pegar a jornada
            const { getDoc, getDocs, deleteDoc } = await import("firebase/firestore");
            const userSnap = await getDoc(doc(db, "users", item.userId));
            const userDados = userSnap.exists() ? userSnap.data() : null;

            let dataHoraFinal = item.dataHoraSolicitada;
            let overrideMsg = "";

            if (userDados) {
                const jornadas = userDados.jornadas || (userDados.jornada ? { padrao: userDados.jornada } : null);
                let jornadaDoDia = null;

                if (userDados.jornadas) {
                    jornadaDoDia = userDados.jornadas[diaNome];
                } else if (userDados.jornada) {
                    const isFDS = diaNome === "domingo" || diaNome === "sabado";
                    jornadaDoDia = isFDS ? null : userDados.jornada;
                }

                const isActive = jornadaDoDia && (jornadaDoDia.ativo !== false);

                // PRIORIDADE 1: FIM_INTERVALO (Regra dos 20/60 min ou jornada)
                if (item.tipo === "FIM_INTERVALO") {
                    // Tenta achar o início do intervalo desse dia
                    const qIni = query(
                        collection(db, "pontos"),
                        where("userId", "==", item.userId),
                        where("type", "==", "INICIO_INTERVALO")
                    );
                    const snapIni = await getDocs(qIni);
                    let inicioEncontrado = null;
                    snapIni.docs.forEach(docSnap => {
                        const p = docSnap.data();
                        let dStr = "";
                        if (p.dataHoraOriginal) dStr = p.dataHoraOriginal.substring(0, 10);
                        else if (p.criadoEm?.toDate) dStr = format(p.criadoEm.toDate(), "yyyy-MM-dd");
                        else if (p.criadoEm) dStr = new Date(p.criadoEm).toISOString().substring(0, 10);

                        if (dStr === dateSolicitada) inicioEncontrado = p;
                    });

                    if (inicioEncontrado) {
                        let pausaMinutos = 60;
                        const carga = Number(userDados?.cargaHorariaSemanal || 44);

                        if (carga <= 30) {
                            // Para 30h, é SEMPRE 20 min se tiver início
                            pausaMinutos = 20;
                        } else {
                            // Para 40/44h, tenta usar jornada se houver algo específico, senão 60
                            if (isActive) {
                                if (jornadaDoDia.inicioIntervalo && jornadaDoDia.fimIntervalo) {
                                    const [h1, m1] = jornadaDoDia.inicioIntervalo.split(":").map(Number);
                                    const [h2, m2] = jornadaDoDia.fimIntervalo.split(":").map(Number);
                                    pausaMinutos = (h2 * 60 + m2) - (h1 * 60 + m1);
                                } else if (jornadaDoDia.intervaloMin) {
                                    pausaMinutos = Number(jornadaDoDia.intervaloMin);
                                }
                            }
                        }

                        // Cálculo robusto do objeto de data do início
                        let dObjIni;
                        if (inicioEncontrado.dataHoraOriginal) {
                            dObjIni = new Date(inicioEncontrado.dataHoraOriginal);
                        } else if (inicioEncontrado.criadoEm?.toDate) {
                            dObjIni = inicioEncontrado.criadoEm.toDate();
                        } else {
                            dObjIni = new Date(inicioEncontrado.criadoEm);
                        }

                        const displayHoraIni = format(dObjIni, "HH:mm");

                        const dObjFinal = new Date(dObjIni.getTime());
                        dObjFinal.setMinutes(dObjFinal.getMinutes() + pausaMinutos);

                        dataHoraFinal = format(dObjFinal, "yyyy-MM-dd'T'HH:mm");
                        overrideMsg = `Fixado retorno em ${pausaMinutos}min após o início de intervalo (${displayHoraIni}).`;
                    } else if (isActive && jornadaDoDia.fimIntervalo) {
                        dataHoraFinal = `${dateSolicitada}T${jornadaDoDia.fimIntervalo}`;
                        overrideMsg = `Fixado conforme jornada: ${jornadaDoDia.fimIntervalo}`;
                    }
                }
                // PRIORIDADE 2: ENTRADA / SAIDA (Sempre fixa na jornada se ativa)
                else if ((item.tipo === "ENTRADA" || item.tipo === "SAIDA") && isActive) {
                    const campo = item.tipo === "ENTRADA" ? "entrada" : "saida";
                    if (jornadaDoDia[campo]) {
                        dataHoraFinal = `${dateSolicitada}T${jornadaDoDia[campo]}`;
                        overrideMsg = `Fixado conforme jornada: ${jornadaDoDia[campo]}`;
                    }
                }
                // PRIORIDADE 3: INICIO_INTERVALO (Usa jornada se houver, senão mantém solicitado)
                else if (item.tipo === "INICIO_INTERVALO" && isActive && jornadaDoDia.inicioIntervalo) {
                    dataHoraFinal = `${dateSolicitada}T${jornadaDoDia.inicioIntervalo}`;
                    overrideMsg = `Fixado conforme jornada: ${jornadaDoDia.inicioIntervalo}`;
                }
            }

            if (overrideMsg) {
                toast.success(overrideMsg, { duration: 4000 });
            }

            if (item.tipo === "ABONO_FALTA") {
                await addDoc(collection(db, "banco_horas"), {
                    userId: item.userId,
                    companyId: item.companyId,
                    tipo: "CREDITO",
                    minutos: 0,
                    descricao: `Abono de Falta ref. ${format(new Date(item.dataHoraSolicitada), "dd/MM/yyyy")}`,
                    origem: "JUSTIFICATIVA_APROVADA",
                    justificativaId: item.id,
                    dataReferencia: dateSolicitada,
                    motivo: item.motivo || null,
                    criadoEm: serverTimestamp(),
                    criadoPor: usuario.uid,
                });
            } else {
                // Antes de criar o ponto novo, remove qualquer ponto existente do mesmo tipo no mesmo dia
                // para evitar duplicidade e confusão no cálculo/exibição
                const qExistente = query(
                    collection(db, "pontos"),
                    where("userId", "==", item.userId),
                    where("type", "==", item.tipo)
                );
                const snapExistente = await getDocs(qExistente);
                const deletePromessas = [];
                snapExistente.docs.forEach(docSnap => {
                    const p = docSnap.data();
                    const pDate = p.dataHoraOriginal ? p.dataHoraOriginal.substring(0, 10) : "";
                    if (pDate === dateSolicitada) {
                        deletePromessas.push(deleteDoc(doc(db, "pontos", docSnap.id)));
                    }
                });
                if (deletePromessas.length > 0) await Promise.all(deletePromessas);

                const companyIdFinal = item.companyId || userDados?.companyId || perfil?.companyId || usuario?.companyId;

                // Cria o ponto corrigido
                await addDoc(collection(db, "pontos"), {
                    userId: item.userId,
                    userName: item.userName || userDados?.nome || "Usuário",
                    companyId: companyIdFinal,
                    type: item.tipo,
                    geolocation: { lat: 0, lng: 0 },
                    distanciaRelativa: 0,
                    dentroDoRaio: true,
                    deviceInfo: { dispositivo: "Justificativa aprovada (Admin)" },
                    ip: "N/A",
                    criadoEm: serverTimestamp(),
                    origem: "justificativa_aprovada",
                    justificativaId: item.id,
                    dataHoraOriginal: dataHoraFinal.includes('Z') ? dataHoraFinal : `${dataHoraFinal}:00`,
                });

                // Log no banco de horas
                await addDoc(collection(db, "banco_horas"), {
                    userId: item.userId,
                    companyId: companyIdFinal,
                    tipo: "CREDITO",
                    minutos: 0,
                    descricao: `${TIPO_LABEL[item.tipo] || item.tipo} corrigido ref. ${format(new Date(dataHoraFinal), "dd/MM/yyyy HH:mm")}`,
                    origem: "JUSTIFICATIVA_APROVADA",
                    justificativaId: item.id,
                    dataReferencia: dateSolicitada,
                    motivo: item.motivo || null,
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

    const handleVoltarPendente = async () => {
        const item = confirmarVoltarPendente.item;
        if (!item) return;

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
            setConfirmarVoltarPendente({ aberto: false, item: null });
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

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ color: '#8d8d99', fontSize: 13, fontWeight: 600 }}>Funcionário:</div>
                    <SeletorWrapper $wide>
                        <SeletorAcordeao
                            opcoes={[
                                { value: "todos", label: "Todos" },
                                ...funcionarios
                                    .filter(f => f.role !== "admin")
                                    .map(f => ({ value: f.id, label: f.nome }))
                            ]}
                            value={idFuncSelecionado}
                            onChange={(val) => setIdFuncSelecionado(val)}
                        />
                    </SeletorWrapper>
                </div>
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
                                        <BtnAcao
                                            $remover
                                            onClick={() => setConfirmarVoltarPendente({ aberto: true, item })}
                                            title="Voltar para Pendente"
                                        >
                                            <FiEdit size={16} />
                                            <span>Analisar</span>
                                        </BtnAcao>
                                    </AcoesSecundarias>
                                )}
                            </Card>
                        ))}
                </Lista>
            )}


            {/* Modal de visualização de anexo - Premium FullScreen */}
            {anexoVisualizando && (
                <Overlay onClick={() => setAnexoVisualizando(null)}>
                    <AcoesModal>
                        <BtnDownload
                            onClick={(e) => {
                                e.stopPropagation();
                                const link = document.createElement('a');
                                link.href = anexoVisualizando;
                                link.download = `anexo-${Date.now()}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                        >
                            <FiDownload size={20} />
                            <span>Baixar</span>
                        </BtnDownload>

                        <BtnFecharModal onClick={() => setAnexoVisualizando(null)}>
                            <FiX size={32} />
                            <span>Fechar</span>
                        </BtnFecharModal>
                    </AcoesModal>

                    <ModalContent onClick={e => e.stopPropagation()}>
                        <img src={anexoVisualizando} alt="Anexo" />
                    </ModalContent>
                </Overlay>
            )}

            <ModalConfirmacao
                aberto={confirmarVoltarPendente.aberto}
                onFechar={() => setConfirmarVoltarPendente({ aberto: false, item: null })}
                onConfirmar={handleVoltarPendente}
                titulo="Reverter Status"
                mensagem="Deseja voltar esta justificativa para Análise (Pendente)? O ponto será mantido (se foi aprovado) e precisará ser ajustado manualmente se necessário."
                textoConfirmar="Sim, Voltar"
                textoCancelar="Cancelar"
            />
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



const SeletorWrapper = styled.div`
  width: ${({ $small, $wide }) => ($small ? "100px" : $wide ? "250px" : "150px")};
  
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

const AnexoInfo = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(79,172,254,0.05);
    border: 1px dashed rgba(79,172,254,0.3);
    border-radius: 12px;
    padding: 10px 14px;
    margin-bottom: 14px;

    .resumo {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #fff;
        span { color: #8d8d99; }
        strong { color: #4facfe; }
    }
`;

const BtnVerAnexo = styled.button`
    background: #4facfe20;
    border: 1px solid #4facfe40;
    border-radius: 8px;
    color: #4facfe;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover { background: #4facfe30; }
`;

const Overlay = styled.div`
    position: fixed;
    top: 0; left: 0; 
    width: 100vw;
    height: 100vh;
    background: rgba(10, 10, 12, 0.95);
    backdrop-filter: blur(15px);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;

const ModalContent = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 20px;

    img {
        max-width: 95%;
        max-height: 95%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 0 50px rgba(0,0,0,0.8);
        animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
`;

const BtnFecharModal = styled.button`
    background: rgba(235, 77, 75, 0.15);
    border: 1px solid rgba(235, 77, 75, 0.3);
    border-radius: 50px;
    color: #eb4d4b;
    padding: 8px 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 700;
    transition: all 0.2s;
    backdrop-filter: blur(15px);
    
    &:hover { 
        background: #eb4d4b;
        color: #fff;
        transform: translateY(-2px);
    }

    svg { width: 18px; height: 18px; }
    span { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }

    @media (max-width: 600px) {
        padding: 8px 14px;
        span { font-size: 11px; }
    }
`;

const AcoesModal = styled.div`
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 16px;
    z-index: 100000;
    width: max-content;

    @media (max-width: 600px) {
        bottom: 20px;
        gap: 12px;
        width: 90%;
        justify-content: center;
    }
`;

const BtnDownload = styled.button`
    background: rgba(79, 172, 254, 0.15);
    border: 1px solid rgba(79, 172, 254, 0.3);
    border-radius: 50px;
    color: #4facfe;
    padding: 8px 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 700;
    backdrop-filter: blur(15px);
    transition: all 0.2s;
    
    &:hover { 
        background: #4facfe;
        color: #fff;
        transform: translateY(-2px);
    }

    span { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }

    @media (max-width: 600px) {
        padding: 10px 14px;
        
    }
`;

const BtnAcao = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid ${props => props.$perigoso ? 'rgba(235, 77, 75, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
    background: ${props => props.$perigoso ? 'rgba(235, 77, 75, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
    color: ${props => props.$perigoso ? '#eb4d4b' : '#8d8d99'};
    cursor: pointer;
    transition: all 0.2s;
    font-size: 13px;

    &:hover {
        background: ${props => props.$perigoso ? '#eb4d4b' : 'rgba(255, 255, 255, 0.1)'};
        color: #fff;
    }

    svg { flex-shrink: 0; }
`;
