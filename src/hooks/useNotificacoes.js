import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  writeBatch,
  deleteDoc
} from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * Hook para gerenciar as notificações do colaborador em tempo real.
 * @param {string} userId ID do usuário logado.
 */
export function useNotificacoes(userId) {
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidasCount, setNaoLidasCount] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotificacoes([]);
      setNaoLidasCount(0);
      setCarregando(false);
      return;
    }

    const q = query(
      collection(db, "notificacoes"),
      where("userId", "==", userId),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Converte timestamp do Firebase para Date se necessário
        data: doc.data().data?.toDate ? doc.data().data.toDate() : new Date(doc.data().data)
      }));

      setNotificacoes(lista);
      setNaoLidasCount(lista.filter(n => !n.lida).length);
      setCarregando(false);
    }, (error) => {
      console.error("Erro ao buscar notificações:", error);
      setCarregando(false);
    });

    return () => unsubscribe();
  }, [userId]);

  /**
   * Marca uma notificação específica como lida.
   */
  const marcarComoLida = async (id) => {
    try {
      const ref = doc(db, "notificacoes", id);
      await updateDoc(ref, { lida: true });
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  /**
   * Marca todas as notificações do usuário como lidas.
   */
  const marcarTodasComoLidas = async () => {
    try {
      const batch = writeBatch(db);
      notificacoes.forEach((n) => {
        if (!n.lida) {
          const ref = doc(db, "notificacoes", n.id);
          batch.update(ref, { lida: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  /**
   * Exclui uma notificação específica.
   */
  const excluirNotificacao = async (id) => {
    try {
      const ref = doc(db, "notificacoes", id);
      await deleteDoc(ref);
    } catch (error) {
      console.error("Erro ao excluir notificação:", error);
    }
  };

  return {
    notificacoes,
    naoLidasCount,
    carregando,
    marcarComoLida,
    marcarTodasComoLidas,
    excluirNotificacao
  };
}
