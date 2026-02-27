import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { FiEdit2, FiX } from "react-icons/fi";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import SeletorAcordeao from "../SeletorAcordeao";

export default function ModalEditarFuncionario({ aberto, funcionario, onFechar }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [role, setRole] = useState("colaborador");
  const [funcao, setFuncao] = useState("");
  const [cargaHorariaSemanal, setCargaHorariaSemanal] = useState("44 Horas");

  // Jornada (Segunda a Domingo)
  const [jornadas, setJornadas] = useState({
    segunda: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
    terca: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
    quarta: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
    quinta: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
    sexta: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
    sabado: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "12:00", ativo: false },
    domingo: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "12:00", ativo: false },
  });

  const diasSemanaInfo = [
    { key: "segunda", label: "Segunda" },
    { key: "terca", label: "Terça" },
    { key: "quarta", label: "Quarta" },
    { key: "quinta", label: "Quinta" },
    { key: "sexta", label: "Sexta" },
    { key: "sabado", label: "Sábado" },
    { key: "domingo", label: "Domingo" },
  ];

  const [carregando, setCarregando] = useState(false);

  // Preenche os campos com os dados do funcionário
  useEffect(() => {
    if (funcionario) {
      setNome(funcionario.nome || "");
      setEmail(funcionario.email || "");
      setDataNascimento(funcionario.dataNascimento || "");
      setRole(funcionario.role || "colaborador");
      setFuncao(funcionario.funcao || "");
      setCargaHorariaSemanal(funcionario.cargaHorariaSemanal || "44 Horas");

      if (funcionario.jornadas) {
        setJornadas(funcionario.jornadas);
      } else if (funcionario.jornada) {
        // Modo legado: copia os horários antigos para os dias úteis
        const l = funcionario.jornada;
        const copiaLegada = {
          entrada: l.entrada || "08:00",
          inicioIntervalo: l.inicioIntervalo || "12:00",
          fimIntervalo: l.fimIntervalo || "13:00",
          saida: l.saida || "17:00",
          ativo: true
        };
        setJornadas({
          segunda: { ...copiaLegada },
          terca: { ...copiaLegada },
          quarta: { ...copiaLegada },
          quinta: { ...copiaLegada },
          sexta: { ...copiaLegada },
          sabado: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "12:00", ativo: false },
          domingo: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "12:00", ativo: false },
        });
      }
    }
  }, [funcionario]);

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!funcionario?.id) return;

    setCarregando(true);
    try {
      await updateDoc(doc(db, "users", funcionario.id), {
        nome: nome.trim(),
        dataNascimento,
        role,
        funcao: role === "colaborador" ? funcao.trim() : null,
        jornadas,
        cargaHorariaSemanal,
      });
      toast.success("Funcionário atualizado!");
      onFechar();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Erro ao salvar.");
    } finally {
      setCarregando(false);
    }
  };

  if (!aberto || !funcionario) return null;

  return (
    <Overlay>
      <Modal>
        <Topo>
          <Titulo>
            <FiEdit2 size={18} />
            Editar Funcionário
          </Titulo>
          <Fechar onClick={onFechar}>
            <FiX size={18} />
          </Fechar>
        </Topo>

        <Form onSubmit={handleSalvar}>
          <Campo>
            <label>Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>

          <Campo>
            <label>Email</label>
            <input value={email} disabled style={{ opacity: 0.5 }} title="Email não pode ser alterado" />
          </Campo>

          <Campo>
            <label>Data de Nascimento</label>
            <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
          </Campo>

          <Campo>
            <label>Tipo de Acesso</label>
            <RoleSelector>
              <RoleOption
                $ativo={role === 'colaborador'}
                onClick={() => setRole('colaborador')}
                type="button"
              >
                Colaborador
              </RoleOption>
              <RoleOption
                $ativo={role === 'admin'}
                onClick={() => setRole('admin')}
                type="button"
              >
                Administrador
              </RoleOption>
            </RoleSelector>
          </Campo>

          {role === 'colaborador' && (
            <Campo>
              <label>Função / Cargo</label>
              <input
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
                placeholder="Ex: Professor, Secretário..."
              />
            </Campo>
          )}

          <Campo>
            <label>Carga Horária Semanal</label>
            <SeletorWrapper>
              <SeletorAcordeao
                opcoes={[
                  { value: "44 Horas", label: "44 Horas" },
                  { value: "40 Horas", label: "40 Horas" },
                  { value: "30 Horas", label: "30 Horas" },
                  { value: "Livre", label: "Livre" }
                ]}
                value={cargaHorariaSemanal}
                onChange={setCargaHorariaSemanal}
              />
            </SeletorWrapper>
          </Campo>

          <Separador />

          <label style={{ fontSize: 13, fontWeight: 700, color: '#e1e1e6' }}>Jornadas Diárias (Opcional)</label>
          <JornadaArea>
            {diasSemanaInfo.map((dia) => {
              const conf = jornadas[dia.key];
              return (
                <DiaRow key={dia.key} $ativo={conf.ativo}>
                  <DiaHeader>
                    <label>
                      <input
                        type="checkbox"
                        checked={conf.ativo}
                        onChange={(e) => setJornadas(pd => ({
                          ...pd,
                          [dia.key]: { ...pd[dia.key], ativo: e.target.checked }
                        }))}
                      />
                      {dia.label}
                    </label>
                  </DiaHeader>

                  {conf.ativo && (
                    <HorariosInputs>
                      <InputSlim
                        type="time"
                        value={conf.entrada}
                        title="Entrada"
                        onChange={e => setJornadas(pd => ({ ...pd, [dia.key]: { ...conf, entrada: e.target.value } }))}
                      />
                      <InputSlim
                        type="time"
                        value={conf.inicioIntervalo}
                        title="Início Intervalo"
                        onChange={e => setJornadas(pd => ({ ...pd, [dia.key]: { ...conf, inicioIntervalo: e.target.value } }))}
                      />
                      <InputSlim
                        type="time"
                        value={conf.fimIntervalo}
                        title="Fim Intervalo"
                        onChange={e => setJornadas(pd => ({ ...pd, [dia.key]: { ...conf, fimIntervalo: e.target.value } }))}
                      />
                      <InputSlim
                        type="time"
                        value={conf.saida}
                        title="Saída"
                        onChange={e => setJornadas(pd => ({ ...pd, [dia.key]: { ...conf, saida: e.target.value } }))}
                      />
                    </HorariosInputs>
                  )}
                </DiaRow>
              );
            })}
          </JornadaArea>

          <Rodape>
            <BtnGhost type="button" onClick={onFechar}>Cancelar</BtnGhost>
            <BtnPrimary disabled={carregando || !nome.trim()}>
              {carregando ? "Salvando..." : "Salvar"}
            </BtnPrimary>
          </Rodape>
        </Form>
      </Modal>
    </Overlay>
  );
}

