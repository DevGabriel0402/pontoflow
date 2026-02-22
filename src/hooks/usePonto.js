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

export function usePonto() {
    const { usuario, perfil, isAdmin } = useAuth();
    const { obterPosicao, carregando: carregandoGeo } = useGeolocation();

    const [validacao, setValidacao] = useState({
        ok: null,
        distance: null,
        coords: null,
    });

    const [dynamicConfig, setDynamicConfig] = useState(null);

    const { radius, officeCoords } = useMemo(() => {
        const env = getOfficeConfig();
        if (!dynamicConfig) return env;
        return {
            radius: dynamicConfig.raio || env.radius,
            officeCoords: {
                latitude: dynamicConfig.lat || env.officeCoords.latitude,
                longitude: dynamicConfig.lng || env.officeCoords.longitude,
            }
        };
    }, [dynamicConfig]);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const snap = await getDoc(doc(db, "settings", "geofencing"));
                if (snap.exists()) {
                    setDynamicConfig(snap.data());
                }
            } catch (e) {
                console.error("Erro ao buscar config:", e);
            }
        };
        fetchConfig();
    }, []);

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

    return {
        registrarPonto,
        validarLocal,
        validacao,
        carregandoGeo,
        radius,
        officeCoords,
    };
}