// src/hooks/useGeolocation.js
import React from "react";

export function useGeolocation() {
    const [carregando, setCarregando] = React.useState(false);
    const [erro, setErro] = React.useState(null);

    const obterPosicao = React.useCallback(() => {
        return new Promise((resolve, reject) => {
            setErro(null);

            if (!("geolocation" in navigator)) {
                const e = new Error("Geolocalização não suportada neste dispositivo.");
                setErro(e.message);
                reject(e);
                return;
            }

            setCarregando(true);

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setCarregando(false);
                    resolve(pos);
                },
                (err) => {
                    setCarregando(false);

                    let msg = "Não foi possível obter a localização.";
                    if (err.code === 1) msg = "Permissão de localização negada.";
                    if (err.code === 2) msg = "Localização indisponível no momento.";
                    if (err.code === 3) msg = "Tempo esgotado ao obter localização.";

                    setErro(msg);
                    reject(new Error(msg));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 0,
                }
            );
        });
    }, []);

    return { obterPosicao, carregando, erro };
}