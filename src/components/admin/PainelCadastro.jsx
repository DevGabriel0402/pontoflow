import React, { useState } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { FiUserPlus, FiSave, FiInfo } from "react-icons/fi";
import { db } from "../../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useConfig } from "../../contexts/ConfigContexto";
import { useAuth } from "../../contexts/AuthContexto";
import { maskMatricula, unmaskMatricula } from "../../utils/mascaras";

export default function PainelCadastro() {
  const { config } = useConfig();
  const { perfil } = useAuth();
  
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [role, setRole] = useState("colaborador");
  const [funcao, setFuncao] = useState("");
  const [matricula, setMatricula] = useState("");
  const [carregando, setCarregando] = useState(false);

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

  const resetar = () => {
    setNome("");
    setEmail("");
    setDataNascimento("");
    setRole("colaborador");
    setFuncao("");
    setMatricula("");
  };

  const handleCadastrar = async (e) => {
    e.preventDefault();
    if (!perfil?.companyId) {
      toast.error("Erro: Empresa não identificada.");
      return;
    }

    setCarregando(true);
    try {
      await addDoc(collection(db, "users"), {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        dataNascimento,
        role,
        funcao: funcao.trim() || null,
        matricula: unmaskMatricula(matricula, config?.regras?.digitosMatricula),
        companyId: perfil.companyId,
        ativo: true,
        status: 'novo',
        criadoEm: serverTimestamp(),
        // Jornada padrão vazia ou básica para ser editada depois
        jornadas: {
          segunda: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
          terca: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
          quarta: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
          quinta: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
          sexta: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "17:00", ativo: true },
          sabado: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "12:00", ativo: false },
          domingo: { entrada: "08:00", inicioIntervalo: "12:00", fimIntervalo: "13:00", saida: "12:00", ativo: false },
        },
        cargaHorariaSemanal: role === 'admin' ? 'Livre' : (config?.regras?.cargaHorariaSemanal ? `${config.regras.cargaHorariaSemanal} Horas` : "44 Horas")
      });

      toast.success("Funcionário cadastrado como 'Novo'! Agora você pode editar os detalhes na lista de funcionários.");
      resetar();
    } catch (err) {
      console.error(err);
      toast.error("Falha ao cadastrar no banco de dados.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Container>
      <Header>
        <FiUserPlus size={24} color="var(--cor-primaria)" />
        <div>
          <h2>Cadastro de Funcionário</h2>
          <p>Adicione rapidamente um novo colaborador ao sistema.</p>
        </div>
      </Header>

      <InfoCard>
        <FiInfo size={20} />
        <p>Os funcionários cadastrados aqui aparecerão como <strong>"Novo"</strong> na lista geral. Você poderá configurar horários, escalas e outras informações clicando em editar após o cadastro.</p>
      </InfoCard>

      <Form onSubmit={handleCadastrar}>
        <Grid>
          <Campo>
            <label>Nome Completo</label>
            <input 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              placeholder="Ex: João Silva" 
              required
            />
          </Campo>

          <Campo>
            <label>Email Corporativo / Pessoal</label>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              type="email"
              placeholder="ex: joao@empresa.com" 
              required
            />
          </Campo>

          <Campo>
            <label>Data de Nascimento</label>
            <input 
              type="date" 
              value={dataNascimento} 
              onChange={(e) => setDataNascimento(e.target.value)} 
              required
            />
          </Campo>

          <Campo>
            <label>Matrícula / ID</label>
            <input
              value={matricula}
              onChange={(e) => setMatricula(maskMatricula(e.target.value, config?.regras?.digitosMatricula))}
              placeholder={`${"0".repeat((config?.regras?.digitosMatricula || 8) - 1)}-0`}
              required={config?.regras?.loginPorMatricula}
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
                onClick={() => setRole('admin')}
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
        </Grid>

        <Footer>
          <button type="button" className="btn-ghost" onClick={resetar}>Limpar Campos</button>
          <button type="submit" className="btn-primary" disabled={carregando}>
            {carregando ? "Cadastrando..." : (
              <>
                <FiSave /> Cadastrar Funcionário
              </>
            )}
          </button>
        </Footer>
      </Form>
    </Container>
  );
}

const Container = styled.div`
  animation: fadeIn 0.3s ease;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;

  h2 { margin: 0; font-size: 24px; color: #fff; }
  p { margin: 4px 0 0; color: #8d8d99; font-size: 14px; }
`;

const InfoCard = styled.div`
  background: rgba(47, 129, 247, 0.1);
  border: 1px solid rgba(47, 129, 247, 0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 32px;
  color: #adbac7;
  font-size: 14px;
  line-height: 1.5;

  svg { color: var(--cor-primaria); flex-shrink: 0; margin-top: 2px; }
  strong { color: #fff; }
`;

const Form = styled.form`
  background: #19191b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 32px;

  @media (max-width: 600px) {
    padding: 20px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 13px;
    font-weight: 600;
    color: #8d8d99;
  }

  input, select {
    height: 48px;
    padding: 0 16px;
    background: #121214;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    outline: none;
    transition: all 0.2s;

    &:focus {
      border-color: var(--cor-primaria);
      box-shadow: 0 0 0 2px rgba(47, 129, 247, 0.1);
    }

    &::placeholder { color: #444; }
    &::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
  }
`;

const RoleSelector = styled.div`
  display: flex;
  background: #121214;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
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
  background: ${({ $ativo }) => $ativo ? "var(--cor-primaria)" : "transparent"};
  color: ${({ $ativo }) => $ativo ? "#fff" : "#8d8d99"};

  &:hover {
    background: ${({ $ativo }) => $ativo ? "var(--cor-primaria)" : "rgba(255,255,255,0.05)"};
  }
`;

const Select = styled.select`
  cursor: pointer;
  option { background: #19191b; }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.05);

  .btn-ghost {
    background: transparent;
    border: 0;
    color: #8d8d99;
    font-weight: 600;
    cursor: pointer;
    &:hover { color: #fff; }
  }

  .btn-primary {
    height: 48px;
    padding: 0 24px;
    background: var(--cor-primaria);
    color: #fff;
    border: 0;
    border-radius: 8px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  @media (max-width: 600px) {
    flex-direction: column-reverse;
    .btn-primary { width: 100%; justify-content: center; }
  }
`;
