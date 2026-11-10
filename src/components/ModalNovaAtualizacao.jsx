import React from "react";
import styled from "styled-components";
import { FiZap, FiX, FiCheck, FiArrowRight } from "react-icons/fi";
import { db } from "../services/firebase";
import { doc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContexto";

export default function ModalNovaAtualizacao({ corPrimaria = "#4facfe" }) {
  const { perfil, usuario, isAdmin } = useAuth();
  const [atualizacao, setAtualizacao] = React.useState(null);
  const [aberto, setAberto] = React.useState(false);

  React.useEffect(() => {
    if (!usuario?.uid && !perfil?.id) return;

    const unsub = onSnapshot(doc(db, "settings", "saas"), async (snap) => {
      if (!snap.exists()) return;
      const { ultimaAtualizacaoId } = snap.data();
      if (!ultimaAtualizacaoId) return;

      const userId = usuario?.uid || perfil?.id;
      const isUserAdmin = isAdmin || perfil?.role === "admin";

      // Verifica se o usuário já viu esta atualização
      if (userId) {
        const lidaUser = localStorage.getItem(`ultimaVersaoLida_${userId}`);
        if (lidaUser === ultimaAtualizacaoId) {
          setAberto(false);
          return;
        }
      }

      // Busca dados do changelog
      try {
        const changelogSnap = await getDoc(doc(db, "changelog", ultimaAtualizacaoId));
        if (changelogSnap.exists()) {
          const data = changelogSnap.data();
          const destinatario = data.destinatario || "TODOS";

          let mostrar = false;
          if (destinatario === "TODOS") mostrar = true;
          else if (destinatario === "ADMIN" && isUserAdmin) mostrar = true;
          else if (destinatario === "COLABORADOR" && !isUserAdmin) mostrar = true;

          if (mostrar) {
            setAtualizacao({ id: ultimaAtualizacaoId, ...data });
            setAberto(true);
          } else {
            setAberto(false);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar modal de atualização:", err);
      }
    });

    return () => unsub();
  }, [usuario?.uid, perfil?.id, isAdmin, perfil?.role]);

  const handleFechar = async () => {
    setAberto(false);
    const userId = usuario?.uid || perfil?.id;
    const isUserAdmin = isAdmin || perfil?.role === "admin";

    if (userId && atualizacao?.id) {
      try {
        localStorage.setItem(`ultimaVersaoLida_${userId}`, atualizacao.id);
      } catch (e) {}
    }

    if (isUserAdmin && perfil?.companyId && atualizacao?.id) {
      try {
        await updateDoc(doc(db, "companies", perfil.companyId), {
          ultimaVersaoLida: atualizacao.id,
        });
      } catch (e) {}
    }
  };

  if (!aberto || !atualizacao) return null;

  return (
    <Overlay onClick={handleFechar}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <FecharBtn onClick={handleFechar} title="Fechar">
          <FiX size={20} />
        </FecharBtn>

        <IconeHeader style={{ "--cor": corPrimaria }}>
          <FiZap size={26} />
        </IconeHeader>

        <BadgeVersao style={{ "--cor": corPrimaria }}>
          Nova Versão • v{atualizacao.versao || "1.0.0"}
        </BadgeVersao>

        <Titulo>{atualizacao.titulo || "Novidades no Sistema"}</Titulo>

        <CorpoNotas>
          <pre>{atualizacao.notas || "Melhorias de desempenho e estabilidade."}</pre>
        </CorpoNotas>

        <BotaoEntendi
          onClick={handleFechar}
          style={{
            background: `linear-gradient(135deg, ${corPrimaria}, ${corPrimaria}dd)`,
          }}
        >
          <span>Entendi, continuar</span>
          <FiArrowRight size={16} />
        </BotaoEntendi>
      </ModalBox>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 999999;
  animation: fadeIn 0.25s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalBox = styled.div`
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  width: 100%;
  max-width: 440px;
  padding: 30px 24px 24px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.7);
  animation: popUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes popUp {
    from {
      opacity: 0;
      transform: scale(0.92) translateY(16px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

const FecharBtn = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  background: transparent;
  border: 0;
  color: #71717a;
  cursor: pointer;
  padding: 6px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
`;

const IconeHeader = styled.div`
  width: 58px;
  height: 58px;
  border-radius: 18px;
  background: rgba(47, 129, 247, 0.12);
  border: 1px solid rgba(47, 129, 247, 0.25);
  color: var(--cor, #4facfe);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
`;

const BadgeVersao = styled.span`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--cor, #4facfe);
  background: rgba(79, 172, 254, 0.12);
  border: 1px solid rgba(79, 172, 254, 0.25);
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 12px;
`;

const Titulo = styled.h3`
  font-size: 19px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 16px 0;
  line-height: 1.35;
`;

const CorpoNotas = styled.div`
  width: 100%;
  max-height: 240px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 14px 16px;
  text-align: left;
  margin-bottom: 22px;

  pre {
    margin: 0;
    font-size: 13px;
    color: #d4d4d8;
    line-height: 1.65;
    white-space: pre-wrap;
    font-family: inherit;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }
`;

const BotaoEntendi = styled.button`
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 14px;
  color: #111;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.98);
  }
`;

