import React from "react";
import styled, { keyframes } from "styled-components";
import { FiX, FiSend, FiClock, FiPaperclip } from "react-icons/fi";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContexto";
import { useConfig } from "../../contexts/ConfigContexto";
import SeletorAcordeao from "../SeletorAcordeao";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

const TIPOS = [
    { value: "ENTRADA", label: "Entrada" },
    { value: "INICIO_INTERVALO", label: "Início Intervalo" },
    { value: "FIM_INTERVALO", label: "Fim Intervalo" },
    { value: "SAIDA", label: "Saída" },
    { value: "ABONO_FALTA", label: "Abono de Falta (Dia Inteiro)" },
];

export const MOTIVOS_JUSTIFICATIVA = [
    { value: "ESQUECI_PONTO", label: "Esqueci de bater o ponto" },
    { value: "PROBLEMAS_TECNICOS", label: "Problemas lógicos e técnicos" },
    { value: "EMERGENCIA_FORCA_MAIOR", label: "Emergência ou Força maior" },
    { value: "ASSEMBLEIA", label: "Assembleia" },
    { value: "ATESTADO_MEDICO", label: "Atestado médico/odontológico" },
    { value: "PARALISACAO", label: "Paralização" },
    { value: "FORMACAO", label: "Formação" },
    { value: "LICENCA_GALA", label: "Licença Gala (casamento)" },
    { value: "LICENCA_PATERNIDADE_MATERNIDADE", label: "Licença Paternidade/Maternidade" },
    { value: "LICENCA_LUTO", label: "Licença Luto" },
    { value: "CONVOCACAO_JUDICIAL_ELEITORAL", label: "Convocação Judicial ou Eleitoral" },
    { value: "DOACAO_SANGUE", label: "Doação de Sangue" },
    { value: "OUTROS", label: "Outros" }
];

const PRECISA_ANEXO = [
    "ATESTADO_MEDICO",
    "LICENCA_GALA",
    "LICENCA_PATERNIDADE_MATERNIDADE",
    "LICENCA_LUTO"
];

