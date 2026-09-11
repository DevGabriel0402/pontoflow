import React, { useState } from "react";
import styled from "styled-components";
import { FiX, FiCalendar, FiClock, FiCheckCircle, FiUser, FiAlertCircle } from "react-icons/fi";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import { toast } from "react-hot-toast";
import { format, eachDayOfInterval, parseISO, getDay } from "date-fns";

export default function ModalAjusteIntervalo({ aberto, onFechar, colaboradores = [], companyId, onSucesso }) {
  const [userId, setUserId] = useState("TODOS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [entrada, setEntrada] = useState("08:00");
  const [saida, setSaida] = useState("17:00");
  const [diasUteisApenas, setDiasUteisApenas] = useState(true);
  const [modo, setModo] = useState("SOBREESCREVER"); // SOBREESCREVER ou SOMENTE_FALTANTES
  const [salvando, setSalvando] = useState(false);

  if (!aberto) return null;

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!dataInicio || !dataFim) {
      return toast.error("Informe a data de início e a data de fim do intervalo.");
    }
    if (dataInicio > dataFim) {
      return toast.error("A data de início não pode ser posterior à data de fim.");
    }
    if (!entrada && !saida) {
      return toast.error("Preencha pelo menos o horário de entrada ou de saída.");
    }
    if (!companyId) {
      return toast.error("Empresa não identificada.");
    }

    setSalvando(true);
    const idToast = toast.loading("Processando ajuste no intervalo...");

    try {
      // 1. Obter os colaboradores a processar
      const alvoColabs = userId === "TODOS" 
        ? colaboradores 
        : colaboradores.filter((c) => c.id === userId);

      if (alvoColabs.length === 0) {
        toast.error("Nenhum colaborador selecionado.", { id: idToast });
        setSalvando(false);
        return;
      }

      // 2. Gerar a lista de dias do intervalo
      const inicio = parseISO(dataInicio);
      const fim = parseISO(dataFim);
      const diasIntervalo = eachDayOfInterval({ start: inicio, end: fim });

      let totalAjustados = 0;
      let totalDiasProcessados = 0;

      for (const diaDate of diasIntervalo) {
        const dayOfWeek = getDay(diaDate); // 0 = Domingo, 6 = Sábado
        if (diasUteisApenas && (dayOfWeek === 0 || dayOfWeek === 6)) {
          continue; // Pula finais de semana se configurado
        }

        totalDiasProcessados++;
        const dataKey = format(diaDate, "yyyy-MM-dd");

        for (const colab of alvoColabs) {
          const uId = colab.id;
          const uNome = colab.nome || colab.email || "Usuário";

          // Buscar pontos existentes do usuário nesta data
          const pontosRef = collection(db, "pontos");
          const snap = await getDocs(query(
            pontosRef,
            where("userId", "==", uId),
            where("dataKey", "==", dataKey)
          ));

          const pontosDoDia = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const temEntrada = pontosDoDia.some((p) => p.type === "ENTRADA");
          const temSaida = pontosDoDia.some((p) => p.type === "SAIDA");

          const acoes = [];

          // Processar Entrada
          if (entrada) {
            const dataHoraIso = `${dataKey}T${entrada}:00`;
            const entradasExistentes = pontosDoDia.filter((p) => p.type === "ENTRADA");

            if (entradasExistentes.length > 0) {
              if (modo === "SOBREESCREVER") {
                const principal = entradasExistentes[0];
                acoes.push(updateDoc(doc(db, "pontos", principal.id), {
                  dataHoraOriginal: dataHoraIso,
                  editadoEm: serverTimestamp(),
                  editadoPor: "master_intervalo",
                }));
                // Deletar duplicatas se existirem
                for (let i = 1; i < entradasExistentes.length; i++) {
                  acoes.push(deleteDoc(doc(db, "pontos", entradasExistentes[i].id)));
                }
              }
            } else {
              acoes.push(addDoc(collection(db, "pontos"), {
                userId: uId,
                companyId,
                dataKey,
                type: "ENTRADA",
                dataHoraOriginal: dataHoraIso,
                criadoEm: serverTimestamp(),
                origem: "AJUSTE_LOTE_INTERVALO",
                dentroDoRaio: true,
                userName: uNome,
              }));
            }
          }

          // Processar Saída
          if (saida) {
            const dataHoraIso = `${dataKey}T${saida}:00`;
            const saidasExistentes = pontosDoDia.filter((p) => p.type === "SAIDA");

            if (saidasExistentes.length > 0) {
              if (modo === "SOBREESCREVER") {
                const principal = saidasExistentes[0];
                acoes.push(updateDoc(doc(db, "pontos", principal.id), {
                  dataHoraOriginal: dataHoraIso,
                  editadoEm: serverTimestamp(),
                  editadoPor: "master_intervalo",
                }));
                for (let i = 1; i < saidasExistentes.length; i++) {
                  acoes.push(deleteDoc(doc(db, "pontos", saidasExistentes[i].id)));
                }
              }
            } else {
              acoes.push(addDoc(collection(db, "pontos"), {
                userId: uId,
                companyId,
                dataKey,
                type: "SAIDA",
                dataHoraOriginal: dataHoraIso,
                criadoEm: serverTimestamp(),
                origem: "AJUSTE_LOTE_INTERVALO",
                dentroDoRaio: true,
                userName: uNome,
              }));
            }
          }

          if (acoes.length > 0) {
            await Promise.all(acoes);
            totalAjustados++;
          }
        }
      }

      toast.success(
        `Ajuste de intervalo concluído! ${totalDiasProcessados} dia(s) processado(s) para ${alvoColabs.length} colaborador(es).`,
        { id: idToast, duration: 5000 }
      );

      if (onSucesso) onSucesso();
      onFechar();
    } catch (err) {
      console.error("Erro ao aplicar ajuste no intervalo:", err);
      toast.error("Erro ao aplicar ajustes: " + (err.message || "Erro desconhecido"), { id: idToast });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Overlay onClick={onFechar}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <Header>
          <TituloBloco>
            <FiCalendar size={20} />
            <div>
              <h3>Ajustar Ponto por Intervalo</h3>
              <span>Somente Master • Ajuste em lote de batidas</span>
            </div>
          </TituloBloco>
          <BtnFechar onClick={onFechar}>
            <FiX size={20} />
          </BtnFechar>
        </Header>

        <Form onSubmit={handleSalvar}>
          <Campo>
            <Label>Colaborador</Label>
            <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="TODOS">👥 Todos os Colaboradores ({colaboradores.length})</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  👤 {c.nome || c.email}
                </option>
              ))}
            </Select>
          </Campo>

          <LinhaDupla>
            <Campo>
              <Label>Data de Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
            </Campo>

            <Campo>
              <Label>Data de Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                required
              />
            </Campo>
          </LinhaDupla>

          <LinhaDupla>
            <Campo>
              <Label>Horário de Entrada</Label>
              <Input
                type="time"
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
              />
            </Campo>

            <Campo>
              <Label>Horário de Saída</Label>
              <Input
                type="time"
                value={saida}
                onChange={(e) => setSaida(e.target.value)}
              />
            </Campo>
          </LinhaDupla>

          <OpcoesBox>
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={diasUteisApenas}
                onChange={(e) => setDiasUteisApenas(e.target.checked)}
              />
              <span>Apenas dias úteis (Segunda a Sexta)</span>
            </CheckboxLabel>

            <RadioGroup>
              <RadioLabel>
                <input
                  type="radio"
                  name="modo"
                  value="SOBREESCREVER"
                  checked={modo === "SOBREESCREVER"}
                  onChange={() => setModo("SOBREESCREVER")}
                />
                <span>Sobreescrever / Corrigir batidas existentes</span>
              </RadioLabel>

              <RadioLabel>
                <input
                  type="radio"
                  name="modo"
                  value="SOMENTE_FALTANTES"
                  checked={modo === "SOMENTE_FALTANTES"}
                  onChange={() => setModo("SOMENTE_FALTANTES")}
                />
                <span>Preencher apenas batidas faltantes</span>
              </RadioLabel>
            </RadioGroup>
          </OpcoesBox>

          <AvisoBox>
            <FiAlertCircle size={16} />
            <span>
              Esta ação adicionará ou corrigirá os horários de entrada e saída no intervalo selecionado para os colaboradores escolhidos.
            </span>
          </AvisoBox>

          <Rodape>
            <BtnCancelar type="button" onClick={onFechar} disabled={salvando}>
              Cancelar
            </BtnCancelar>

            <BtnSalvar type="submit" disabled={salvando}>
              <FiCheckCircle size={16} />
              {salvando ? "Processando..." : "Aplicar Ajustes no Intervalo"}
            </BtnSalvar>
          </Rodape>
        </Form>
      </ModalContainer>
    </Overlay>
  );
}

