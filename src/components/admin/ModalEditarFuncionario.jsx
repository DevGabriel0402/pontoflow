import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { FiEdit2, FiX } from "react-icons/fi";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function ModalEditarFuncionario({ aberto, funcionario, onFechar }) {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [dataNascimento, setDataNascimento] = useState("");
    const [role, setRole] = useState("colaborador");

    // Jornada
    const [entrada, setEntrada] = useState("08:00");
    const [inicioIntervalo, setInicioIntervalo] = useState("12:00");
    const [fimIntervalo, setFimIntervalo] = useState("13:00");
    const [saida, setSaida] = useState("17:00");

    const [carregando, setCarregando] = useState(false);

    // Preenche os campos com os dados do funcionário
    useEffect(() => {
        if (funcionario) {
            setNome(funcionario.nome || "");
            setEmail(funcionario.email || "");
            setDataNascimento(funcionario.dataNascimento || "");
            setRole(funcionario.role || "colaborador");
            setEntrada(funcionario.jornada?.entrada || "08:00");
            setInicioIntervalo(funcionario.jornada?.inicioIntervalo || "12:00");
            setFimIntervalo(funcionario.jornada?.fimIntervalo || "13:00");
            setSaida(funcionario.jornada?.saida || "17:00");
        }
    }, [funcionario]);

    const handleSalvar = async (e) => {
        e.preventDefault();
        if (!funcionario?.id) return;

        setCarregando(true);
        try {
            // Calcula carga horária
            const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
            const trabManha = toMin(inicioIntervalo) - toMin(entrada);
            const trabTarde = toMin(saida) - toMin(fimIntervalo);
            const cargaHorariaDiaria = trabManha + trabTarde;

            await updateDoc(doc(db, "users", funcionario.id), {
                nome: nome.trim(),
                dataNascimento,
                role,
                jornada: {
                    entrada,
                    inicioIntervalo,
                    fimIntervalo,
                    saida,
                    cargaHorariaDiaria,
                },
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

                    <Separador />

                    <label style={{ fontSize: 13, fontWeight: 700, color: '#e1e1e6' }}>Jornada de Trabalho</label>
                    <GradeHorarios>
                        <Campo>
                            <label>Entrada</label>
                            <input type="time" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
                        </Campo>
                        <Campo>
                            <label>Início Intervalo</label>
                            <input type="time" value={inicioIntervalo} onChange={(e) => setInicioIntervalo(e.target.value)} />
                        </Campo>
                        <Campo>
                            <label>Fim Intervalo</label>
                            <input type="time" value={fimIntervalo} onChange={(e) => setFimIntervalo(e.target.value)} />
                        </Campo>
                        <Campo>
                            <label>Saída</label>
                            <input type="time" value={saida} onChange={(e) => setSaida(e.target.value)} />
                        </Campo>
                    </GradeHorarios>

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

const GradeHorarios = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
`;
