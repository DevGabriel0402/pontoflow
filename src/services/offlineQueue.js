// src/services/offlineQueue.js
const CHAVE = "pontoflow_fila_pontos_v1";
const EVENTO = "pontoflow_fila_atualizada";

function emitirEvento() {
    window.dispatchEvent(new Event(EVENTO));
}

function ler() {
    try {
        const raw = localStorage.getItem(CHAVE);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function salvar(lista) {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
    emitirEvento();
}

export function obterFila() {
    return ler();
}

export function totalFila() {
    return ler().length;
}

export function limparFila() {
    salvar([]);
}

export function enfileirarPonto(ponto) {
    const fila = ler();

    const item = {
        localId: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
        criadoEmLocal: Date.now(),
        ...ponto,
    };

    fila.push(item);
    salvar(fila);
    return item;
}

export function removerDaFila(localId) {
    const fila = ler().filter((i) => i.localId !== localId);
    salvar(fila);
}

export function substituirFila(novaFila) {
    salvar(novaFila);
}

export const OFFLINE_QUEUE_EVENTO = EVENTO;