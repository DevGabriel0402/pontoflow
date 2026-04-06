import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { FiX, FiClock, FiSave, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { doc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { useConfig } from "../../contexts/ConfigContexto";
import SeletorAcordeao from "../SeletorAcordeao";
import { MOTIVOS_JUSTIFICATIVA } from "../colaborador/ModalJustificativa";

export default function ModalEditarPonto({ aberto, onFechar, registro, userId, companyId }) {
    const { config } = useConfig();
    const temPonto = (id) => {
        if (!config?.regras?.pontosAtivos) return true;
        return config.regras.pontosAtivos.includes(id);
    };
    const [horarios, setHorarios] = useState({
        entrada: "",
        iniInt: "",
        fimInt: "",
        saida: ""
    });
    const [salvando, setSalvando] = useState(false);
    const [abonado, setAbonado] = useState(false);
    const [abonoDocId, setAbonoDocId] = useState(null);
    const [motivoAbono, setMotivoAbono] = useState("ESQUECI_PONTO");

    useEffect(() => {
        if (registro && aberto) {
            setHorarios({
                entrada: registro.ponto_indices?.entrada?.time ? format(registro.ponto_indices.entrada.time, "HH:mm") : "",
                iniInt: registro.ponto_indices?.iniInt?.time ? format(registro.ponto_indices.iniInt.time, "HH:mm") : "",
                fimInt: registro.ponto_indices?.fimInt?.time ? format(registro.ponto_indices.fimInt.time, "HH:mm") : "",
                saida: registro.ponto_indices?.saida?.time ? format(registro.ponto_indices.saida.time, "HH:mm") : ""
            });

            // Verificar se já existe abono para este dia
            const checkAbono = async () => {
                try {
                    const snap = await getDocs(query(
                        collection(db, "banco_horas"),
                        where("userId", "==", userId),
                        where("origem", "==", "ABONO_MANUAL"),
                        where("dataReferencia", "==", registro.dataKey)
                    ));
                    if (!snap.empty) {
                        setAbonado(true);
                        setAbonoDocId(snap.docs[0].id);
                        setMotivoAbono(snap.docs[0].data().motivo || "OUTROS");
                    } else {
                        setAbonado(false);
                        setAbonoDocId(null);
                        setMotivoAbono("ESQUECI_PONTO");
                    }
                } catch (e) {
                    console.error("Erro ao verificar abono:", e);
                }
            };
            checkAbono();
        }
    }, [registro, aberto, userId]);

    if (!aberto || !registro) return null;

    const handleSalvar = async (e) => {
        e.preventDefault();
        setSalvando(true);

        try {
            const dataStr = registro.dataKey; // yyyy-MM-dd

            // Tipos de ponto que queremos gerenciar
            const tiposMapeados = {
                entrada: "ENTRADA",
                iniInt: "INICIO_INTERVALO",
                fimInt: "FIM_INTERVALO",
                saida: "SAIDA"
            };

            const promessas = [];

            for (const [key, valor] of Object.entries(horarios)) {
                const tipoPonto = tiposMapeados[key];
                const pontosMesmoTipo = registro.pontos?.filter(p => p.type === tipoPonto) || [];

                if (valor) {
                    const [h, m] = valor.split(":").map(Number);
                    const novaData = new Date(`${dataStr}T${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`);
                    const dataISO = novaData.toISOString();

                    if (pontosMesmoTipo.length > 0) {
                        // Atualiza o primeiro e remove os outros se houver duplicatas
                        const principal = pontosMesmoTipo[0];
                        const docRef = doc(db, "pontos", principal.id);
                        promessas.push(updateDoc(docRef, {
                            dataHoraOriginal: dataISO,
                            editadoEm: serverTimestamp(),
                            editadoPor: "admin"
                        }));

                        // Remove duplicatas se existirem
                        for (let i = 1; i < pontosMesmoTipo.length; i++) {
                            promessas.push(deleteDoc(doc(db, "pontos", pontosMesmoTipo[i].id)));
                        }
                    } else {
                        // Cria novo ponto se não existia
                        promessas.push(addDoc(collection(db, "pontos"), {
                            userId,
                            companyId,
                            type: tipoPonto,
                            dataHoraOriginal: dataISO,
                            criadoEm: serverTimestamp(),
                            origem: "MANUAL_ADMIN",
                            dentroDoRaio: true,
                            userName: registro.userName || "Usuário"
                        }));
                    }
                }
            }

            // --- Lógica do Abono ---
            const motivoLabel = MOTIVOS_JUSTIFICATIVA.find(m => m.value === motivoAbono)?.label || "Abono";
            if (abonado) {
                if (abonoDocId) {
                    promessas.push(updateDoc(doc(db, "banco_horas", abonoDocId), {
                        motivo: motivoAbono,
                        descricao: `Abono de Falta - ${motivoLabel} - ${format(registro.data, "dd/MM/yyyy")}`,
                    }));
                } else {
                    promessas.push(addDoc(collection(db, "banco_horas"), {
                        userId,
                        companyId,
                        tipo: "CREDITO",
                        minutos: 0,
                        descricao: `Abono de Falta - ${motivoLabel} - ${format(registro.data, "dd/MM/yyyy")}`,
                        origem: "ABONO_MANUAL",
                        motivo: motivoAbono,
                        dataReferencia: registro.dataKey,
                        criadoEm: serverTimestamp()
                    }));
                }
            } else {
                if (abonoDocId) {
                    promessas.push(deleteDoc(doc(db, "banco_horas", abonoDocId)));
                }
            }

            await Promise.all(promessas);
            toast.success("Horários atualizados com sucesso!");
            onFechar();
        } catch (err) {
            console.error("Erro ao salvar pontos:", err);
            toast.error("Erro ao atualizar horários.");
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Overlay>
            <ModalBox>
                <Header>
                    <Titulo>
                        <FiClock /> Editar Batidas - {format(registro.data, "dd/MM/yyyy")}
                    </Titulo>
                    <FecharBtn onClick={onFechar}><FiX /></FecharBtn>
                </Header>

                <Alerta>
                    <FiAlertCircle size={20} />
                    <p>Alterar estes horários afetará diretamente o cálculo do Banco de Horas.</p>
                </Alerta>

                <Form onSubmit={handleSalvar}>
                    <AbonoToggle 
                        type="button" 
                        $ativo={abonado} 
                        onClick={() => setAbonado(!abonado)}
                    >
                        {abonado ? <FiCheckCircle size={20} /> : <div style={{width: 20, height: 20, border: '1.5px solid #8d8d99', borderRadius: '50%'}} />}
                        <div>
                            <strong>Abonar todo o horário</strong>
                            <span>Marque para justificar a falta deste dia</span>
                        </div>
                    </AbonoToggle>

                    {abonado && (
                        <div style={{ marginBottom: 24, marginTop: -8 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#8d8d99', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Motivo do Abono</label>
                            <SeletorAcordeao 
                                opcoes={MOTIVOS_JUSTIFICATIVA}
                                value={motivoAbono}
                                onChange={setMotivoAbono}
                            />
                        </div>
                    )}

                    <Grid>
                        {temPonto('entrada') && (
                            <Campo>
                                <label>Entrada</label>
                                <input
                                    type="time"
                                    value={horarios.entrada}
                                    onChange={e => setHorarios({ ...horarios, entrada: e.target.value })}
                                />
                            </Campo>
                        )}
                        {temPonto('saida') && (
                            <Campo>
                                <label>Saída</label>
                                <input
                                    type="time"
                                    value={horarios.saida}
                                    onChange={e => setHorarios({ ...horarios, saida: e.target.value })}
                                />
                            </Campo>
                        )}
                        {temPonto('intervalo_saida') && (
                            <Campo>
                                <label>Início Intervalo</label>
                                <input
                                    type="time"
                                    value={horarios.iniInt}
                                    onChange={e => setHorarios({ ...horarios, iniInt: e.target.value })}
                                />
                            </Campo>
                        )}
                        {temPonto('intervalo_entrada') && (
                            <Campo>
                                <label>Fim Intervalo</label>
                                <input
                                    type="time"
                                    value={horarios.fimInt}
                                    onChange={e => setHorarios({ ...horarios, fimInt: e.target.value })}
                                />
                            </Campo>
                        )}
                    </Grid>

                    <Rodape>
                        <BtnGhost type="button" onClick={onFechar}>Cancelar</BtnGhost>
                        <BtnPrimary type="submit" disabled={salvando}>
                            <FiSave /> {salvando ? "Salvando..." : "Salvar Alterações"}
                        </BtnPrimary>
                    </Rodape>
                </Form>
            </ModalBox>
        </Overlay>
    );
}

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
  backdrop-filter: blur(4px);
`;

const ModalBox = styled.div`
  background: #19191b;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 450px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
`;

const Header = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Titulo = styled.h3`
  margin: 0;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  svg { color: #2f81f7; }
`;

const FecharBtn = styled.button`
  background: transparent;
  border: 0;
  color: #8d8d99;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  &:hover { color: #fff; }
`;

const Alerta = styled.div`
  margin: 20px 24px 0;
  padding: 12px 16px;
  background: rgba(241, 196, 15, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(241, 196, 15, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
  color: #f1c40f;
  p { font-size: 13px; margin: 0; line-height: 1.4; font-weight: 500; }
  svg { flex-shrink: 0; }
`;

const Form = styled.form`
  padding: 24px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  label { font-size: 12px; font-weight: 700; color: #8d8d99; text-transform: uppercase; letter-spacing: 0.5px; }
  input {
    background: #121214;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    height: 48px;
    padding: 0 16px;
    color: #fff;
    font-size: 16px;
    outline: none;
    transition: all 0.2s;
    &:focus { border-color: #2f81f7; background: #1a1a1e; }
    &::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
  }
`;

const Rodape = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
`;

const BtnPrimary = styled.button`
  background: #2f81f7;
  color: #fff;
  border: 0;
  padding: 0 20px;
  height: 44px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  &:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const BtnGhost = styled.button`
  background: transparent;
  color: #8d8d99;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 0 20px;
  height: 44px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255,255,255,0.05); color: #fff; }
`;

const AbonoToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 20px;
  border-radius: 12px;
  border: 1px solid ${({ $ativo }) => $ativo ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.1)'};
  background: ${({ $ativo }) => $ativo ? 'rgba(46,204,113,0.08)' : 'rgba(255,255,255,0.02)'};
  color: ${({ $ativo }) => $ativo ? '#2ecc71' : '#8d8d99'};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  svg { flex-shrink: 0; }

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  strong {
    font-size: 14px;
    font-weight: 700;
    color: ${({ $ativo }) => $ativo ? '#2ecc71' : '#e1e1e6'};
  }

  span {
    font-size: 12px;
    color: ${({ $ativo }) => $ativo ? 'rgba(46,204,113,0.7)' : '#8d8d99'};
  }

  &:hover {
    border-color: ${({ $ativo }) => $ativo ? 'rgba(46,204,113,0.5)' : 'rgba(255,255,255,0.2)'};
    background: ${({ $ativo }) => $ativo ? 'rgba(46,204,113,0.12)' : 'rgba(255,255,255,0.05)'};
  }
`;
