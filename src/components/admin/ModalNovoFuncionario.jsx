import React, { useState } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { FiUserPlus, FiX, FiCopy } from "react-icons/fi";
import { criarFuncionarioFn } from "../../services/funcoes";
import SeletorAcordeao from "../SeletorAcordeao";
import { useConfig } from "../../contexts/ConfigContexto";
import { maskMatricula, unmaskMatricula } from "../../utils/mascaras";
export default function ModalNovoFuncionario({ aberto, onFechar }) {
  const { config } = useConfig();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [role, setRole] = useState("colaborador");
  const [funcao, setFuncao] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Inicializa com a carga da empresa se disponível
  const cargaPadrao = config?.regras?.cargaHorariaSemanal ? `${config.regras.cargaHorariaSemanal} Horas` : "44 Horas";
  const [cargaHorariaSemanal, setCargaHorariaSemanal] = useState(cargaPadrao);
  const [matricula, setMatricula] = useState("");

  const temPonto = (id) => {
    if (!config?.regras?.pontosAtivos) return true;
    return config.regras.pontosAtivos.includes(id);
  };

  const FUNCOES_ADMIN = [
    "Presidente",
    "Vice Presidente",
    "Coordenador(a)",
    "Gerente",
    "Diretor(a)",
    "Secretário(a)",
    "Consultor(a)",
    "Desenvolvedor(a)",
    "Outro"
  ];

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

  const [resultado, setResultado] = useState(null); // {email, senhaTemporaria, uid}

  const resetar = () => {
    setNome("");
    setEmail("");
    setDataNascimento("");
    setRole("colaborador");
    setFuncao("");
    setCargaHorariaSemanal(cargaPadrao);
    setJornadas({
      segunda: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
      terca: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
      quarta: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
      quinta: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
      sexta: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
      sabado: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "12:00", ativo: false },
      domingo: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "12:00", ativo: false },
    });
    setResultado(null);
    setMatricula("");
  };

  const fechar = () => {
    resetar();
    onFechar();
  };

  const copiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleCriar = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const data = await criarFuncionarioFn({
        nome: nome.trim(),
        email: email.trim(),
        dataNascimento,
        role,
        funcao: funcao.trim() || null,
        jornadas,
        cargaHorariaSemanal,
        matricula: unmaskMatricula(matricula, config?.regras?.digitosMatricula)
      });
      setResultado(data);
      toast.success("Funcionário criado com sucesso!");
    } catch (err) {
      console.log(err);
      toast.error(err?.message || "Falha ao criar funcionário.");
    } finally {
      setCarregando(false);
    }
  };

  if (!aberto) return null;

  return (
    <Overlay>
      <Modal>
        <Topo>
          <Titulo>
            <FiUserPlus size={18} />
            Novo Funcionário
          </Titulo>
          <Fechar onClick={fechar}>
            <FiX size={18} />
          </Fechar>
        </Topo>

        {!resultado ? (
          <Form onSubmit={handleCriar}>
            <Campo>
              <label>Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva" />
            </Campo>

            <Campo>
              <label>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ex: joao@empresa.com" />
            </Campo>

            <Campo>
              <label>Data de Nascimento</label>
              <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
            </Campo>

            <Campo>
              <label>Matrícula / ID do Funcionário {config?.regras?.loginPorMatricula && <span style={{ color: '#eb4d4b' }}>*</span>}</label>
              <input
                value={matricula}
                onChange={(e) => setMatricula(maskMatricula(e.target.value, config?.regras?.digitosMatricula))}
                placeholder={`${"0".repeat((config?.regras?.digitosMatricula || 8) - 1)}-0`}
                required={config?.regras?.loginPorMatricula}
                title={config?.regras?.loginPorMatricula ? "Obrigatório para login por matrícula" : "Usado para o login simplificado"}
              />
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
                  onClick={() => { setRole('admin'); setCargaHorariaSemanal('Livre'); }}
                  type="button"
                >
                  Administrador
                </RoleOption>
              </RoleSelector>
            </Campo>

            {role === 'colaborador' ? (
              <Campo>
                <label>Função / Cargo</label>
                <input
                  value={funcao}
                  onChange={(e) => setFuncao(e.target.value)}
                  placeholder="Ex: Professor, Secretário..."
                />
              </Campo>
            ) : (
              <Campo>
                <label>Função do Administrador</label>
                <Select
                  value={funcao}
                  onChange={(e) => setFuncao(e.target.value)}
                >
                  <option value="">Selecione a função...</option>
                  {FUNCOES_ADMIN.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </Select>
              </Campo>
            )}

            <>
              <Separador />

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
                          {temPonto('entrada') && (
                            <InputSlim
                              type="time"
                              value={conf.entrada}
                              title="Entrada"
                              onChange={e => setJornadas(pd => ({ ...pd, [dia.key]: { ...conf, entrada: e.target.value } }))}
                            />
                          )}
                          {temPonto('intervalo_saida') && (
                            <InputSlim
                              type="time"
                              value={conf.inicioIntervalo}
                              title="Início Intervalo"
                              onChange={e => setJornadas(pd => ({ ...pd, [dia.key]: { ...conf, inicioIntervalo: e.target.value } }))}
                            />
                          )}
                          {temPonto('intervalo_entrada') && (
                            <InputSlim
                              type="time"
                              value={conf.fimIntervalo}
                              title="Fim Intervalo"
                              onChange={e => setJornadas(pd => ({ ...pd, [dia.key]: { ...conf, fimIntervalo: e.target.value } }))}
                            />
                          )}
                          {temPonto('saida') && (
                            <InputSlim
                              type="time"
                              value={conf.saida}
                              title="Saída"
                              onChange={e => setJornadas(pd => ({ ...pd, [dia.key]: { ...conf, saida: e.target.value } }))}
                            />
                          )}
                        </HorariosInputs>
                      )}
                    </DiaRow>
                  );
                })}
              </JornadaArea>
            </>

            <Rodape>
              <BtnGhost type="button" onClick={fechar}>Cancelar</BtnGhost>
              <BtnPrimary disabled={carregando || !nome.trim() || !email.trim() || !dataNascimento}>
                {carregando ? "Criando..." : "Criar"}
              </BtnPrimary>
            </Rodape>
          </Form>
        ) : (
          <Resultado>
            <h4>Acesso criado</h4>

            <Linha>
              <span>Email</span>
              <Codigo>
                {resultado.email}
                <IconBtn onClick={() => copiar(resultado.email)} title="Copiar email">
                  <FiCopy size={16} />
                </IconBtn>
              </Codigo>
            </Linha>

            <Linha>
              <span>Senha temporária</span>
              <Codigo>
                {resultado.senhaTemporaria}
                <IconBtn onClick={() => copiar(resultado.senhaTemporaria)} title="Copiar senha">
                  <FiCopy size={16} />
                </IconBtn>
              </Codigo>
            </Linha>

            <Aviso>
              Recomendações: envie a senha por um canal seguro e peça para o funcionário trocar no primeiro acesso.
            </Aviso>

            <Rodape>
              <BtnGhost type="button" onClick={resetar}>Cadastrar outro</BtnGhost>
              <BtnPrimary type="button" onClick={fechar}>Fechar</BtnPrimary>
            </Rodape>
          </Resultado>
        )}
      </Modal>
    </Overlay>
  );
}

/* styles */
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
    
    button {
      width: 100%;
    }
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

const Resultado = styled.div`
  padding: 0 14px 14px;

  h4 {
    margin: 0 0 12px;
    font-weight: 900;
  }
`;

const Linha = styled.div`
  display: grid;
  gap: 6px;
  margin-bottom: 10px;

  span {
    font-size: 12px;
    color: ${({ theme }) => theme.cores.texto2};
  }
`;

const Codigo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.raio.lg};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie};
  font-weight: 900;
  word-break: break-all;
  font-size: 13px;
`;

const IconBtn = styled.button`
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.cores.texto2};
`;

const Aviso = styled.div`
  margin-top: 8px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.raio.lg};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: rgba(47,129,247,0.10);
  color: ${({ theme }) => theme.cores.texto2};
  font-size: 12px;
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

const SeletorWrapper = styled.div`
  width: 100%;
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

const Select = styled.select`
  height: 44px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.raio.lg};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie};
  color: ${({ theme }) => theme.cores.texto};
  outline: none;
  cursor: pointer;

  option {
    background: ${({ theme }) => theme.cores.superficie2};
    color: ${({ theme }) => theme.cores.texto};
  }
`;
