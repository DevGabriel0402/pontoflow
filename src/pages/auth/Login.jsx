import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContexto";
import { useConfig } from "../../contexts/ConfigContexto";
import { FiLogIn, FiEye, FiEyeOff } from "react-icons/fi";
import SeletorAcordeao from "../../components/SeletorAcordeao";
import { loginPorMatriculaFn } from "../../services/funcoes";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import { signInWithCustomToken } from "firebase/auth";
import { maskMatricula, unmaskMatricula } from "../../utils/mascaras";

export default function Login() {
  const { login } = useAuth();
  const { nomePainel } = useConfig();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [slug, setSlug] = useState("");
  const [matricula, setMatricula] = useState("");
  const [modo, setModo] = useState("email"); // "email" ou "matricula"
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [carregandoEmpresas, setCarregandoEmpresas] = useState(false);
  const empresaSelecionada = empresas.find(e => e.id === slug);

  useEffect(() => {
    const buscarEmpresas = async () => {
      if (modo !== "matricula") return;

      setCarregandoEmpresas(true);
      try {
        let snap;
        try {
          // Tenta buscar apenas empresas que permitem login por matrícula (lado servidor)
          const q = query(
            collection(db, "companies"),
            where("config.regras.loginPorMatricula", "==", true)
          );
          snap = await getDocs(q);
        } catch (permerr) {
          console.warn("Filtro no servidor falhou (possível erro de permissão), buscando todas como fallback.", permerr);
          // Fallback: Busca todas as empresas e filtra no frontend
          snap = await getDocs(collection(db, "companies"));
        }

        const lista = snap.docs
          .map(doc => ({
            id: doc.id,
            nome: doc.data().nomeFantasia || doc.data().nome || doc.id,
            permitido: doc.data().config?.regras?.loginPorMatricula === true,
            digitosMatricula: doc.data().config?.regras?.digitosMatricula || 8
          }))
          .filter(emp => emp.permitido);

        setEmpresas(lista);
        if (lista.length > 0 && !slug) {
          setSlug(lista[0].id);
        }
      } catch (err) {
        console.error("Erro ao carregar empresas:", err);
        // Se ambos falharem, mostramos erro ao usuário
        if (modo === "matricula") {
          toast.error("Erro de permissão ao listar empresas. Verifique as regras do Firestore.");
        }
      } finally {
        setCarregandoEmpresas(false);
      }
    };

    buscarEmpresas();
  }, [modo, slug]); // slug aqui para não resetar se mudar modo, mas buscarEmpresas tem proteção

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (carregando) return;

    setCarregando(true);
    let userRecord = null;

    try {
      if (modo === "matricula") {
        if (!slug || !matricula) {
          toast.error("Selecione sua empresa e informe a matrícula.");
          setCarregando(false);
          return;
        }

        // Fluxo de login sem senha via Cloud Function (Custom Token)
        const res = await loginPorMatriculaFn({
          companyId: slug,
          matricula: unmaskMatricula(matricula, empresaSelecionada?.digitosMatricula)
        });

        if (!res || !res.token) {
          throw new Error("Token de acesso não gerado.");
        }

        const cred = await signInWithCustomToken(auth, res.token);
        userRecord = cred.user;

        // Saudação personalizada para login por matrícula
        const nomeFunc = res.nome || "Colaborador";
        toast.success(`Olá, ${nomeFunc}! 👋`);
      } else {
        // Fluxo normal via Firebase Auth (Email/Senha)
        userRecord = await login(email, senha);

        try {
          // Buscar nome do usuário no Firestore para saudação personalizada
          const userDoc = await getDoc(doc(db, "users", userRecord.uid));
          const nomeUsuario = userDoc.exists() ? userDoc.data().nome : "";
          const primeiroNome = nomeUsuario ? nomeUsuario.split(" ")[0] : "";

          if (primeiroNome) {
            toast.success(`Bem-vindo(a) de volta, ${primeiroNome}!`);
          } else {
            toast.success("Bem-vindo(a) ao PontoFlow!");
          }
        } catch (err) {
          toast.success("Bem-vindo(a) ao PontoFlow!");
        }
      }

      if (!userRecord) {
        throw new Error("Falha na identificação do usuário.");
      }

      // Buscar perfil para redirecionamento
      const snap = await getDoc(doc(db, "users", userRecord.uid));
      const perfilData = snap.exists() ? snap.data() : null;

      if (perfilData?.role === "admin") window.location.href = "/admin";
      else if (perfilData?.role === "master") window.location.href = "/master";
      else window.location.href = "/";

    } catch (err) {
      console.error("Erro no login:", err);
      toast.error("Acesso negado. Verifique seus dados.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Tela>
      <Card>
        <Topo>
          <Logo src="/icons/pwa-512x512.png" alt={nomePainel} />
          <h1>PontoFlow</h1>
        </Topo>

        <Sub>Sua plataforma de gestão de ponto inteligente.</Sub>

        <SeletorModo>
          <button
            type="button"
            className={modo === 'email' ? 'active' : ''}
            onClick={() => setModo('email')}
          >
            Email
          </button>
          <button
            type="button"
            className={modo === 'matricula' ? 'active' : ''}
            onClick={() => setModo('matricula')}
          >
            Matrícula
          </button>
        </SeletorModo>

        <Form onSubmit={handleSubmit}>
          {modo === "email" ? (
            <>
              <label>Seu Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="email@exemplo.com"
                required
              />

              <label>Sua Senha</label>
              <InputSenhaWrapper>
                <input
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="********"
                  required
                />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}>
                  {mostrarSenha ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </InputSenhaWrapper>
            </>
          ) : (
            <>
              <SeletorAcordeao
                label="Empresa"
                opcoes={empresas.map(e => ({ value: e.id, label: e.nome }))}
                value={slug}
                onChange={setSlug}
                carregando={carregandoEmpresas}
              />

              <label style={{ marginTop: '10px' }}>Número da Matrícula</label>
              <input
                value={matricula}
                onChange={(e) => setMatricula(maskMatricula(e.target.value, empresaSelecionada?.digitosMatricula))}
                placeholder={`${"0".repeat((empresaSelecionada?.digitosMatricula || 8) - 1)}-0`}
                required
              />
            </>
          )}

          <Botao disabled={carregando}>
            <FiLogIn size={18} />
            {carregando ? "Autenticando..." : "Entrar"}
          </Botao>
        </Form>
      </Card>
    </Tela>
  );
}

const Tela = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: ${({ theme }) => theme.cores.fundo};
`;

const Card = styled.div`
  width: 100%;
  max-width: 400px;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: ${({ theme }) => theme.raio.xl};
  padding: 24px;
  box-shadow: ${({ theme }) => theme.sombra.suave};
`;

const Topo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;

  h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
  }
`;

const Logo = styled.img`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  object-fit: contain;
`;

const Sub = styled.p`
  margin: 0 0 24px;
  color: ${({ theme }) => theme.cores.texto2};
  font-size: 14px;
`;

const SeletorModo = styled.div`
  display: flex;
  background: ${({ theme }) => theme.cores.superficie};
  padding: 4px;
  border-radius: ${({ theme }) => theme.raio.lg};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  gap: 4px;
  margin-bottom: 24px;

  button {
    flex: 1;
    height: 40px;
    border: 0;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    background: transparent;
    color: ${({ theme }) => theme.cores.texto2};

    &.active {
      background: ${({ theme }) => theme.cores.azul};
      color: #fff;
    }

    &:hover:not(.active) {
      background: rgba(255, 255, 255, 0.05);
    }
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;

  label {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.cores.texto2};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  input {
    height: 48px;
    padding: 0 14px;
    border-radius: ${({ theme }) => theme.raio.lg};
    border: 1px solid ${({ theme }) => theme.cores.borda};
    background: ${({ theme }) => theme.cores.superficie};
    color: ${({ theme }) => theme.cores.texto};
    outline: none;
    font-family: inherit;
    font-size: 15px;
    transition: border-color 0.2s;

    &:focus {
      border-color: ${({ theme }) => theme.cores.azul};
    }
  }
`;

const InputSenhaWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  input {
    width: 100%;
    padding-right: 48px !important;
  }

  button {
    position: absolute;
    right: 8px;
    background: transparent;
    border: 0;
    color: ${({ theme }) => theme.cores.texto2};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
  }
`;

const Botao = styled.button`
  margin-top: 12px;
  height: 50px;
  border: 0;
  border-radius: ${({ theme }) => theme.raio.lg};
  background: ${({ theme }) => theme.cores.azul};
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.1s, filter 0.2s;

  &:active {
    transform: scale(0.98);
  }

  &:hover {
    filter: brightness(1.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;