import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { FiX, FiCheck } from "react-icons/fi";
import { db } from "../../services/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";

export default function ModalEditarAdmin({ aberto, onFechar, admin, onAtualizado, companies = [] }) {
    const [nome, setNome] = useState("");
    const [telefone, setTelefone] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (admin) {
            setNome(admin.nome || "");
            setTelefone(admin.telefone || "");
            setCompanyId(admin.companyId || "");
        }
    }, [admin]);

    const handleSalvar = async (e) => {
        e.preventDefault();
        if (!admin?.id) return;

        setSalvando(true);
        try {
            await updateDoc(doc(db, "users", admin.id), {
                nome: nome.trim(),
                telefone: telefone.trim(),
                companyId: companyId,
                atualizadoEm: serverTimestamp()
            });
            toast.success("Dados do administrador atualizados!");
            onAtualizado();
            onFechar();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar dados.");
        } finally {
            setSalvando(false);
        }
    };

    if (!aberto || !admin) return null;

    return (
        <Overlay>
            <ModalConteudo>
                <Header>
                    <h3>Editar Administrador</h3>
                    <BotaoFechar onClick={onFechar}><FiX size={20} /></BotaoFechar>
                </Header>

                <Formulario onSubmit={handleSalvar}>
                    <Corpo>
                        <InputGroup>
                            <label>Nome Completo</label>
                            <input
                                placeholder="Nome do Admin"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                required
                            />
                        </InputGroup>
                        <InputGroup>
                            <label>Telefone (Opcional)</label>
                            <input
                                placeholder="(00) 00000-0000"
                                value={telefone}
                                onChange={(e) => setTelefone(e.target.value)}
                            />
                        </InputGroup>
                        <InputGroup>
                            <label>Empresa Administrada</label>
                            <select
                                value={companyId}
                                onChange={(e) => setCompanyId(e.target.value)}
                                required
                            >
                                <option value="" disabled>Selecione uma empresa</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.nome} ({c.id})
                                    </option>
                                ))}
                            </select>
                        </InputGroup>
                        <AlertBox>
                            O e-mail de acesso não pode ser alterado por aqui por questões de segurança de autenticação.
                        </AlertBox>
                    </Corpo>

                    <Footer>
                        <BotaoGhost type="button" onClick={onFechar}>Cancelar</BotaoGhost>
                        <BotaoPrincipal type="submit" disabled={salvando || !nome.trim() || !companyId}>
                            {salvando ? "Salvando..." : <><FiCheck /> Salvar</>}
                        </BotaoPrincipal>
                    </Footer>
                </Formulario>
            </ModalConteudo>
        </Overlay>
    );
}

/* Styled Components */
const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
`;

const ModalConteudo = styled.div`
    background: #19191b;
    width: 100%;
    max-width: 480px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
`;

const Header = styled.div`
    padding: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    h3 { margin: 0; font-size: 18px; font-weight: 700; color: #fff; }
`;

const BotaoFechar = styled.button`
    background: transparent;
    border: 0;
    color: #8d8d99;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover { color: #fff; }
`;

const Formulario = styled.form`
    display: flex;
    flex-direction: column;
`;

const Corpo = styled.div`
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    label { font-size: 12px; font-weight: 600; color: #8d8d99; }

    input, select {
        background: #121214;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        height: 44px;
        padding: 0 16px;
        color: #fff;
        outline: none;
        font-size: 14px;
        transition: border-color 0.2s;

        &:focus { border-color: #2f81f7; }
    }

    select {
        cursor: pointer;
        padding: 0 12px;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238d8d99' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
    }
`;

const AlertBox = styled.div`
    background: rgba(245, 158, 11, 0.1);
    border-left: 3px solid #f59e0b;
    padding: 12px 16px;
    font-size: 12px;
    color: #ffdcb5;
    border-radius: 4px;
    margin-top: 8px;
`;

const Footer = styled.div`
    padding: 20px 24px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const BotaoPrincipal = styled.button`
    height: 40px;
    padding: 0 20px;
    background: #2f81f7;
    color: #fff;
    border: 0;
    border-radius: 8px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const BotaoGhost = styled.button`
    height: 40px;
    padding: 0 20px;
    background: transparent;
    color: #8d8d99;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    &:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }
`;
