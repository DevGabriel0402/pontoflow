import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { db } from '../services/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { FiSend, FiUser, FiClock, FiMessageCircle, FiX, FiMinimize2 } from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ChatSuporte({ companyId, isMaster = false, userName = "Suporte", floating = false }) {
  const [mensagens, setMensagens] = useState([]);
  const [novaMsg, setNovaMsg] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!companyId) return;

    const q = query(
      collection(db, "suporte_mensagens"),
      where("companyId", "==", companyId),
      orderBy("enviadoEm", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMensagens(msgs);
      setCarregando(false);
    });

    return () => unsub();
  }, [companyId]);

  useEffect(() => {
    if (scrollRef.current && (isOpen || !floating)) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens, isOpen, floating]);

  const enviarMensagem = async (e) => {
    e.preventDefault();
    if (!novaMsg.trim()) return;

    const msgParaEnviar = novaMsg.trim();
    setNovaMsg("");

    try {
      await addDoc(collection(db, "suporte_mensagens"), {
        companyId,
        texto: msgParaEnviar,
        enviadoPor: userName,
        isMaster,
        enviadoEm: serverTimestamp()
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const renderContent = () => (
    <>
      <ChatHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FiMessageCircle />
          <span>Suporte PontoFlow</span>
        </div>
        {floating && (
          <CloseBtn onClick={() => setIsOpen(false)}>
            <FiMinimize2 />
          </CloseBtn>
        )}
      </ChatHeader>

      <MensagensArea ref={scrollRef}>
        {carregando ? (
          <EmptyState>Carregando conversa...</EmptyState>
        ) : mensagens.length === 0 ? (
          <EmptyState>Inicie uma conversa conosco. Envie sua dúvida abaixo.</EmptyState>
        ) : (
          mensagens.map((m) => (
            <MessageRow key={m.id} $isMe={isMaster ? m.isMaster : !m.isMaster}>
              <MessageBubble $isMe={isMaster ? m.isMaster : !m.isMaster}>
                <small>{m.enviadoPor}</small>
                <p>{m.texto}</p>
                <span>
                  {m.enviadoEm?.toDate ? format(m.enviadoEm.toDate(), "HH:mm", { locale: ptBR }) : "..."}
                </span>
              </MessageBubble>
            </MessageRow>
          ))
        )}
      </MensagensArea>

      <InputArea onSubmit={enviarMensagem}>
        <input 
          value={novaMsg} 
          onChange={e => setNovaMsg(e.target.value)} 
          placeholder="Digite sua mensagem..." 
        />
        <button type="submit" disabled={!novaMsg.trim()}>
          <FiSend />
        </button>
      </InputArea>
    </>
  );

  if (!companyId) return null;

  if (!floating) {
    return <ChatContainer>{renderContent()}</ChatContainer>;
  }

  return (
    <>
      <FloatingTrigger onClick={() => setIsOpen(true)} $isVisible={!isOpen}>
        <FiMessageCircle size={28} />
        {mensagens.length > 0 && <BadgeNotificacao />}
      </FloatingTrigger>

      <FloatingWrapper $isOpen={isOpen}>
        {renderContent()}
      </FloatingWrapper>
    </>
  );
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const ChatContainer = styled.div`
  background: #19191b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  height: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
`;

const FloatingWrapper = styled.div`
  position: fixed;
  bottom: 100px;
  right: 30px;
  width: 380px;
  height: 520px;
  background: #19191b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  z-index: 9999;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-origin: bottom right;

  ${props => !props.$isOpen && css`
    opacity: 0;
    transform: scale(0.5) translateY(40px);
    pointer-events: none;
  `}

  @media (max-width: 900px) {
    width: calc(100% - 40px);
    right: 20px;
    bottom: 110px;
  }
`;

const FloatingTrigger = styled.button`
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 64px;
  height: 64px;
  border-radius: 22px;
  background: #2f81f7;
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(47, 129, 247, 0.4);
  z-index: 9998;
  transition: all 0.3s;

  &:hover {
    transform: scale(1.1) translateY(-4px);
    box-shadow: 0 15px 30px rgba(47, 129, 247, 0.6);
  }

  @media (max-width: 900px) {
    right: 20px;
    bottom: 100px;
  }

  ${props => !props.$isVisible && css`
    opacity: 0;
    transform: scale(0.5) rotate(90deg);
    pointer-events: none;
  `}
`;

const BadgeNotificacao = styled.div`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  background: #ff4757;
  border: 3px solid #121214;
  border-radius: 50%;
`;

const ChatHeader = styled.div`
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
  color: #fff;
  svg { color: #2f81f7; }
`;

const CloseBtn = styled.button`
  background: transparent;
  border: none;
  color: #8d8d99;
  cursor: pointer;
  display: flex;
  padding: 4px;
  border-radius: 6px;
  &:hover { background: rgba(255,255,255,0.05); color: #fff; }
`;

const MensagensArea = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
`;

const MessageRow = styled.div`
  display: flex;
  justify-content: ${props => props.$isMe ? 'flex-end' : 'flex-start'};
`;

const MessageBubble = styled.div`
  max-width: 85%;
  padding: 10px 14px;
  border-radius: ${props => props.$isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px'};
  background: ${props => props.$isMe ? '#2f81f7' : '#29292e'};
  color: #fff;
  position: relative;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);

  small { font-size: 9px; opacity: 0.6; display: block; margin-bottom: 4px; font-weight: 700; text-transform: uppercase; }
  p { margin: 0; font-size: 13.5px; line-height: 1.5; white-space: pre-wrap; }
  span { font-size: 9px; opacity: 0.5; display: block; text-align: right; margin-top: 4px; }
`;

const EmptyState = styled.div`
  margin: auto;
  color: #8d8d99;
  font-size: 13px;
  text-align: center;
  max-width: 180px;
  line-height: 1.5;
`;

const InputArea = styled.form`
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  gap: 10px;

  input {
    flex: 1;
    background: #121214;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 10px 14px;
    border-radius: 8px;
    outline: none;
    font-size: 14px;
    &:focus { border-color: #2f81f7; }
  }

  button {
    background: #2f81f7;
    color: #fff;
    border: 0;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    &:hover { filter: brightness(1.1); transform: translateY(-1px); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
`;