export default function ModalJustificativa({ aberto, onFechar, editandoObj = null }) {
    const { usuario, perfil } = useAuth();
    const { config } = useConfig();

    const tiposFiltrados = React.useMemo(() => {
        if (!config?.regras?.pontosAtivos) return TIPOS;
        return TIPOS.filter(t => {
            if (t.value === "ABONO_FALTA") return true;
            if (t.value === "ENTRADA") return config.regras.pontosAtivos.includes('entrada');
            if (t.value === "SAIDA") return config.regras.pontosAtivos.includes('saida');
            if (t.value === "INICIO_INTERVALO") return config.regras.pontosAtivos.includes('intervalo_saida');
            if (t.value === "FIM_INTERVALO") return config.regras.pontosAtivos.includes('intervalo_entrada');
            return true;
        });
    }, [config?.regras?.pontosAtivos]);

    const [tipo, setTipo] = React.useState("ENTRADA");
    const [motivo, setMotivo] = React.useState("ESQUECI_PONTO");
    const [dataHora, setDataHora] = React.useState("");
    const [texto, setTexto] = React.useState("");
    const [enviando, setEnviando] = React.useState(false);

    const [anexoBase64, setAnexoBase64] = React.useState(null);
    const [nomeArquivo, setNomeArquivo] = React.useState("");
    const fileInputRef = React.useRef(null);

    // Pre-fill datetime with now when modal opens
    React.useEffect(() => {
        if (aberto) {
            if (editandoObj) {
                setTipo(editandoObj.tipo || "ENTRADA");
                setDataHora(editandoObj.dataHoraSolicitada || "");
                setTexto(editandoObj.justificativa || "");
                setMotivo(editandoObj.motivo || "ESQUECI_PONTO");
                setAnexoBase64(editandoObj.anexoUrl || null);
                setNomeArquivo(editandoObj.anexoNome || "");
            } else {
                const now = new Date();
                now.setSeconds(0, 0);
                setDataHora(format(now, "yyyy-MM-dd'T'HH:mm"));
                setTexto("");
                setTipo("ENTRADA");
                setMotivo("ESQUECI_PONTO");
                setAnexoBase64(null);
                setNomeArquivo("");
            }
        }
    }, [aberto, editandoObj]);

    const precisaAnexo = React.useMemo(() => PRECISA_ANEXO.includes(motivo), [motivo]);

    const lidarComUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Verifica tipo
        if (!file.type.startsWith("image/")) {
            toast.error("Por favor, envie apenas imagens (JPG, PNG).");
            return;
        }

        // Comprime a imagem gerando um base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                const MAX_W = 1000;
                const MAX_H = 1000;
                let w = img.width;
                let h = img.height;

                if (w > h) {
                    if (w > MAX_W) { h *= MAX_W / w; w = MAX_W; }
                } else {
                    if (h > MAX_H) { w *= MAX_H / h; h = MAX_H; }
                }

                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);

                const dataUrl = canvas.toDataURL("image/jpeg", 0.6); // comprime 60% qualidade

                // O Firebase DB tem limite de 1MB por documento inteiro.
                // 1MB em base64 é aprox 1.332.000 caracteres.
                if (dataUrl.length > 900000) {
                    toast.error("Imagem muito grande mesmo após compressão. Tire outra foto mais simples.");
                    return;
                }

                setAnexoBase64(dataUrl);
                setNomeArquivo(file.name);
            };
        };
    };

    const handleEnviar = async () => {
        if (!texto.trim() || texto.trim().length < 10) {
            toast.error("Descreva o motivo com pelo menos 10 caracteres.");
            return;
        }
        if (tipo !== "ABONO_FALTA" && !dataHora) {
            toast.error("Informe a data e horário do ponto esquecido.");
            return;
        }
        if (tipo === "ABONO_FALTA" && !dataHora) {
            toast.error("Informe a data da falta a ser abonada.");
            return;
        }
        if (precisaAnexo && !anexoBase64) {
            toast.error("Este tipo de justificativa requer um anexo (atestado/documento).");
            return;
        }

        setEnviando(true);
        try {
            const payload = {
                userId: usuario.uid,
                userName: perfil?.nome || usuario.email,
                companyId: perfil?.companyId || null,
                tipo,
                dataHoraSolicitada: dataHora,
                justificativa: texto.trim(),
                motivo: motivo,
                status: "pendente",
                criadoEm: editandoObj ? editandoObj.criadoEm : serverTimestamp(),
                editadoEm: editandoObj ? serverTimestamp() : null,
                avaliadoPor: null,
                avaliadoEm: null,
                motivoRejeicao: null,
                anexoUrl: anexoBase64, // Enviando string base64 direto pro DB
                anexoNome: nomeArquivo,
            };

            if (editandoObj) {
                await updateDoc(doc(db, "justificativas", editandoObj.id), payload);
                toast.success("Justificativa atualizada com sucesso!");
            } else {
                await addDoc(collection(db, "justificativas"), payload);
                if (anexoBase64) {
                    toast.success("Justificativa e anexo entregues para o RH!");
                } else {
                    toast.success("Justificativa enviada! Aguarde a aprovação do administrador.");
                }
            }
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
        <Overlay>
            <Modal>
                <Header>
                    <Titulo>
                        <FiClock size={18} />
                        {editandoObj ? "Editar Justificativa" : "Justificar Ponto Esquecido"}
                    </Titulo>
                    <BtnFechar onClick={onFechar}><FiX size={20} /></BtnFechar>
                </Header>

                <Corpo>
                    <Label>Tipo de ponto esquecido</Label>
                    <ChipsRow>
                        {tiposFiltrados.map(t => (
                            <Chip
                                key={t.value}
                                $ativo={tipo === t.value}
                                onClick={() => setTipo(t.value)}
                            >
                                {t.label}
                            </Chip>
                        ))}
                    </ChipsRow>

                    <Label style={{ marginTop: 20 }}>
                        {tipo === "ABONO_FALTA" ? "Data da falta (o horário será ignorado)" : "Data e horário do ponto"}
                    </Label>
                    <Input
                        type="datetime-local"
                        value={dataHora}
                        onChange={e => setDataHora(e.target.value)}
                        max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    />

                    <Label style={{ marginTop: 20 }}>Motivo / Justificativa</Label>
                    <SeletorAcordeao
                        opcoes={MOTIVOS_JUSTIFICATIVA}
                        value={motivo}
                        onChange={setMotivo}
                    />

                    <Label style={{ marginTop: 20 }}>Observações Adicionais (Opcional)</Label>
                    <Textarea
                        placeholder="Descreva mais detalhes se necessário..."
                        value={texto}
                        onChange={e => setTexto(e.target.value)}
                        maxLength={400}
                        rows={4}
                    />
                    <Contador $aviso={texto.length > 350}>{texto.length}/400</Contador>

                    {precisaAnexo && (
                        <>
                            <Label style={{ marginTop: 10 }}>Anexar Atestado / Documento (Obrigatório)</Label>
                            <AnexoUploadWrapper>
                                <BtnUpload type="button" onClick={() => fileInputRef.current?.click()}>
                                    <FiPaperclip size={16} />
                                    {nomeArquivo ? "Trocar imagem" : "Selecionar imagem do documento"}
                                </BtnUpload>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    style={{ display: "none" }}
                                    onChange={lidarComUpload}
                                />
                                {nomeArquivo && <NomeArquivo>Anexado: <strong>{nomeArquivo}</strong></NomeArquivo>}
                                {anexoBase64 && <PreviewImg src={anexoBase64} />}
                            </AnexoUploadWrapper>
                        </>
                    )}

                    <BtnEnviar onClick={handleEnviar} disabled={enviando} style={{ marginTop: 20 }}>
                        <FiSend size={16} />
                        {enviando ? "Enviando..." : editandoObj ? "Atualizar Justificativa" : "Enviar Justificativa"}
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
    background: rgba(0,0,0,0.85);
    z-index: 9000;
    display: flex;
    align-items: flex-end; /* Bottom sheet on mobile */
    justify-content: center;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
    
    @media (min-width: 600px) {
        align-items: center;
        padding: 20px;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const Modal = styled.div`
    background: #1c1c1e;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px 24px 0 0;
    width: 100%;
    max-width: 540px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    padding-bottom: env(safe-area-inset-bottom, 20px);
    animation: slideUpMobile 0.4s cubic-bezier(0, 0.55, 0.45, 1);

    @media (min-width: 600px) {
        border-radius: 24px;
        max-height: 90vh;
        animation: slideUpDesktop 0.3s ease-out;
    }

    @keyframes slideUpMobile {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
    }

    @keyframes slideUpDesktop {
        from { transform: translateY(30px); opacity: 0; }
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
    overflow-y: auto;
    flex: 1;

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
    }
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
    height: 100px;
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
    flex-shrink: 0;
    &:hover:not(:disabled) { filter: brightness(1.08); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Select = styled.select`
    width: 100%;
    background: rgba(255,255,255,0.05);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 12px 16px;
    color: #fff;
    font-size: 14px;
    outline: none;
    cursor: pointer;
    box-sizing: border-box;
    &:focus { border-color: #4facfe; }

    option {
        background: #111;
        color: #fff;
    }
`;

const AnexoUploadWrapper = styled.div`
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const BtnUpload = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 48px;
    border-radius: 12px;
    background: transparent;
    border: 1.5px dashed rgba(255,255,255,0.3);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(255,255,255,0.05);
        border-color: #4facfe;
        color: #4facfe;
    }
`;

const NomeArquivo = styled.div`
    font-size: 12px;
    color: #2ecc71;
    display: flex;
    align-items: center;
`;

const PreviewImg = styled.img`
    width: 100%;
    max-height: 140px;
    object-fit: cover;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
    opacity: 0.8;
`;