/* ─── STYLED COMPONENTS ─── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 999;
`;

const Modal = styled.div`
  width: 100%;
  max-width: 520px;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: ${({ theme }) => theme.raio.xl};
  box-shadow: ${({ theme }) => theme.sombra.suave};
  overflow: hidden;
  max-height: 90vh;
  overflow-y: auto;
`;

const Topo = styled.div`
  padding: 14px 14px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Titulo = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 900;
`;

const Fechar = styled.button`
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie};
  color: ${({ theme }) => theme.cores.texto2};
  height: 34px;
  width: 34px;
  border-radius: 10px;
`;

const Form = styled.form`
  padding: 0 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 75vh;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.cores.borda};
    border-radius: 4px;
  }
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 12px;
    color: ${({ theme }) => theme.cores.texto2};
  }

  input {
    height: 44px;
    padding: 0 12px;
    border-radius: ${({ theme }) => theme.raio.lg};
    border: 1px solid ${({ theme }) => theme.cores.borda};
    background: ${({ theme }) => theme.cores.superficie};
    color: ${({ theme }) => theme.cores.texto};
    outline: none;

    &::-webkit-calendar-picker-indicator {
      filter: invert(1);
    }
  }
`;

const Rodape = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;

  @media (max-width: 480px) {
    flex-direction: column-reverse;
    button { width: 100%; }
  }
`;

const BtnGhost = styled.button`
  height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: transparent;
  color: ${({ theme }) => theme.cores.texto2};
  font-weight: 900;
`;

const BtnPrimary = styled.button`
  height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  border: 0;
  background: ${({ theme }) => theme.cores.azul};
  color: #fff;
  font-weight: 900;
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`;

const RoleSelector = styled.div`
  display: flex;
  background: ${({ theme }) => theme.cores.superficie};
  padding: 4px;
  border-radius: ${({ theme }) => theme.raio.lg};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  gap: 4px;
`;

const SeletorWrapper = styled.div`
  width: 100%;
`;

const RoleOption = styled.button`
  flex: 1;
  height: 36px;
  border: 0;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $ativo, theme }) => $ativo ? theme.cores.azul : "transparent"};
  color: ${({ $ativo, theme }) => $ativo ? "#fff" : theme.cores.texto2};

  &:hover {
    background: ${({ $ativo, theme }) => $ativo ? theme.cores.azul : theme.cores.superficie2};
  }
`;

const Separador = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.cores.borda};
  margin: 4px 0;
`;

const JornadaArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DiaRow = styled.div`
  background: ${({ theme, $ativo }) => $ativo ? theme.cores.superficie : "transparent"};
  border: 1px solid ${({ theme, $ativo }) => $ativo ? theme.cores.borda : "transparent"};
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  opacity: ${({ $ativo }) => $ativo ? 1 : 0.6};
  transition: all 0.2s;
`;

const DiaHeader = styled.div`
  font-weight: 700;
  font-size: 13px;
  color: ${({ theme }) => theme.cores.texto};
  
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  input[type="checkbox"] {
    accent-color: ${({ theme }) => theme.cores.azul};
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
`;

const HorariosInputs = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const InputSlim = styled.input`
  height: 36px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: rgba(255,255,255,0.03);
  color: ${({ theme }) => theme.cores.texto};
  font-size: 13px;
  outline: none;

  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
  }
  &:focus {
    border-color: ${({ theme }) => theme.cores.azul};
  }
`;