/* ── STYLED COMPONENTS ── */

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 16px;
`;

const ModalContainer = styled.div`
  background: ${({ theme }) => theme.cores.superficie2 || "#181b23"};
  border: 1px solid ${({ theme }) => theme.cores.borda || "#2b3040"};
  border-radius: 20px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.cores.borda || "#2b3040"};
`;

const TituloBloco = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: ${({ theme }) => theme.cores.azul || "#3b82f6"};
  }

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
  }

  span {
    font-size: 12px;
    color: #8d8d99;
    display: block;
    margin-top: 2px;
  }
`;

const BtnFechar = styled.button`
  background: transparent;
  border: 0;
  color: #8d8d99;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  transition: all 0.15s;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }
`;

const Form = styled.form`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #c4c4cc;
`;

const Input = styled.input`
  background: ${({ theme }) => theme.cores.fundo || "#10131a"};
  border: 1px solid ${({ theme }) => theme.cores.borda || "#2b3040"};
  border-radius: 10px;
  padding: 10px 14px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${({ theme }) => theme.cores.azul || "#3b82f6"};
  }
`;

const Select = styled.select`
  background: ${({ theme }) => theme.cores.fundo || "#10131a"};
  border: 1px solid ${({ theme }) => theme.cores.borda || "#2b3040"};
  border-radius: 10px;
  padding: 10px 14px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${({ theme }) => theme.cores.azul || "#3b82f6"};
  }

  option {
    background: #181b23;
    color: #fff;
  }
`;

const LinhaDupla = styled.div`
  display: flex;
  gap: 12px;

  @media (max-width: 500px) {
    flex-direction: column;
  }
`;

const OpcoesBox = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${({ theme }) => theme.cores.borda || "#2b3040"};
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #e1e1e6;
  cursor: pointer;

  input {
    accent-color: ${({ theme }) => theme.cores.azul || "#3b82f6"};
    width: 16px;
    height: 16px;
  }
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #c4c4cc;
  cursor: pointer;

  input {
    accent-color: ${({ theme }) => theme.cores.azul || "#3b82f6"};
  }
`;

const AvisoBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 10px;
  padding: 10px 14px;
  color: #93c5fd;
  font-size: 12px;
  line-height: 1.4;

  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
`;

const Rodape = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
`;

const BtnCancelar = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.cores.borda || "#2b3040"};
  color: #c4c4cc;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BtnSalvar = styled.button`
  background: ${({ theme }) => theme.cores.azul || "#3b82f6"};
  border: 0;
  color: #fff;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;
