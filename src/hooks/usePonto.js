// src/hooks/usePonto.js
import { useCallback, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { db } from "../services/firebase";
import { useEffect } from "react";
import { checkLocation, getOfficeConfig } from "../utils/geofencing";
import { useGeolocation } from "./useGeolocation";
import { useAuth } from "../contexts/AuthContexto";
import { enfileirarPonto } from "../services/offlineQueue";

function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
    };
}

async function getPublicIP() {
    try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        return data.ip;
    } catch (e) {
        console.error("Erro ao obter IP:", e);
        return "Indisponível";
    }
}

import { useConfig } from "../contexts/ConfigContexto";

export function usePonto() {
    const { usuario, perfil, isAdmin } = useAuth();
    const { config } = useConfig();
    const { obterPosicao, carregando: carregandoGeo } = useGeolocation();

    const [validacao, setValidacao] = useState({
        ok: null,
        distance: null,
        coords: null,
    });

    const { radius, officeCoords } = useMemo(() => {
        const env = getOfficeConfig();
        if (!config) return env;
        return {
            radius: config.raioM || config.raio || env.radius,
            officeCoords: {
                latitude: config.lat || env.officeCoords.latitude,
                longitude: config.lng || env.officeCoords.longitude,
            }
        };
    }, [config]);

    const validarLocal = useCallback(async () => {
        const pos = await obterPosicao();
        const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
        };

        const { isInside, distance } = checkLocation(coords, officeCoords, radius);

        const estado = { ok: isInside, distance, coords };
        setValidacao(estado);

        return estado;
    }, [obterPosicao, officeCoords, radius]);

    const registrarPonto = useCallback(
        async (type) => {
            if (!usuario) {
                toast.error("Você precisa estar logado.");
                return;
            }

            const companyId = perfil?.companyId;
            if (!companyId || companyId === "default") {
                toast.error("Não foi possível identificar sua empresa. Contate o administrador.");
                return;
            }

            const { ok, distance, coords } = await validarLocal();

            // colaborador bloqueia fora do raio; admin pode (auditoria)
            if (!ok && !isAdmin) {
                toast.error(`Fora do raio permitido! Distância: ${distance}m`);
                return;
            }

            const userIP = await getPublicIP();

            const payloadBase = {
                userId: usuario.uid,
                userName: perfil?.nome || usuario.email,
                companyId: companyId,
                type,

                geolocation: {
                    lat: coords.latitude,
                    lng: coords.longitude,
                },
                distanciaRelativa: distance,
                dentroDoRaio: !!ok,
                deviceInfo: getDeviceInfo(),
                ip: userIP,
            };

            // ✅ OFFLINE: enfileira
            if (!navigator.onLine) {
                enfileirarPonto({
                    ...payloadBase,
                    origem: "offline",
                    criadoEmLocal: Date.now(),
                });

                toast.success("Sem internet: ponto guardado e será sincronizado automaticamente.");
                return;
            }

            // ✅ ONLINE: grava direto
            await addDoc(collection(db, "pontos"), {
                ...payloadBase,
                criadoEm: serverTimestamp(),
                origem: "online",
            });

            toast.success("Ponto registado com sucesso!");
        },
        [usuario, perfil, validarLocal, isAdmin]
    );

    return useMemo(() => ({
        registrarPonto,
        validarLocal,
        validacao,
        carregandoGeo,
        radius,
        officeCoords,
    }), [registrarPonto, validarLocal, validacao, carregandoGeo, radius, officeCoords]);
}