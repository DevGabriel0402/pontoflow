import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { FiX, FiSend, FiBell, FiAlertTriangle, FiClock, FiFileText, FiUser, FiUsers } from "react-icons/fi";
import { db } from "../../services/firebase";
import { collection, addDoc, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";

const TIPOS_MENSAGEM = [
  { id: "COMUNICADO", label: "Comunicado Geral", icon: <FiBell size={14} />, cor: "#2f81f7" },
  { id: "LEMBRETE", label: "Lembrete de Ponto", icon: <FiClock size={14} />, cor: "#f1c40f" },
  { id: "URGENTE", label: "Aviso Urgente", icon: <FiAlertTriangle size={14} />, cor: "#e74c3c" },
  { id: "RH", label: "RH / Documentos", icon: <FiFileText size={14} />, cor: "#9b59b6" }
];

export default function ModalEnviarNotificacao({
  aberto,
  onFechar,
  funcionario,
  todosFuncionarios = false,
  listaFuncionarios = [],
  perfilAdmin
}) {
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoAlerta, setTipoAlerta] = useState("COMUNICADO");
  const [abrirComoModal, setAbrirComoModal] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const listaDestinatarios = useMemo(() => {
    if (todosFuncionarios) {
      return (listaFuncionarios || []).filter(
        (f) => f && f.ativo !== false && f.role !== "admin"
      );
    }
    if (funcionario) {
      return [funcionario];
    }
    return [];
  }, [todosFuncionarios, listaFuncionarios, funcionario]);

  if (!aberto || (!funcionario && !todosFuncionarios)) {
    return null;
  }

  const textoDestinatario = todosFuncionarios
    ? "Todos os Funcionários Colaboradores"
    : (funcionario?.nome || "Colaborador");

  const textoEmail = todosFuncionarios
    ? `Total de ${listaDestinatarios.length} colaboradores ativos vinculados à empresa`
    : [funcionario?.email, funcionario?.funcao].filter(Boolean).join(" • ");

  const handleEnviar = async (e) => {
    e.preventDefault();
    const tituloLimpo = titulo.trim();
    const mensagemLimpa = mensagem.trim();

    if (!tituloLimpo) {
      toast.error("Informe o título da notificação.");
      return;
    }
    if (!mensagemLimpa) {
      toast.error("Digite o texto da mensagem.");
      return;
    }

    if (todosFuncionarios && listaDestinatarios.length === 0) {
      toast.error("Nenhum funcionário colaborador ativo encontrado para envio.");
      return;
    }

    setEnviando(true);
    try {
      const companyIdFinal = perfilAdmin?.companyId || "";

      if (todosFuncionarios) {
        const chunkSize = 400;
        for (let i = 0; i < listaDestinatarios.length; i += chunkSize) {
          const chunk = listaDestinatarios.slice(i, i + chunkSize);
          const batch = writeBatch(db);

          chunk.forEach((f) => {
            const notifRef = doc(collection(db, "notificacoes"));
            batch.set(notifRef, {
              userId: f.id,
              userName: f.nome || "Colaborador",
              companyId: f.companyId || companyIdFinal,
              tipo: "comunicado_admin",
              tipoAlerta,
              titulo: tituloLimpo,
              mensagem: mensagemLimpa,
              abrirComoModal: !!abrirComoModal,
              lida: false,
              criadoPor: perfilAdmin?.uid || "",
              criadoPorNome: perfilAdmin?.nome || "Administração",
              data: serverTimestamp()
            });
          });

          await batch.commit();
        }

        toast.success(`Comunicado enviado com sucesso para ${listaDestinatarios.length} colaboradores!`, {
          icon: "📢",
          duration: 5000
        });
      } else {
        await addDoc(collection(db, "notificacoes"), {
          userId: funcionario?.id,
          userName: funcionario?.nome || "Colaborador",
          companyId: funcionario?.companyId || companyIdFinal,
          tipo: "comunicado_admin",
          tipoAlerta,
          titulo: tituloLimpo,
          mensagem: mensagemLimpa,
          abrirComoModal: !!abrirComoModal,
          lida: false,
          criadoPor: perfilAdmin?.uid || "",
          criadoPorNome: perfilAdmin?.nome || "Administração",
          data: serverTimestamp()
        });

        toast.success(`Notificação enviada com sucesso para ${funcionario?.nome || "colaborador"}!`, {
          icon: "📢",
          duration: 4000
        });
      }

      setTitulo("");
      setMensagem("");
      onFechar();
    } catch (err) {
      console.error("Erro ao enviar notificação:", err);
      toast.error("Erro ao enviar notificação. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Overlay onClick={onFechar}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Topo>
          <Titulo>
            <IconeTopo $todos={todosFuncionarios}>
              {todosFuncionarios ? <FiUsers size={22} /> : <FiBell size={20} />}
            </IconeTopo>
            <div>
              <h3>{todosFuncionarios ? "Enviar Notificação para Todos" : "Enviar Notificação Individual"}</h3>
              <SubTitulo>
                {todosFuncionarios
                  ? `Esta mensagem será enviada em broadcast para ${listaDestinatarios.length} colaboradores ativos`
                  : "Esta mensagem aparecerá como alerta em destaque para o colaborador"}
              </SubTitulo>
            </div>
          </Titulo>
          <BotaoFechar onClick={onFechar} type="button">
            <FiX size={20} />
          </BotaoFechar>
        </Topo>

        <Formulario onSubmit={handleEnviar}>
          <Corpo>
            <CardDestinatario $todos={todosFuncionarios}>
              <div className="avatar">
                {todosFuncionarios ? <FiUsers size={20} /> : <FiUser size={18} />}
              </div>
              <div className="info">
                <span className="label">
                  {todosFuncionarios ? "Destinatários (Broadcast):" : "Destinatário:"}
                </span>
                <strong>{textoDestinatario}</strong>
                <span className="email">{textoEmail}</span>
              </div>
            </CardDestinatario>

            <InputGroup>
              <label>Tipo de Mensagem</label>
              <GradeTipos>
                {TIPOS_MENSAGEM.map((t) => (
                  <TipoBtn
                    key={t.id}
                    type="button"
                    $ativo={tipoAlerta === t.id}
                    $cor={t.cor}
                    onClick={() => setTipoAlerta(t.id)}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </TipoBtn>
                ))}
              </GradeTipos>
            </InputGroup>

            <InputGroup>
              <label>Título do Aviso</label>
              <input
                type="text"
                placeholder="Ex: Assinatura de Folha de Ponto / Lembrete Importante..."
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={80}
                required
              />
            </InputGroup>

            <InputGroup>
              <label>Conteúdo da Mensagem</label>
              <textarea
                placeholder="Escreva a mensagem clara que o colaborador verá assim que entrar no aplicativo..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={5}
                required
              />
            </InputGroup>

            <ToggleContainer onClick={() => setAbrirComoModal((prev) => !prev)}>
              <Switch $ativo={abrirComoModal}>
                <span />
              </Switch>
              <div className="texto-toggle">
                <strong>Abrir como popup modal na tela do colaborador</strong>
                <span>Assim que entrar no aplicativo, a mensagem abrirá na frente da tela até ser confirmada</span>
              </div>
            </ToggleContainer>
          </Corpo>

          <Footer>
            <BotaoGhost type="button" onClick={onFechar}>
              Cancelar
            </BotaoGhost>
            <BotaoEnviar type="submit" disabled={enviando || !titulo.trim() || !mensagem.trim()}>
              <FiSend size={15} />
              {enviando
                ? (todosFuncionarios ? `Enviando para ${listaDestinatarios.length}...` : "Enviando...")
                : (todosFuncionarios ? `Enviar para Todos (${listaDestinatarios.length})` : "Enviar Notificação")}
            </BotaoEnviar>
          </Footer>
        </Formulario>
      </Modal>
    </Overlay>
  );
}

/* ── Styled Components ────────────────────────── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 10000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Modal = styled.div`
  width: 100%;
  max-width: 540px;
  background: ${({ theme }) => theme.cores.card};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  animation: modalSlide 0.25s ease-out;
  display: flex;
  flex-direction: column;

  @keyframes modalSlide {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

const Topo = styled.div`
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie2};
`;

const Titulo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    color: ${({ theme }) => theme.cores.texto};
  }
`;

const IconeTopo = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${({ $todos }) => ($todos ? "rgba(47, 129, 247, 0.2)" : "rgba(47, 129, 247, 0.12)")};
  color: #2f81f7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const SubTitulo = styled.p`
  margin: 3px 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme.cores.texto2};
`;

const BotaoFechar = styled.button`
  background: transparent;
  border: 0;
  color: ${({ theme }) => theme.cores.texto2};
  cursor: pointer;
  display: flex;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.cores.destaqueHover};
    color: ${({ theme }) => theme.cores.texto};
  }
`;

const Formulario = styled.form`
  display: flex;
  flex-direction: column;
`;

const Corpo = styled.div`
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const CardDestinatario = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};

  .avatar {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(47, 129, 247, 0.15);
    color: #2f81f7;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    .label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: ${({ theme }) => theme.cores.texto2};
    }

    strong {
      font-size: 14px;
      font-weight: 700;
      color: ${({ theme }) => theme.cores.texto};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .email {
      font-size: 12px;
      color: ${({ theme }) => theme.cores.texto2};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

const GradeTipos = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

const TipoBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme, $ativo, $cor }) =>
    $ativo ? `${$cor}18` : theme.cores.superficie};
  border: 1.5px solid ${({ theme, $ativo, $cor }) =>
    $ativo ? $cor : theme.cores.borda};
  color: ${({ theme, $ativo, $cor }) =>
    $ativo ? $cor : theme.cores.texto};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ $cor }) => $cor};
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 12px;
    font-weight: 700;
    color: ${({ theme }) => theme.cores.texto};
  }

  input, textarea {
    width: 100%;
    padding: 11px 14px;
    border-radius: 10px;
    background: ${({ theme }) => theme.cores.superficie};
    border: 1px solid ${({ theme }) => theme.cores.borda};
    color: ${({ theme }) => theme.cores.texto};
    font-size: 13.5px;
    font-family: inherit;
    outline: none;
    transition: all 0.2s;
    box-sizing: border-box;

    &:focus {
      border-color: ${({ theme }) => theme.cores.azul || "#2f81f7"};
      box-shadow: 0 0 0 3px rgba(47, 129, 247, 0.15);
    }

    &::placeholder {
      color: ${({ theme }) => theme.cores.texto2};
      opacity: 0.6;
    }
  }

  textarea {
    resize: vertical;
    min-height: 90px;
    line-height: 1.45;
  }
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  cursor: pointer;
  user-select: none;

  .texto-toggle {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      font-size: 12.5px;
      color: ${({ theme }) => theme.cores.texto};
    }

    span {
      font-size: 11px;
      color: ${({ theme }) => theme.cores.texto2};
      line-height: 1.35;
    }
  }
`;

const Switch = styled.div`
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: ${({ theme, $ativo }) => ($ativo ? "#2f81f7" : theme.cores.bordaForte)};
  position: relative;
  transition: background 0.25s;
  flex-shrink: 0;

  span {
    position: absolute;
    top: 3px;
    left: ${({ $ativo }) => ($ativo ? "21px" : "3px")};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.25s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
`;

const Footer = styled.div`
  padding: 16px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie2};
`;

const BotaoGhost = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.cores.borda};
  color: ${({ theme }) => theme.cores.texto2};
  padding: 0 16px;
  height: 40px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.cores.destaqueHover};
    color: ${({ theme }) => theme.cores.texto};
  }
`;

const BotaoEnviar = styled.button`
  background: #2f81f7;
  color: #fff;
  border: 0;
  padding: 0 20px;
  height: 40px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;
