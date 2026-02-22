import React from "react";
import styled, { keyframes } from "styled-components";
import { FiCamera, FiX, FiCheckCircle, FiAlertTriangle, FiUser } from "react-icons/fi";
import { useFaceApi } from "../../hooks/useFaceApi";
import { useAuth } from "../../contexts/AuthContexto";

const ESTADOS = {
    CARREGANDO_MODELOS: "carregando_modelos",
    SEM_CAMERA: "sem_camera",
    AGUARDANDO: "aguardando",      // câmara ativa, esperando rosto
    PROCESSANDO: "processando",    // capturando/comparando
    SUCESSO: "sucesso",
    ERRO: "erro",
};

export default function FacePontoModal({ tipo, onSucesso, onCancelar }) {
    const { usuario } = useAuth();
    const { modelosCarregados, erroCarga, cadastrarRosto, autenticarRosto } = useFaceApi();

    const videoRef = React.useRef(null);
    const streamRef = React.useRef(null);
    const [estado, setEstado] = React.useState(ESTADOS.CARREGANDO_MODELOS);
    const [mensagem, setMensagem] = React.useState("Carregando modelos de reconhecimento...");
    const [ehEnrollment, setEhEnrollment] = React.useState(false);

    // Inicia câmara quando modelos prontos
    React.useEffect(() => {
        if (!modelosCarregados && !erroCarga) return;

        if (erroCarga) {
            setEstado(ESTADOS.ERRO);
            setMensagem(erroCarga);
            return;
        }

        iniciarCamera();
        return () => pararCamera();
    }, [modelosCarregados, erroCarga]);

    const iniciarCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 640, height: 480 }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setEstado(ESTADOS.AGUARDANDO);
            setMensagem("Posicione seu rosto no centro da câmera e clique em Capturar.");
        } catch (e) {
            setEstado(ESTADOS.SEM_CAMERA);
            setMensagem("Câmera não disponível. Verifique as permissões do navegador.");
        }
    };

    const pararCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const handleCapturar = async () => {
        if (estado !== ESTADOS.AGUARDANDO) return;
        setEstado(ESTADOS.PROCESSANDO);

        try {
            // Tenta autenticar primeiro
            let sucesso;
            try {
                sucesso = await autenticarRosto(videoRef.current, usuario.uid);
            } catch (e) {
                if (e.message === "SEM_CADASTRO") {
                    // Primeiro acesso — faz enrollment
                    setEhEnrollment(true);
                    setMensagem("Primeiro acesso. Cadastrando seu rosto...");
                    await cadastrarRosto(videoRef.current, usuario.uid);
                    sucesso = true; // enrollment = autenticado automaticamente
                } else {
                    throw e;
                }
            }

            if (sucesso) {
                setEstado(ESTADOS.SUCESSO);
                setMensagem(ehEnrollment
                    ? "Rosto cadastrado com sucesso! Ponto registrado."
                    : "Identidade confirmada! Registrando ponto..."
                );
                pararCamera();
                setTimeout(() => onSucesso(), 1200);
            } else {
                setEstado(ESTADOS.ERRO);
                setMensagem("Rosto não reconhecido. Tente novamente ou contate o administrador.");
            }
        } catch (e) {
            setEstado(ESTADOS.ERRO);
            setMensagem(e.message || "Erro ao processar reconhecimento facial.");
        }
    };

    const handleTentar = () => {
        setEstado(ESTADOS.AGUARDANDO);
        setMensagem("Posicione seu rosto no centro da câmera e clique em Capturar.");
    };

    const tipoLabel = {
        ENTRADA: "Entrada",
        INICIO_INTERVALO: "Início Intervalo",
        FIM_INTERVALO: "Fim Intervalo",
        SAIDA: "Saída",
    }[tipo] || tipo;

    return (
        <Overlay>
            <Modal>
                <ModalHeader>
                    <Titulo>
                        <FiCamera size={18} />
                        Registrar — {tipoLabel}
                    </Titulo>
                    <BtnFechar onClick={() => { pararCamera(); onCancelar(); }}>
                        <FiX size={20} />
                    </BtnFechar>
                </ModalHeader>

                <CameraWrapper>
                    <Video ref={videoRef} autoPlay playsInline muted $oculto={estado === ESTADOS.SUCESSO || estado === ESTADOS.ERRO || estado === ESTADOS.SEM_CAMERA} />

                    {/* Overlay de estados */}
                    {(estado === ESTADOS.CARREGANDO_MODELOS || estado === ESTADOS.PROCESSANDO) && (
                        <StatusOverlay>
                            <Spinner />
                        </StatusOverlay>
                    )}

                    {estado === ESTADOS.SUCESSO && (
                        <StatusOverlay $cor="sucesso">
                            <FiCheckCircle size={56} color="#2ecc71" />
                        </StatusOverlay>
                    )}

                    {(estado === ESTADOS.ERRO || estado === ESTADOS.SEM_CAMERA) && (
                        <StatusOverlay $cor="erro">
                            <FiAlertTriangle size={48} color="#eb4d4b" />
                        </StatusOverlay>
                    )}

                    {estado === ESTADOS.AGUARDANDO && (
                        <Guia>
                            <GuiaCirculo />
                        </Guia>
                    )}
                </CameraWrapper>

                <Mensagem $estado={estado}>{mensagem}</Mensagem>

                <ModalFooter>
                    {estado === ESTADOS.AGUARDANDO && (
                        <BtnCapturar onClick={handleCapturar}>
                            <FiUser size={16} />
                            Capturar
                        </BtnCapturar>
                    )}

                    {estado === ESTADOS.ERRO && (
                        <BtnCapturar onClick={handleTentar}>
                            Tentar novamente
                        </BtnCapturar>
                    )}

                    <BtnCancelar onClick={() => { pararCamera(); onCancelar(); }}>
                        Cancelar
                    </BtnCancelar>
                </ModalFooter>
            </Modal>
        </Overlay>
    );
}

