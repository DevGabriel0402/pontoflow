import React, { useState } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { FiLock, FiX, FiCheckCircle, FiEye, FiEyeOff } from "react-icons/fi";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebase";

export default function ModalTrocaSenha({ aberto, onSucesso, onFechar, obrigatorio = false }) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const handleTrocar = async (e) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      return toast.error("A senha deve ter no mínimo 6 caracteres.");
    }
    if (novaSenha !== confirmarSenha) {
      return toast.error("As senhas não conferem.");
    }

    setCarregando(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não encontrado.");

      // 1) Atualiza no Firebase Auth
      await updatePassword(user, novaSenha);

      // 2) Marca como feito no Firestore
      await updateDoc(doc(db, "users", user.uid), {
        primeiroAcesso: false,
        senhaAlteradaEm: new Date(),
      });

      toast.success("Senha alterada com sucesso!");
      onSucesso();
    } catch (err) {
      console.error(err);
      if (err.code === "auth/requires-recent-login") {
        toast.error("Sessão expirada. Por favor, saia e entre novamente no aplicativo para trocar sua senha por segurança.");
      } else {
        toast.error(err.message || "Falha ao alterar senha.");
      }
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
            <FiLock size={18} />
            {obrigatorio ? "Primeiro Acesso" : "Trocar Senha"}
          </Titulo>
          {!obrigatorio && (
            <Fechar onClick={onFechar}>
              <FiX size={18} />
            </Fechar>
          )}
        </Topo>

        <Conteudo>
          <Mensagem>
            Olá! Por segurança, você precisa definir uma nova senha no seu primeiro acesso.
          </Mensagem>

          <Form onSubmit={handleTrocar}>
            <Campo>
              <label>Nova Senha</label>
              <InputGrupo>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <ToggleSenha type="button" onClick={() => setMostrarSenha(!mostrarSenha)}>
                  {mostrarSenha ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </ToggleSenha>
              </InputGrupo>
            </Campo>

            <Campo>
              <label>Confirmar Nova Senha</label>
              <InputGrupo>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                />
                <ToggleSenha type="button" onClick={() => setMostrarSenha(!mostrarSenha)}>
                  {mostrarSenha ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </ToggleSenha>
              </InputGrupo>
            </Campo>

            <BotaoBarra>
              <BtnPrimary disabled={carregando}>
                {carregando ? "Salvando..." : "Salvar e Continuar"}
              </BtnPrimary>
            </BotaoBarra>
          </Form>
        </Conteudo>
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 9999;
  backdrop-filter: blur(4px);
`;

const Modal = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
`;

const Topo = styled.div`
  padding: 20px 20px 10px;
  text-align: center;
`;

const Titulo = styled.h3`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 900;
  font-size: 18px;
  color: ${({ theme }) => theme.cores.azul};
`;

const Fechar = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie};
  color: ${({ theme }) => theme.cores.texto2};
  height: 34px;
  width: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const Conteudo = styled.div`
  padding: 0 20px 24px;
`;

const Mensagem = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.cores.texto2};
  text-align: center;
  margin-bottom: 24px;
  line-height: 1.5;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 12px;
    font-weight: 700;
    color: ${({ theme }) => theme.cores.texto2};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  input {
    width: 100%;
    height: 48px;
    padding: 0 16px;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.cores.borda};
    background: ${({ theme }) => theme.cores.superficie};
    color: ${({ theme }) => theme.cores.texto};
    outline: none;
    font-size: 16px;

    &:focus {
      border-color: ${({ theme }) => theme.cores.azul};
    }
  }
`;

const InputGrupo = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const ToggleSenha = styled.button`
  position: absolute;
  right: 12px;
  background: transparent;
  border: 0;
  color: ${({ theme }) => theme.cores.texto2};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  
  &:hover {
    color: ${({ theme }) => theme.cores.azul};
  }
`;

const BotaoBarra = styled.div`
  margin-top: 8px;
`;

const BtnPrimary = styled.button`
  width: 100%;
  height: 52px;
  border-radius: 14px;
  border: 0;
  background: ${({ theme }) => theme.cores.azul};
  color: #fff;
  font-weight: 900;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
