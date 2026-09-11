import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContexto";
import { useConfig } from "../../contexts/ConfigContexto";
import { FiLogIn, FiEye, FiEyeOff } from "react-icons/fi";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function Login() {
  const { login, usuario, perfil } = useAuth();
  const { nomePainel } = useConfig();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Redireciona se já estiver logado
  useEffect(() => {
    if (usuario && perfil) {
      if (perfil.role === "admin") navigate("/admin");
      else if (perfil.role === "master") navigate("/master");
      else navigate("/home");
    }
  }, [usuario, perfil, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (carregando) return;

    setCarregando(true);

    try {
      // Fluxo direto via Firebase Auth (Email/Senha)
      const userRecord = await login(email, senha);

      if (!userRecord) {
        throw new Error("Falha na identificação do usuário.");
      }

      try {
        // Buscar nome do usuário no Firestore para saudação personalizada
        const userDoc = await getDoc(doc(db, "users", userRecord.uid));
        const nomeUsuario = userDoc.exists() ? userDoc.data().nome : "";
        const primeiroNome = nomeUsuario ? nomeUsuario.split(" ")[0] : "";

        if (primeiroNome) {
          toast.success(`Bem-vindo(a) de volta, ${primeiroNome}! 👋`);
        } else {
          toast.success("Bem-vindo(a) ao PontoFlow!");
        }
      } catch {
        toast.success("Bem-vindo(a) ao PontoFlow!");
      }

      // Buscar perfil para redirecionamento
      const snap = await getDoc(doc(db, "users", userRecord.uid));
      const perfilData = snap.exists() ? snap.data() : null;

      if (perfilData?.role === "admin") window.location.href = "/admin";
      else if (perfilData?.role === "master") window.location.href = "/master";
      else window.location.href = "/home";

    } catch (err) {
      console.error("Erro no login:", err);
      toast.error("Acesso negado. Verifique seu e-mail e senha.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Tela>
      <Card>
        <Topo>
          <Logo src="/icons/pwa-512x512.png" alt={nomePainel || "PontoFlow"} />
          <h1>{nomePainel || "PontoFlow"}</h1>
        </Topo>

        <Sub>Sua plataforma de gestão de ponto inteligente.</Sub>

        <Form onSubmit={handleSubmit}>
          <label>Seu Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="email@exemplo.com"
            required
            autoComplete="username"
          />

          <label>Sua Senha</label>
          <InputSenhaWrapper>
            <input
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              type={mostrarSenha ? "text" : "password"}
              placeholder="********"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              title={mostrarSenha ? "Ocultar senha" : "Ver senha"}
            >
              {mostrarSenha ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </InputSenhaWrapper>

          <Botao type="submit" disabled={carregando}>
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
  padding: 28px 24px;
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
    color: ${({ theme }) => theme.cores.texto};
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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;

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
  margin-top: 8px;
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
