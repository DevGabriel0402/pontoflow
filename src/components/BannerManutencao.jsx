import React from "react";
import styled, { keyframes } from "styled-components";
import { FiAlertTriangle, FiLogOut } from "react-icons/fi";
import { useSaasConfig } from "../contexts/ConfigContexto";
import { useAuth } from "../contexts/AuthContexto";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";

const TOAST_ID = "manutencao-toast";

export default function BannerManutencao() {
    const { modoManutencao } = useSaasConfig();
    const { usuario, logout } = useAuth();
    const location = useLocation();

    const naLoginPage = location.pathname === "/login";
    const naMasterPage = location.pathname.startsWith("/master");
    const rotaIsenta = naLoginPage || naMasterPage;

    // Efeito: toast persistente quando estiver no /login
    React.useEffect(() => {
        if (modoManutencao && naLoginPage && !naMasterPage) {
            toast("⚠️ Sistema em manutenção. Acesso temporariamente indisponível.", {
                id: TOAST_ID,
                duration: Infinity,
                icon: null,
                style: {
                    background: "#1c1c1f",
                    color: "#f5f5f5",
                    border: "1px solid rgba(245,158,11,0.4)",
                    fontSize: "14px",
                    maxWidth: "420px",
                },
            });
        } else {
            toast.dismiss(TOAST_ID);
        }

        return () => toast.dismiss(TOAST_ID);
    }, [modoManutencao, naLoginPage, naMasterPage]);

    // Rotas isentas: apenas toast (login) ou nada (master)
    if (!modoManutencao || rotaIsenta) return null;

    const handleSair = async () => {
        await logout();
        window.location.href = "/login";
    };

    return (
        <Overlay>
            <Card>
                <IconWrapper>
                    <FiAlertTriangle size={40} />
                </IconWrapper>
                <Titulo>Sistema em Manutenção</Titulo>
                <Descricao>
                    Estamos realizando melhorias. O sistema estará disponível em breve.<br />
                    Agradecemos a compreensão.
                </Descricao>
                {usuario && (
                    <BotaoSair onClick={handleSair}>
                        <FiLogOut size={16} />
                        Sair da conta
                    </BotaoSair>
                )}
            </Card>
        </Overlay>
    );
}

const pulseIcon = keyframes`
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
`;

const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(10, 10, 12, 0.92);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ${fadeIn} 0.3s ease;
`;

const Card = styled.div`
    background: #1c1c1f;
    border: 1px solid rgba(245, 158, 11, 0.35);
    border-radius: 20px;
    padding: 48px 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    max-width: 460px;
    width: 90%;
    box-shadow: 0 0 60px rgba(245, 158, 11, 0.15);
    text-align: center;
`;

const IconWrapper = styled.div`
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(245, 158, 11, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f59e0b;
    margin-bottom: 8px;
    animation: ${pulseIcon} 2.5s ease-in-out infinite;
`;

const Titulo = styled.h2`
    font-size: 22px;
    font-weight: 700;
    color: #f5f5f5;
    margin: 0;
`;

const Descricao = styled.p`
    font-size: 14px;
    color: #8d8d99;
    line-height: 1.7;
    margin: 0;
`;

const BotaoSair = styled.button`
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #8d8d99;
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        border-color: #eb4d4b;
        color: #eb4d4b;
        background: rgba(235, 77, 75, 0.08);
    }
`;
