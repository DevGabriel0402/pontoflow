import React, { useState } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContexto";
import { FiLogIn, FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [carregando, setCarregando] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCarregando(true);
        try {
            await login(email, senha);
            toast.success("Bem-vindo ao PontoFlow!");
            navigate("/");
        } catch (err) {
            toast.error("Falha no login. Verifique email e senha.");
            console.log(err);
        } finally {
            setCarregando(false);
        }
    };

    return (
        <Tela>
            <Card>
                <Topo>
                    <Logo src="/icons/pwa-512x512.png" alt="PontoFlow" />
                    <h1>PontoFlow</h1>
                </Topo>

                <Sub>Faça login para registar seu ponto.</Sub>

                <Form onSubmit={handleSubmit}>
                    <label>Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />

                    <label>Senha</label>
                    <InputSenhaWrapper>
                        <input
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            type={mostrarSenha ? "text" : "password"}
                        />
                        <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}>
                            {mostrarSenha ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                        </button>
                    </InputSenhaWrapper>

                    <Botao disabled={carregando}>
                        <FiLogIn size={18} />
                        {carregando ? "Entrando..." : "Entrar"}
                    </Botao>
                </Form>
            </Card>
        </Tela>
    );
}

const Tela = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 18px;
  background: ${({ theme }) => theme.cores.fundo};
`;

const Card = styled.div`
  width: 100%;
  max-width: 380px;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: ${({ theme }) => theme.raio.xl};
  padding: 18px;
  box-shadow: ${({ theme }) => theme.sombra.suave};
`;

const Topo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  h1 {
    margin: 0;
    font-size: 18px;
  }
`;

const Logo = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  object-fit: contain;
`;

const Sub = styled.p`
  margin: 10px 0 16px;
  color: ${({ theme }) => theme.cores.texto2};
  font-size: 13px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;

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
    right: 12px;
    background: transparent;
    border: 0;
    color: ${({ theme }) => theme.cores.texto2};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
  }
`;

const Botao = styled.button`
  margin-top: 8px;
  height: 46px;
  border: 0;
  border-radius: ${({ theme }) => theme.raio.lg};
  background: ${({ theme }) => theme.cores.azul};
  color: #fff;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`;