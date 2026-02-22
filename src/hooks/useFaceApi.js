// src/hooks/useFaceApi.js
import * as faceapi from "face-api.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const MODELS_PATH = "/models";
const THRESHOLD = 0.5; // distância máxima para considerar match (mais restrito que o padrão 0.6)

export function useFaceApi() {
    const [modelosCarregados, setModelosCarregados] = useState(false);
    const [erroCarga, setErroCarga] = useState(null);
    const carregandoRef = useRef(false);

    useEffect(() => {
        if (carregandoRef.current || modelosCarregados) return;
        carregandoRef.current = true;

        const carregar = async () => {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
                    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_PATH),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH),
                ]);
                console.log("✅ face-api.js: modelos carregados");
                setModelosCarregados(true);
            } catch (e) {
                console.error("❌ face-api.js: falha ao carregar modelos", e);
                setErroCarga("Falha ao carregar os modelos de reconhecimento facial.");
            }
        };

        carregar();
    }, []);

    /**
     * Detecta o rosto no vídeo e retorna o descritor (Float32Array de 128 dims).
     * Retorna null se nenhum rosto for detectado.
     */
    const detectarRosto = useCallback(async (videoEl) => {
        const opcoes = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 });
        const detecao = await faceapi
            .detectSingleFace(videoEl, opcoes)
            .withFaceLandmarks(true)
            .withFaceDescriptor();
        return detecao ? detecao.descriptor : null;
    }, []);

    /**
     * Captura o descritor do rosto e salva no Firestore.
     * Deve ser chamado na primeira vez do usuário.
     */
    const cadastrarRosto = useCallback(async (videoEl, userId) => {
        const descriptor = await detectarRosto(videoEl);
        if (!descriptor) {
            throw new Error("Nenhum rosto detectado. Posicione-se em frente à câmera.");
        }
        // Salva como Array comum (Firestore não aceita Float32Array direto)
        await updateDoc(doc(db, "users", userId), {
            faceDescriptor: Array.from(descriptor),
        });
        console.log("✅ Rosto cadastrado para", userId);
        return descriptor;
    }, [detectarRosto]);

    /**
     * Autentica o usuário comparando o rosto atual com o descritor salvo.
     * Retorna true se o rosto bater, false caso contrário.
     */
    const autenticarRosto = useCallback(async (videoEl, userId) => {
        // Busca descritor salvo no Firestore
        const snap = await getDoc(doc(db, "users", userId));
        const data = snap.data();

        if (!data?.faceDescriptor || data.faceDescriptor.length === 0) {
            throw new Error("SEM_CADASTRO"); // sinal para fazer enrollment
        }

        const descSalvo = new Float32Array(data.faceDescriptor);
        const descAtual = await detectarRosto(videoEl);

        if (!descAtual) {
            throw new Error("Nenhum rosto detectado. Olhe diretamente para a câmera.");
        }

        const distancia = faceapi.euclideanDistance(descSalvo, descAtual);
        console.log(`🔍 Distância facial: ${distancia.toFixed(4)} (threshold: ${THRESHOLD})`);
        return distancia <= THRESHOLD;
    }, [detectarRosto]);

    return {
        modelosCarregados,
        erroCarga,
        cadastrarRosto,
        autenticarRosto,
        detectarRosto,
    };
}
