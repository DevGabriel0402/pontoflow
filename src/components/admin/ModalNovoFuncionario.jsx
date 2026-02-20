import React, { useState } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { FiUserPlus, FiX, FiCopy } from "react-icons/fi";
import { criarFuncionarioFn } from "../../services/funcoes";

export default function ModalNovoFuncionario({ aberto, onFechar }) {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [carregando, setCarregando] = useState(false);

    const [resultado, setResultado] = useState(null); // {email, senhaTemporaria, uid}

    const resetar = () => {
        setNome("");
        setEmail("");
        setResultado(null);
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
            const data = await criarFuncionarioFn({ nome: nome.trim(), email: email.trim() });
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

                        <Rodape>
                            <BtnGhost type="button" onClick={fechar}>Cancelar</BtnGhost>
                            <BtnPrimary disabled={carregando || !nome.trim() || !email.trim()}>
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
  }
`;

const Rodape = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
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
  height: 44px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.raio.lg};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie};
  font-weight: 900;
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