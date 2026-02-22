import React from "react";
import styled, { keyframes } from "styled-components";
import { FiX, FiSend, FiClock } from "react-icons/fi";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContexto";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

const TIPOS = [
    { value: "ENTRADA", label: "Entrada" },
    { value: "INICIO_INTERVALO", label: "Início Intervalo" },
    { value: "FIM_INTERVALO", label: "Fim Intervalo" },
    { value: "SAIDA", label: "Saída" },
];

export default function ModalJustificativa({ aberto, onFechar }) {
    const { usuario, perfil } = useAuth();
    const [tipo, setTipo] = React.useState("ENTRADA");
    const [dataHora, setDataHora] = React.useState("");
    const [texto, setTexto] = React.useState("");
    const [enviando, setEnviando] = React.useState(false);

    // Pre-fill datetime with now when modal opens
    React.useEffect(() => {
        if (aberto) {
            const now = new Date();
            now.setSeconds(0, 0);
            setDataHora(format(now, "yyyy-MM-dd'T'HH:mm"));
            setTexto("");
            setTipo("ENTRADA");
        }
    }, [aberto]);

    const handleEnviar = async () => {
        if (!texto.trim() || texto.trim().length < 10) {
            toast.error("Descreva o motivo com pelo menos 10 caracteres.");
            return;
        }
        if (!dataHora) {
            toast.error("Informe a data e horário do ponto esquecido.");
            return;
        }
        setEnviando(true);
        try {
            await addDoc(collection(db, "justificativas"), {
                userId: usuario.uid,
                userName: perfil?.nome || usuario.email,
                companyId: perfil?.companyId || null,
                tipo,
                dataHoraSolicitada: dataHora,
                justificativa: texto.trim(),
                status: "pendente",
                criadoEm: serverTimestamp(),
                avaliadoPor: null,
                avaliadoEm: null,
                motivoRejeicao: null,
            });
            toast.success("Justificativa enviada! Aguarde a aprovação do administrador.");
            onFechar();
        } catch (e) {
            console.error(e);
            toast.error("Erro ao enviar. Tente novamente.");
        } finally {
            setEnviando(false);
        }
    };

    if (!aberto) return null;

    return (
        <Overlay onClick={(e) => e.target === e.currentTarget && onFechar()}>
            <Modal>
                <Header>
                    <Titulo>
                        <FiClock size={18} />
                        Justificar Ponto Esquecido
                    </Titulo>
                    <BtnFechar onClick={onFechar}><FiX size={20} /></BtnFechar>
                </Header>

                <Corpo>
                    <Label>Tipo de ponto esquecido</Label>
                    <ChipsRow>
                        {TIPOS.map(t => (
                            <Chip
                                key={t.value}
                                $ativo={tipo === t.value}
                                onClick={() => setTipo(t.value)}
                            >
                                {t.label}
                            </Chip>
                        ))}
                    </ChipsRow>

                    <Label style={{ marginTop: 20 }}>Data e horário do ponto</Label>
                    <Input
                        type="datetime-local"
                        value={dataHora}
                        onChange={e => setDataHora(e.target.value)}
                        max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    />

                    <Label style={{ marginTop: 20 }}>Motivo / Justificativa</Label>
                    <Textarea
                        placeholder="Descreva o que aconteceu e por que não foi possível registrar o ponto..."
                        value={texto}
                        onChange={e => setTexto(e.target.value)}
                        maxLength={400}
                        rows={4}
                    />
                    <Contador $aviso={texto.length > 350}>{texto.length}/400</Contador>

                    <BtnEnviar onClick={handleEnviar} disabled={enviando}>
                        <FiSend size={16} />
                        {enviando ? "Enviando..." : "Enviar Justificativa"}
                    </BtnEnviar>
                </Corpo>
            </Modal>
        </Overlay>
    );
}

/* ── Styled ─────────────────────────── */

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    z-index: 9000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const Modal = styled.div`
    background: #1c1c1e;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px 24px 0 0;
    width: 100%;
    max-width: 540px;
    padding-bottom: env(safe-area-inset-bottom, 16px);
    animation: slideUp 0.3s ease;
    @keyframes slideUp {
        from { transform: translateY(80px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 20px 0;
`;

const Titulo = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
`;

const BtnFechar = styled.button`
    background: transparent;
    border: none;
    color: #8d8d99;
    cursor: pointer;
    display: flex;
    align-items: center;
    &:hover { color: #fff; }
`;

const Corpo = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
`;

const Label = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: #8d8d99;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
`;

const ChipsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const Chip = styled.button`
    padding: 8px 16px;
    border-radius: 20px;
    border: 1.5px solid ${p => p.$ativo ? "#4facfe" : "rgba(255,255,255,0.12)"};
    background: ${p => p.$ativo ? "rgba(79,172,254,0.15)" : "transparent"};
    color: ${p => p.$ativo ? "#4facfe" : "#8d8d99"};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    &:hover { border-color: #4facfe; color: #4facfe; }
`;

const Input = styled.input`
    width: 100%;
    background: rgba(255,255,255,0.05);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 12px 16px;
    color: #fff;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    &:focus { border-color: #4facfe; }
    color-scheme: dark;
`;

const Textarea = styled.textarea`
    width: 100%;
    background: rgba(255,255,255,0.05);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 12px 16px;
    color: #fff;
    font-size: 14px;
    resize: vertical;
    outline: none;
    font-family: inherit;
    line-height: 1.6;
    box-sizing: border-box;
    &:focus { border-color: #4facfe; }
`;

const Contador = styled.div`
    text-align: right;
    font-size: 11px;
    color: ${p => p.$aviso ? "#f39c12" : "#555"};
    margin-top: 4px;
    margin-bottom: 20px;
`;

const BtnEnviar = styled.button`
    height: 52px;
    background: linear-gradient(135deg, #4facfe, #00f2fe);
    color: #111;
    border: 0;
    border-radius: 14px;
    font-weight: 800;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    transition: filter 0.2s;
    &:hover:not(:disabled) { filter: brightness(1.08); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
