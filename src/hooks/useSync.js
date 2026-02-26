// src/hooks/useSync.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { db } from "../services/firebase";
import {
    obterFila,
    removerDaFila,
    totalFila,
    OFFLINE_QUEUE_EVENTO,
} from "../services/offlineQueue";
import { useAuth } from "../contexts/AuthContexto";

export function useSync() {
    const { usuario, perfil } = useAuth();
    const [online, setOnline] = React.useState(navigator.onLine);
    const [sincronizando, setSincronizando] = React.useState(false);
    const [pendentes, setPendentes] = React.useState(totalFila());

    const atualizarPendentes = React.useCallback(() => {
        setPendentes(totalFila());
    }, []);

    const syncAgora = React.useCallback(async () => {
        if (!navigator.onLine) return;

        const fila = obterFila();
        if (!fila.length) return;

        setSincronizando(true);

        let enviados = 0;

        try {
            for (const item of fila) {
                // Revalida companyId caso tenha sido alterado/corrigido enquanto offline
                let companyIdFinal = item.companyId;
                if (usuario && usuario.uid === item.userId && perfil?.companyId && perfil.companyId !== "default") {
                    companyIdFinal = perfil.companyId;
                }

                const payload = {
                    ...item,
                    companyId: companyIdFinal,
                    localId: undefined,
                    // criadoEmLocal: undefined,
                    origem: "offline_queue",
                    criadoEm: serverTimestamp(),
                };

                Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

                await addDoc(collection(db, "pontos"), payload);

                removerDaFila(item.localId);
                enviados += 1;
            }

            atualizarPendentes();
            toast.success(`Sincronizado: ${enviados} ponto(s) enviados!`);
        } catch (err) {
            console.error(err);
            toast.error("Falha ao sincronizar. Vamos tentar novamente quando a internet estabilizar.");
            atualizarPendentes();
        } finally {
            setSincronizando(false);
        }
    }, [atualizarPendentes, usuario, perfil]);

    React.useEffect(() => {
        const onOnline = () => {
            setOnline(true);
            atualizarPendentes();
            syncAgora();
        };

        const onOffline = () => {
            setOnline(false);
            atualizarPendentes();
        };

        const onFila = () => atualizarPendentes();

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        window.addEventListener(OFFLINE_QUEUE_EVENTO, onFila);

        atualizarPendentes();

        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
            window.removeEventListener(OFFLINE_QUEUE_EVENTO, onFila);
        };
    }, [syncAgora, atualizarPendentes]);

    const status = React.useMemo(
        () => ({ online, sincronizando, pendentes }),
        [online, sincronizando, pendentes]
    );

    return { ...status, syncAgora, atualizarPendentes };
}