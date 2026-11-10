import React from "react";
import styled, { keyframes } from "styled-components";
import { FiZap, FiX, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { db } from "../../services/firebase";
import { doc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContexto";

export default function BannerNovaAtualizacao() {
    const { perfil, usuario, isAdmin } = useAuth();
    const [novaAtualizacao, setNovaAtualizacao] = React.useState(null);
    const [expanded, setExpanded] = React.useState(false);
    const [dispensado, setDispensado] = React.useState(false);

    // Escuta settings/saas para pegar ultimaAtualizacaoId + ultimaVersao
    React.useEffect(() => {
        const unsub = onSnapshot(doc(db, "settings", "saas"), async (snap) => {
            if (!snap.exists()) return;
            const { ultimaAtualizacaoId } = snap.data();
            if (!ultimaAtualizacaoId) return;

            const isUserAdmin = isAdmin || perfil?.role === "admin";
            const userId = usuario?.uid || perfil?.id;

            // Checa se o usuário atual já dispensou esta versão no dispositivo
            if (userId) {
                const lidaUser = localStorage.getItem(`ultimaVersaoLida_${userId}`);
                if (lidaUser === ultimaAtualizacaoId) {
                    setNovaAtualizacao(null);
                    return;
                }
            }

            // Se for admin, também checa se a empresa já marcou como lida globalmente
            if (isUserAdmin && perfil?.companyId) {
                try {
                    const companySnap = await getDoc(doc(db, "companies", perfil.companyId));
                    const ultimaVersaoLida = companySnap.data()?.ultimaVersaoLida;
                    if (ultimaVersaoLida === ultimaAtualizacaoId) {
                        setNovaAtualizacao(null);
                        return;
                    }
                } catch (e) {
                    console.error("Erro ao verificar versão da empresa:", e);
                }
            }

            // Busca o changelog desta versão
            try {
                const changelogSnap = await getDoc(doc(db, "changelog", ultimaAtualizacaoId));
                if (changelogSnap.exists()) {
                    const data = changelogSnap.data();
                    const destinatario = data.destinatario || "TODOS";

                    // Lógica de exibição por público-alvo
                    let mostrar = false;
                    if (destinatario === "TODOS") mostrar = true;
                    else if (destinatario === "ADMIN" && isUserAdmin) mostrar = true;
                    else if (destinatario === "COLABORADOR" && !isUserAdmin) mostrar = true;

                    if (mostrar) {
                        setNovaAtualizacao({ id: ultimaAtualizacaoId, ...data });
                        setDispensado(false);
                    } else {
                        setNovaAtualizacao(null);
                    }
                }
            } catch (e) {
                console.error("Erro ao carregar detalhes da atualização:", e);
            }
        });
        return () => unsub();
    }, [perfil?.companyId, usuario?.uid, isAdmin, perfil?.role]);

    const handleDispensar = async () => {
        setDispensado(true);
        const isUserAdmin = isAdmin || perfil?.role === "admin";
        const userId = usuario?.uid || perfil?.id;

        // Salva leitura individual do usuário
        if (userId && novaAtualizacao?.id) {
            try {
                localStorage.setItem(`ultimaVersaoLida_${userId}`, novaAtualizacao.id);
            } catch (e) {}
        }

        // Se for admin, marca como lida para a empresa também
        if (isUserAdmin && perfil?.companyId && novaAtualizacao?.id) {
            try {
                await updateDoc(doc(db, "companies", perfil.companyId), {
                    ultimaVersaoLida: novaAtualizacao.id
                });
            } catch (e) {
                console.error("Erro ao marcar atualização como lida na empresa:", e);
            }
        }
    };

    if (!novaAtualizacao || dispensado) return null;

    return (
        <Banner>
            <BannerHeader>
                <BannerLeft>
                    <IconZap><FiZap size={14} /></IconZap>
                    <BannerTexto>
                        <strong>Novidade — v{novaAtualizacao.versao}</strong>
                        <span>{novaAtualizacao.titulo}</span>
                    </BannerTexto>
                </BannerLeft>
                <BannerActions>
                    <BtnToggle onClick={() => setExpanded(e => !e)}>
                        {expanded ? <><FiChevronUp size={14} /> Fechar</> : <><FiChevronDown size={14} /> Ver notas</>}
                    </BtnToggle>
                    <BtnFechar onClick={handleDispensar} title="Dispensar">
                        <FiX size={15} />
                    </BtnFechar>
                </BannerActions>
            </BannerHeader>

            {expanded && (
                <NotasExpanded>
                    <pre>{novaAtualizacao.notas}</pre>
                </NotasExpanded>
            )}
        </Banner>
    );
}

const slideDown = keyframes`
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
`;

const Banner = styled.div`
    width: 100%;
    box-sizing: border-box;
    background: linear-gradient(135deg, rgba(47,129,247,0.12), rgba(124,58,237,0.12));
    border: 1px solid rgba(47,129,247,0.25);
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 20px;
    animation: ${slideDown} 0.3s ease;
`;

const BannerHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
`;

const BannerLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const IconZap = styled.div`
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(47,129,247,0.15);
    color: #2f81f7;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const BannerTexto = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    strong { font-size: 13px; font-weight: 700; color: #2f81f7; }
    span { font-size: 13px; color: #e1e1e6; }
`;

const BannerActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const BtnToggle = styled.button`
    display: flex;
    align-items: center;
    gap: 5px;
    background: rgba(47,129,247,0.15);
    border: 1px solid rgba(47,129,247,0.3);
    color: #2f81f7;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { background: rgba(47,129,247,0.25); }
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

const NotasExpanded = styled.div`
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.06);

    pre {
        margin: 0;
        font-size: 13px;
        color: #8d8d99;
        line-height: 1.7;
        white-space: pre-wrap;
        font-family: inherit;
    }
`;