/* ── Styled ─────────────────────────────────────── */

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    backdrop-filter: blur(6px);
    animation: fadeIn 0.2s ease;

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;

const Modal = styled.div`
    background: #1c1c1e;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    width: 100%;
    max-width: 420px;
    overflow: hidden;
    animation: slideUp 0.3s ease;

    @keyframes slideUp {
        from { transform: translateY(40px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
`;

const Titulo = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
`;

const BtnFechar = styled.button`
    background: transparent;
    border: none;
    color: #8d8d99;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    &:hover { color: #fff; }
`;

const CameraWrapper = styled.div`
    position: relative;
    width: 100%;
    aspect-ratio: 4/3;
    background: #000;
    overflow: hidden;
`;

const Video = styled.video`
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1); /* espelha como câmara frontal */
    display: ${p => p.$oculto ? "none" : "block"};
`;

const StatusOverlay = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${p =>
        p.$cor === "sucesso" ? "rgba(46,204,113,0.15)" :
            p.$cor === "erro" ? "rgba(235,77,75,0.15)" :
                "rgba(0,0,0,0.6)"};
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255,255,255,0.1);
    border-top-color: #4facfe;
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
`;

const Guia = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
`;

const pulse = keyframes`
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.04); }
`;

const GuiaCirculo = styled.div`
    width: 180px;
    height: 220px;
    border: 2px dashed rgba(79,172,254,0.7);
    border-radius: 50%;
    animation: ${pulse} 2s ease-in-out infinite;
`;

const Mensagem = styled.p`
    text-align: center;
    font-size: 13px;
    line-height: 1.6;
    padding: 14px 20px 10px;
    margin: 0;
    color: ${p =>
        p.$estado === "sucesso" ? "#2ecc71" :
            p.$estado === "erro" ? "#eb4d4b" :
                "#8d8d99"};
`;

const ModalFooter = styled.div`
    display: flex;
    gap: 10px;
    padding: 12px 20px 20px;
`;

const BtnCapturar = styled.button`
    flex: 1;
    height: 48px;
    background: linear-gradient(135deg, #4facfe, #00f2fe);
    color: #111;
    border: 0;
    border-radius: 12px;
    font-weight: 700;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: filter 0.2s;

    &:hover { filter: brightness(1.1); }
`;

const BtnCancelar = styled.button`
    height: 48px;
    padding: 0 20px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #8d8d99;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(255,255,255,0.1);
        color: #fff;
    }
`;
