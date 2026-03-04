import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { FiX, FiClock, FiSave, FiAlertCircle } from "react-icons/fi";
import { doc, updateDoc, setDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

export default function ModalEditarPonto({ aberto, onFechar, registro, userId, companyId }) {
    const [horarios, setHorarios] = useState({
        entrada: "",
        iniInt: "",
        fimInt: "",
        saida: ""
    });
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (registro && aberto) {
            setHorarios({
                entrada: registro.check.entrada ? format(registro.check.entrada, "HH:mm") : "",
                iniInt: registro.check.iniInt ? format(registro.check.iniInt, "HH:mm") : "",
                fimInt: registro.check.fimInt ? format(registro.check.fimInt, "HH:mm") : "",
                saida: registro.check.saida ? format(registro.check.saida, "HH:mm") : ""
            });
        }
    }, [registro, aberto]);

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

            const { deleteDoc } = await import("firebase/firestore");

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
                    <Grid>
                        <Campo>
                            <label>Entrada</label>
                            <input
                                type="time"
                                value={horarios.entrada}
                                onChange={e => setHorarios({ ...horarios, entrada: e.target.value })}
                            />
                        </Campo>
                        <Campo>
                            <label>Saída</label>
                            <input
                                type="time"
                                value={horarios.saida}
                                onChange={e => setHorarios({ ...horarios, saida: e.target.value })}
                            />
                        </Campo>
                        <Campo>
                            <label>Início Intervalo</label>
                            <input
                                type="time"
                                value={horarios.iniInt}
                                onChange={e => setHorarios({ ...horarios, iniInt: e.target.value })}
                            />
                        </Campo>
                        <Campo>
                            <label>Fim Intervalo</label>
                            <input
                                type="time"
                                value={horarios.fimInt}
                                onChange={e => setHorarios({ ...horarios, fimInt: e.target.value })}
                            />
                        </Campo>
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
