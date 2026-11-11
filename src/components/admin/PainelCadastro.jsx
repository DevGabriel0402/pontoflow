import React, { useState } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { FiUserPlus, FiSave, FiInfo } from "react-icons/fi";
import { criarFuncionarioFn } from "../../services/funcoes";
import { useConfig } from "../../contexts/ConfigContexto";
import { useAuth } from "../../contexts/AuthContexto";


export default function PainelCadastro() {
  const { config } = useConfig();
  const { perfil } = useAuth();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [role, setRole] = useState("colaborador");
  const [funcao, setFuncao] = useState("");
  const [exigirGeo, setExigirGeo] = useState(true);

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
    setExigirGeo(true);
  };

  const handleCadastrar = async (e) => {
    e.preventDefault();
    if (!perfil?.companyId) {
      toast.error("Erro: Empresa não identificada.");
      return;
    }

    setCarregando(true);
    try {
      const resultado = await criarFuncionarioFn({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        dataNascimento,
        role,
        funcao: funcao.trim() || null,
        exigirGeo,

        // Jornada padrão vazia ou básica para ser editada depois
        jornadas: {
          segunda: { entrada: "08:00", saida: "17:00", ativo: true },
          terca: { entrada: "08:00", saida: "17:00", ativo: true },
          quarta: { entrada: "08:00", saida: "17:00", ativo: true },
          quinta: { entrada: "08:00", saida: "17:00", ativo: true },
          sexta: { entrada: "08:00", saida: "17:00", ativo: true },
          sabado: { entrada: "08:00", saida: "12:00", ativo: false },
          domingo: { entrada: "08:00", saida: "12:00", ativo: false },
        },
        cargaHorariaSemanal: role === 'admin' ? 'Livre' : (config?.regras?.cargaHorariaSemanal ? `${config.regras.cargaHorariaSemanal} Horas` : "44 Horas")
      });

      toast.success(
        `Funcionário cadastrado. Senha temporária: ${resultado.senhaTemporaria}`,
        { duration: 10000 }
      );
      resetar();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Falha ao cadastrar o funcionário.");
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

          <Campo style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: 'pointer', margin: 0 }}>
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: '#fff' }}>📍 Exigir Localização (Geofencing)</strong>
                <span style={{ fontSize: 11, color: '#8d8d99', fontWeight: 400, display: 'block', marginTop: 2 }}>
                  {exigirGeo ? "Ativado: exige estar dentro do raio da empresa para bater ponto." : "Desativado: permite bater ponto de qualquer local sem restrição de raio."}
                </span>
              </div>
              <input
                type="checkbox"
                checked={exigirGeo}
                onChange={(e) => setExigirGeo(e.target.checked)}
                style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#2f81f7', flexShrink: 0, marginLeft: 12 }}
              />
            </label>
          </Campo>

          {/* Removido campo de matricula

            <input




            />
          */}

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

  h2 { margin: 0; font-size: 24px; color: ${({ theme }) => theme.cores.texto}; }
  p { margin: 4px 0 0; color: ${({ theme }) => theme.cores.texto2}; font-size: 14px; }
`;

const InfoCard = styled.div`
  background: ${({ theme }) => theme.cores.azul + "12"};
  border: 1px solid ${({ theme }) => theme.cores.azul + "25"};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 32px;
  color: ${({ theme }) => theme.cores.texto};
  font-size: 14px;
  line-height: 1.5;

  svg { color: var(--cor-primaria); flex-shrink: 0; margin-top: 2px; }
  strong { color: ${({ theme }) => theme.cores.texto}; }
`;

const Form = styled.form`
  background: ${({ theme }) => theme.cores.card};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 16px;
  padding: 32px;
  box-shadow: ${({ theme }) => theme.sombra.suave};

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
    color: ${({ theme }) => theme.cores.texto2};
  }

  input, select {
    height: 48px;
    padding: 0 16px;
    background: ${({ theme }) => theme.cores.inputFundo};
    border: 1px solid ${({ theme }) => theme.cores.inputBorda};
    border-radius: 8px;
    color: ${({ theme }) => theme.cores.texto};
    font-size: 14px;
    outline: none;
    transition: all 0.2s;

    &:focus {
      border-color: var(--cor-primaria);
      box-shadow: 0 0 0 2px rgba(47, 129, 247, 0.1);
    }

    &::placeholder { color: ${({ theme }) => theme.cores.texto2}88; }
  }
`;

const RoleSelector = styled.div`
  display: flex;
  background: ${({ theme }) => theme.cores.superficie2};
  padding: 4px;
  border-radius: 8px;
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
  background: ${({ $ativo }) => $ativo ? "var(--cor-primaria)" : "transparent"};
  color: ${({ $ativo, theme }) => $ativo ? "#fff" : theme.cores.texto2};

  &:hover {
    background: ${({ $ativo, theme }) => $ativo ? "var(--cor-primaria)" : theme.cores.destaqueHover};
  }
`;

const Select = styled.select`
  cursor: pointer;
  option { background: ${({ theme }) => theme.cores.superficie}; color: ${({ theme }) => theme.cores.texto}; }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid ${({ theme }) => theme.cores.borda};

  .btn-ghost {
    background: transparent;
    border: 0;
    color: ${({ theme }) => theme.cores.texto2};
    font-weight: 600;
    cursor: pointer;
    &:hover { color: ${({ theme }) => theme.cores.texto}; }
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
