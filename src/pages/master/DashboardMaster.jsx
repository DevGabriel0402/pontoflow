import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { FiGrid, FiSettings, FiArrowLeft, FiPlus, FiBriefcase, FiActivity, FiDollarSign, FiSearch, FiEdit2, FiLock, FiUnlock, FiZap, FiCheckCircle, FiClock, FiMessageSquare, FiFileText } from "react-icons/fi";
import { db } from "../../services/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { FiSave, FiInfo, FiTag, FiPhone, FiMail, FiChevronDown, FiChevronUp, FiTrash, FiMove, FiBold, FiType, FiMaximize, FiArchive, FiLogOut } from "react-icons/fi";
import LoadingGlobal from "../../components/LoadingGlobal";
import { useMasterCompanies } from "../../hooks/useMasterCompanies";
import { useAuth } from "../../contexts/AuthContexto";
import ModalNovaEmpresa from "../../components/master/ModalNovaEmpresa";
import TabbarMasterMobile from "../../components/master/TabbarMasterMobile";
import AbaAdminsMaster from "../../components/master/AbaAdminsMaster";
import ChatSuporte from "../../components/ChatSuporte";
import { INITIAL_MANUAL_DATA } from "../../utils/manualTemplate";

/* --- COMPONENTES DO EDITOR VISUAL DO MANUAL --- */

const EditorContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 10px;
`;

const SecaoCard = styled.div`
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    overflow: hidden;
`;

const SecaoHeader = styled.div`
    padding: 16px;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: background 0.2s;
    &:hover { background: rgba(255, 255, 255, 0.04); }
`;

const ElementoCard = styled.div`
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    margin-bottom: 12px;
`;

const InputEditor = styled.input`
    background: #0a0a0c;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    width: 100%;
    &:focus { border-color: #2f81f7; outline: none; }
`;

const SeletorWrapper = styled.div`
    position: relative;
    width: 100%;
`;

const SeletorHeader = styled.div`
    background: #0a0a0c;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s;
    &:hover { border-color: #2f81f7; background: rgba(255,255,255,0.02); }
`;

const SeletorLista = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #19191b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    margin-top: 4px;
    z-index: 1000;
    max-height: 250px;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    backdrop-filter: blur(10px);
`;

const SeletorOpcao = styled.div`
    padding: 10px 12px;
    font-size: 13px;
    cursor: pointer;
    color: ${props => props.$ativo ? '#2f81f7' : '#fff'};
    background: ${props => props.$ativo ? 'rgba(47, 129, 247, 0.1)' : 'transparent'};
    font-weight: ${props => props.$ativo ? '700' : '400'};
    display: flex;
    align-items: center;
    justify-content: space-between;
    &:hover { background: rgba(255, 255, 255, 0.05); }
`;

const SeletorEditor = ({ value, onChange, opcoes }) => {
    const [aberto, setAberto] = React.useState(false);
    const selecionado = opcoes.find(o => o.value === value) || opcoes[0];

    return (
        <SeletorWrapper>
            <SeletorHeader onClick={() => setAberto(!aberto)}>
                {selecionado?.label}
                {aberto ? <FiChevronUp /> : <FiChevronDown />}
            </SeletorHeader>
            {aberto && (
                <>
                    <div 
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                        onClick={() => setAberto(false)} 
                    />
                    <SeletorLista>
                        {opcoes.map(op => (
                            <SeletorOpcao 
                                key={op.value} 
                                $ativo={op.value === value}
                                onClick={() => {
                                    onChange({ target: { value: op.value } });
                                    setAberto(false);
                                }}
                            >
                                {op.label}
                                {op.value === value && <FiCheckCircle size={12} />}
                            </SeletorOpcao>
                        ))}
                    </SeletorLista>
                </>
            )}
        </SeletorWrapper>
    );
};

const TextareaEditor = styled.textarea`
    background: #0a0a0c;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    width: 100%;
    resize: vertical;
    min-height: 80px;
    font-family: inherit;
    &:focus { border-color: #2f81f7; outline: none; }
`;

const Topbar = styled.header`
    display: none;
    @media (max-width: 900px) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
        height: 60px;
        background: #19191b;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        position: sticky;
        top: 0;
        z-index: 1001;
        width: 100%;
    }
`;

const TopbarActions = styled.div`
    display: flex;
    gap: 12px;
`;

const BotaoTopo = styled.button`
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    width: 38px;
    height: 38px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    &:hover { background: rgba(255, 255, 255, 0.1); }
`;

const EditorElemento = ({ element, onUpdate, onRemove }) => {
    return (
        <ElementoCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#2f81f7', fontWeight: '900', background: 'rgba(47, 129, 247, 0.1)', padding: '2px 8px', borderRadius: '100px' }}>
                    {element.type === 'paragraph' ? 'PARÁGRAFO' : element.type.toUpperCase()}
                </span>
                <FiTrash style={{ cursor: 'pointer', color: '#eb4d4b', fontSize: '14px' }} onClick={() => onRemove(element.id)} />
            </div>

            {element.type === 'paragraph' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <TextareaEditor 
                        value={element.value} 
                        onChange={e => onUpdate(element.id, { value: e.target.value })} 
                        placeholder="Descreva o conteúdo..."
                    />
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                         <div>
                            <label style={{ fontSize: '10px', color: '#8d8d99', display: 'block', marginBottom: '4px' }}>Peso da Fonte</label>
                            <SeletorEditor 
                                value={element.style?.weight} 
                                onChange={e => onUpdate(element.id, { style: { ...element.style, weight: e.target.value } })}
                                opcoes={[
                                    { value: "400", label: "Regular (400)" },
                                    { value: "500", label: "Medium (500)" },
                                    { value: "600", label: "Semi-Bold (600)" },
                                    { value: "700", label: "Bold (700)" },
                                    { value: "800", label: "Extra-Bold (800)" }
                                ]}
                            />
                         </div>
                         <div>
                            <label style={{ fontSize: '10px', color: '#8d8d99', display: 'block', marginBottom: '4px' }}>Tamanho</label>
                            <SeletorEditor 
                                value={element.style?.size} 
                                onChange={e => onUpdate(element.id, { style: { ...element.style, size: e.target.value } })}
                                opcoes={[
                                    { value: "13px", label: "Pequeno (13px)" },
                                    { value: "15px", label: "Médio (15px)" },
                                    { value: "16px", label: "Padrão (16px)" },
                                    { value: "18px", label: "Grande (18px)" },
                                    { value: "24px", label: "Sub-título (24px)" }
                                ]}
                            />
                         </div>
                         <div>
                            <label style={{ fontSize: '10px', color: '#8d8d99', display: 'block', marginBottom: '4px' }}>Cor do Texto</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="color" value={element.style?.color} onChange={e => onUpdate(element.id, { style: { ...element.style, color: e.target.value } })} style={{ background: 'none', border: 'none', width: '30px', height: '30px', cursor: 'pointer' }} />
                                <span style={{ fontSize: '11px', color: '#fff', opacity: '0.6' }}>{element.style?.color}</span>
                            </div>
                         </div>
                    </div>
                </div>
            )}

            {element.type === 'grid' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {element.items?.map((item, i) => (
                        <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#8d8d99' }}>ITEM {i + 1}</span>
                                <FiTrash style={{ cursor: 'pointer', color: '#eb4d4b', fontSize: '12px' }} onClick={() => {
                                    const next = element.items.filter((_, idx) => idx !== i);
                                    onUpdate(element.id, { items: next });
                                }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <InputEditor 
                                    value={item.title} 
                                    onChange={e => {
                                        const next = [...element.items];
                                        next[i] = { ...item, title: e.target.value };
                                        onUpdate(element.id, { items: next });
                                    }}
                                    placeholder="Título do item..."
                                />
                                <TextareaEditor 
                                    value={item.description} 
                                    onChange={e => {
                                        const next = [...element.items];
                                        next[i] = { ...item, description: e.target.value };
                                        onUpdate(element.id, { items: next });
                                    }}
                                    placeholder="Descrição do item..."
                                    style={{ height: '60px' }}
                                />
                            </div>
                        </div>
                    ))}
                    <BotaoGhost onClick={() => onUpdate(element.id, { items: [...(element.items || []), { title: 'Novo Item', description: 'Descrição aqui...' }] })}>
                        <FiPlus /> Adicionar Item ao Grid
                    </BotaoGhost>
                </div>
            )}

            {element.type === 'steps' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {element.items?.map((step, i) => (
                        <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f1c40f' }}>PASSO {step.number}</span>
                                <FiTrash style={{ cursor: 'pointer', color: '#eb4d4b', fontSize: '12px' }} onClick={() => {
                                    const next = element.items.filter((_, idx) => idx !== i);
                                    onUpdate(element.id, { items: next });
                                }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <InputEditor 
                                        value={step.number} 
                                        onChange={e => {
                                            const next = [...element.items];
                                            next[i] = { ...step, number: e.target.value };
                                            onUpdate(element.id, { items: next });
                                        }}
                                        style={{ width: '50px', textAlign: 'center' }}
                                    />
                                    <InputEditor 
                                        value={step.title} 
                                        onChange={e => {
                                            const next = [...element.items];
                                            next[i] = { ...step, title: e.target.value };
                                            onUpdate(element.id, { items: next });
                                        }}
                                        placeholder="Título do passo..."
                                        style={{ flex: 1 }}
                                    />
                                </div>
                                <TextareaEditor 
                                    value={step.description} 
                                    onChange={e => {
                                        const next = [...element.items];
                                        next[i] = { ...step, description: e.target.value };
                                        onUpdate(element.id, { items: next });
                                    }}
                                    placeholder="Explicação do passo..."
                                    style={{ height: '60px' }}
                                />
                            </div>
                        </div>
                    ))}
                    <BotaoGhost onClick={() => onUpdate(element.id, { items: [...(element.items || []), { number: (element.items?.length + 1).toString(), title: 'Novo Passo', description: 'Descrição...' }] })}>
                        <FiPlus /> Adicionar Passo
                    </BotaoGhost>
                </div>
            )}

            {element.type === 'cards' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {element.items?.map((card, i) => (
                        <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <InputEditor 
                                        value={card.icon} 
                                        onChange={e => {
                                            const next = [...element.items];
                                            next[i] = { ...card, icon: e.target.value };
                                            onUpdate(element.id, { items: next });
                                        }}
                                        style={{ width: '40px', textAlign: 'center' }}
                                    />
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#2f81f7' }}>CARD {i + 1}</span>
                                </div>
                                <FiTrash style={{ cursor: 'pointer', color: '#eb4d4b', fontSize: '12px' }} onClick={() => {
                                    const next = element.items.filter((_, idx) => idx !== i);
                                    onUpdate(element.id, { items: next });
                                }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <InputEditor 
                                    value={card.title} 
                                    onChange={e => {
                                        const next = [...element.items];
                                        next[i] = { ...card, title: e.target.value };
                                        onUpdate(element.id, { items: next });
                                    }}
                                    placeholder="Título do card..."
                                />
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
                                    <label style={{ fontSize: '10px', color: '#8d8d99', marginBottom: '8px', display: 'block' }}>ITENS DO CARD (UM POR LINHA)</label>
                                    <TextareaEditor 
                                        value={card.items?.join('\n')} 
                                        onChange={e => {
                                            const next = [...element.items];
                                            next[i] = { ...card, items: e.target.value.split('\n') };
                                            onUpdate(element.id, { items: next });
                                        }}
                                        placeholder="Item 1\nItem 2..."
                                        style={{ height: '80px', fontSize: '12px' }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    <BotaoGhost onClick={() => onUpdate(element.id, { items: [...(element.items || []), { icon: '📦', title: 'Novo Card', items: ['Exemplo 1'] }] })}>
                        <FiPlus /> Adicionar Card
                    </BotaoGhost>
                </div>
            )}

            {element.type === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontSize: '10px', color: '#8d8d99' }}>ITENS DA LISTA (UM POR LINHA)</label>
                    <TextareaEditor 
                        value={element.items?.join('\n')} 
                        onChange={e => onUpdate(element.id, { items: e.target.value.split('\n') })}
                        placeholder="Primeiro item\nSegundo item..."
                        style={{ height: '120px' }}
                    />
                </div>
            )}
        </ElementoCard>
    );
};

const EditorSecao = ({ secao, idx, handleUpdateSecao, handleRemoveSecao, setManual, manual }) => {
    const [aberto, setAberto] = React.useState(idx === 0);

    const handleAddElement = (type) => {
        const novo = { id: `el_${Date.now()}`, type, value: '', style: { weight: '400', size: '16px', color: '#1a1a1a' } };
        if (type === 'grid' || type === 'steps' || type === 'cards' || type === 'list') novo.items = [];
        handleUpdateSecao(secao.id, { elements: [...secao.elements, novo] });
    };

    const handleUpdateElement = (elId, fields) => {
        const novosElements = secao.elements.map(el => el.id === elId ? { ...el, ...fields } : el);
        handleUpdateSecao(secao.id, { elements: novosElements });
    };

    const handleRemoveElement = (elId) => {
        handleUpdateSecao(secao.id, { elements: secao.elements.filter(el => el.id !== elId) });
    };

    return (
        <SecaoCard>
            <SecaoHeader onClick={() => setAberto(!aberto)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {aberto ? <FiChevronUp /> : <FiChevronDown />}
                    <span style={{ fontWeight: '700', color: '#fff' }}>{secao.title || "Seção sem título"}</span>
                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', color: '#8d8d99' }}>{secao.type.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <BotaoGhost onClick={(e) => { e.stopPropagation(); handleRemoveSecao(secao.id); }} style={{ color: '#eb4d4b', padding: '4px', border: 'none' }}>
                        <FiTrash />
                    </BotaoGhost>
                </div>
            </SecaoHeader>

            {aberto && (
                <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div>
                            <label style={{ fontSize: '11px', color: '#8d8d99', display: 'block', marginBottom: '6px' }}>Título da Seção</label>
                            <InputEditor value={secao.title} onChange={e => handleUpdateSecao(secao.id, { title: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', color: '#8d8d99', display: 'block', marginBottom: '6px' }}>Estilo de Fundo</label>
                            <SeletorEditor 
                                value={secao.type} 
                                onChange={e => handleUpdateSecao(secao.id, { type: e.target.value })}
                                opcoes={[
                                    { value: "normal", label: "Padrão (Branco)" },
                                    { value: "blueprint", label: "Blueprint (Ouro)" },
                                    { value: "legal", label: "Aviso Legal (Crítico)" }
                                ]}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#fff' }}>
                                <input type="checkbox" checked={secao.pageBreak} onChange={e => handleUpdateSecao(secao.id, { pageBreak: e.target.checked })} />
                                Quebra de Página antes
                            </label>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', color: '#2f81f7', fontWeight: '800', display: 'block', marginBottom: '16px', textTransform: 'uppercase' }}>Elementos de Conteúdo</label>
                        {secao.elements.map(el => (
                            <EditorElemento key={el.id} element={el} onUpdate={handleUpdateElement} onRemove={handleRemoveElement} />
                        ))}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                            <span style={{ width: '100%', fontSize: '11px', color: '#8d8d99', marginBottom: '4px' }}>ADICIONAR COMPONENTE:</span>
                            <BotaoGhost onClick={() => handleAddElement('paragraph')} style={{ fontSize: '11px' }}><FiType /> + Parágrafo</BotaoGhost>
                            <BotaoGhost onClick={() => handleAddElement('grid')} style={{ fontSize: '11px' }}><FiGrid /> + Grid de Composição</BotaoGhost>
                            <BotaoGhost onClick={() => handleAddElement('steps')} style={{ fontSize: '11px' }}><FiActivity /> + Passo a Passo</BotaoGhost>
                            <BotaoGhost onClick={() => handleAddElement('cards')} style={{ fontSize: '11px' }}><FiArchive /> + Cards detalhados</BotaoGhost>
                            <BotaoGhost onClick={() => handleAddElement('list')} style={{ fontSize: '11px' }}><FiCheckCircle /> + Lista de Itens</BotaoGhost>
                        </div>
                    </div>
                </div>
            )}
        </SecaoCard>
    );
};

const VisualEditor = ({ manual, setManual }) => {
    const handleAddSecao = () => {
        const nova = {
            id: `sec_${Date.now()}`,
            title: 'Nova Seção',
            type: 'normal',
            pageBreak: false,
            elements: []
        };
        setManual([...manual, nova]);
    };

    const handleUpdateSecao = (id, fields) => {
        setManual(manual.map(s => s.id === id ? { ...s, ...fields } : s));
    };

    const handleRemoveSecao = (id) => {
        if (window.confirm("Remover esta seção?")) {
            setManual(manual.filter(s => s.id !== id));
        }
    };

    return (
        <EditorContainer>
            {manual.map((secao, idx) => (
                <EditorSecao 
                    key={secao.id} 
                    secao={secao} 
                    idx={idx} 
                    manual={manual} 
                    setManual={setManual}
                    handleUpdateSecao={handleUpdateSecao}
                    handleRemoveSecao={handleRemoveSecao}
                />
            ))}
            <BotaoGhost onClick={handleAddSecao} style={{ borderStyle: 'dashed', height: '54px', justifyContent: 'center' }}>
                <FiPlus /> Adicionar Nova Seção ao Manual
            </BotaoGhost>
        </EditorContainer>
    );
};

export default function DashboardMaster() {
    const navigate = useNavigate();
    const { companies, carregando, erro } = useMasterCompanies();
    const { perfil, logout } = useAuth();

    const [abaAtiva, setAbaAtiva] = React.useState("DASHBOARD");
    const [busca, setBusca] = React.useState("");
    const [modalAberto, setModalAberto] = React.useState(false);
    const [empresaEditando, setEmpresaEditando] = React.useState(null);

    // Configurações SaaS
    const [saasConfig, setSaasConfig] = React.useState({
        nomeSaaS: "PontoFlow",
        logoUrl: "",
        planoBasicoValor: 99,
        planoProValor: 199,
        emailSuporte: "contato@pontoflow.com.br",
        whatsappVendas: "",
        modoManutencao: false
    });
    const [carregandoConfig, setCarregandoConfig] = React.useState(false);
    const [statusSalvo, setStatusSalvo] = React.useState("idle"); // "idle" | "salvando" | "salvo"
    const autoSaveRef = React.useRef(null);
    const isFirstLoad = React.useRef(true);

    // Changelog
    const [changelog, setChangelog] = React.useState([]);
    const [novaVersao, setNovaVersao] = React.useState("");
    const [novaTitulo, setNovaTitulo] = React.useState("");
    const [novasNotas, setNovasNotas] = React.useState("");
    const [novaDestinatario, setNovaDestinatario] = React.useState("TODOS");
    const [publicando, setPublicando] = React.useState(false);

    // Manual Editável
    const [manualEditavel, setManualEditavel] = React.useState(INITIAL_MANUAL_DATA);

    React.useEffect(() => {
        carregarConfigSaaS();
        carregarManual();
    }, []);

    const carregarManual = async () => {
        try {
            const snap = await getDoc(doc(db, "settings", "manual"));
            if (snap.exists()) {
                const data = snap.data().template;
                // Garantir que seja array para o novo editor
                setManualEditavel(Array.isArray(data) ? data : INITIAL_MANUAL_DATA);
            }
        } catch (e) {
            console.error("Erro ao carregar manual:", e);
        }
    };

    // Escuta changelog em tempo real
    React.useEffect(() => {
        const q = query(collection(db, "changelog"), orderBy("dataPublicacao", "desc"), limit(10));
        const unsub = onSnapshot(q, (snap) => {
            setChangelog(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    const carregarConfigSaaS = async () => {
        setCarregandoConfig(true);
        try {
            const snap = await getDoc(doc(db, "settings", "saas"));
            if (snap.exists()) {
                setSaasConfig(prev => ({ ...prev, ...snap.data() }));
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar configurações SaaS.");
        } finally {
            setCarregandoConfig(false);
            isFirstLoad.current = false;
        }
    };

    // Auto-save com debounce — dispara 1.5s após última mudança
    const triggerAutoSave = React.useCallback((newConfig) => {
        if (isFirstLoad.current) return;
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        setStatusSalvo("salvando");
        autoSaveRef.current = setTimeout(async () => {
            try {
                await setDoc(doc(db, "settings", "saas"), {
                    ...newConfig,
                    atualizadoEm: new Date().toISOString()
                }, { merge: true });
                setStatusSalvo("salvo");
                setTimeout(() => setStatusSalvo("idle"), 3000);
            } catch (e) {
                console.error(e);
                setStatusSalvo("idle");
                toast.error("Erro ao salvar configurações.");
            }
        }, 1500);
    }, []);

    const updateConfig = (field, value) => {
        const newConfig = { ...saasConfig, [field]: value };
        setSaasConfig(newConfig);
        triggerAutoSave(newConfig);
    };

    const handlePublicarChangelog = async () => {
        if (!novaVersao.trim() || !novaTitulo.trim() || !novasNotas.trim()) {
            toast.error("Preencha versão, título e notas antes de publicar.");
            return;
        }
        setPublicando(true);
        try {
            const docRef = await addDoc(collection(db, "changelog"), {
                versao: novaVersao.trim(),
                titulo: novaTitulo.trim(),
                notas: novasNotas.trim(),
                destinatario: novaDestinatario,
                dataPublicacao: serverTimestamp(),
            });
            // Marca no saas qual é a última atualização publicada
            await setDoc(doc(db, "settings", "saas"), {
                ultimaAtualizacaoId: docRef.id,
                ultimaVersao: novaVersao.trim(),
                atualizadoEm: new Date().toISOString()
            }, { merge: true });
            toast.success(`Versão ${novaVersao} publicada com sucesso!`);
            setNovaVersao("");
            setNovaTitulo("");
            setNovasNotas("");
            setNovaDestinatario("TODOS");
        } catch (e) {
            console.error(e);
            toast.error("Erro ao publicar atualização.");
        } finally {
            setPublicando(false);
        }
    };

    const handleToggleStatus = async (empresa) => {
        const novoStatus = empresa.status === "ativo" ? "bloqueado" : "ativo";
        try {
            await updateDoc(doc(db, "companies", empresa.id), { status: novoStatus });
            toast.success(`Empresa ${novoStatus === "ativo" ? "ativada" : "bloqueada"}!`);
        } catch (e) {
            toast.error("Erro ao mudar status.");
        }
    };

    const stats = React.useMemo(() => ({
        total: companies.length,
        ativas: companies.filter(c => c.status === "ativo").length,
    }), [companies]);

    const empresasFiltradas = React.useMemo(() => {
        return companies.filter(c => 
            c.nome?.toLowerCase().includes(busca.toLowerCase()) || 
            (c.cnpj && c.cnpj.includes(busca)) ||
            c.id?.toLowerCase().includes(busca.toLowerCase())
        );
    }, [companies, busca]);

    if (carregando) return <LoadingGlobal />;

    return (
        <Layout>
            <Topbar>
                <Branding style={{ border: 0, padding: 0 }}>
                    <Logo src="/icons/pwa-512x512.png" style={{ width: 30, height: 30 }} />
                    Master
                </Branding>
                <TopbarActions>
                    <BotaoTopo onClick={() => setAbaAtiva("CONFIG")} title="Configurações SaaS">
                        <FiSettings size={18} />
                    </BotaoTopo>
                    <BotaoTopo onClick={logout} title="Sair" style={{ color: '#eb4d4b' }}>
                        <FiLogOut size={18} />
                    </BotaoTopo>
                </TopbarActions>
            </Topbar>

            <Sidebar>
                <Branding>
                    <Logo src="/icons/pwa-512x512.png" />
                    Click Ponto Master
                </Branding>

                <Nav>
                    <NavItem $ativo={abaAtiva === "DASHBOARD"} onClick={() => setAbaAtiva("DASHBOARD")}>
                        <FiGrid /> <span>Painel Global</span>
                    </NavItem>
                    <NavItem $ativo={abaAtiva === "ADMINS"} onClick={() => setAbaAtiva("ADMINS")}>
                        <FiLock /> <span>Administradores</span>
                    </NavItem>
                    <NavItem $ativo={abaAtiva === "CONFIG"} onClick={() => setAbaAtiva("CONFIG")}>
                        <FiSettings /> <span>Configurações SaaS</span>
                    </NavItem>
                    <NavItem $ativo={abaAtiva === "MANUAL"} onClick={() => setAbaAtiva("MANUAL")}>
                        <FiFileText /> <span>Manual do Sistema</span>
                    </NavItem>
                    <NavItem $ativo={abaAtiva === "SUPORTE"} onClick={() => setAbaAtiva("SUPORTE")}>
                        <FiMessageSquare /> <span>Suporte / Chat</span>
                    </NavItem>

                    <NavSeparador />

                    <NavItem onClick={() => navigate("/admin")}>
                        <FiArrowLeft /> <span>Painel Admin</span>
                    </NavItem>
                </Nav>
            </Sidebar>

            <Conteudo>
                {abaAtiva === "DASHBOARD" && (
                    <>
                        <TituloSecao>Visão Geral do SaaS</TituloSecao>
                        <GridCards>
                            <Card>
                                <IconCircle color="#2f81f7"><FiBriefcase /></IconCircle>
                                <div>
                                    <LabelCard>Total de Empresas</LabelCard>
                                    <ValorCard>{stats.total}</ValorCard>
                                </div>
                            </Card>
                            <Card>
                                <IconCircle color="#2ecc71"><FiActivity /></IconCircle>
                                <div>
                                    <LabelCard>Empresas Ativas</LabelCard>
                                    <ValorCard>{stats.ativas}</ValorCard>
                                </div>
                            </Card>
                            <Card>
                                <IconCircle color="#f1c40f"><FiDollarSign /></IconCircle>
                                <div>
                                    <LabelCard>Receita Estimada (Base)</LabelCard>
                                    <ValorCard>R$ {(stats.ativas * (saasConfig.planoBasicoValor || 99)).toLocaleString()}</ValorCard>
                                </div>
                            </Card>
                        </GridCards>

                        <div style={{ marginTop: '40px' }}>
                            <TituloSecaoRow>
                                <TituloSecao>Gestão de Empresas</TituloSecao>
                                <BotaoPrincipal onClick={() => { setEmpresaEditando(null); setModalAberto(true); }}>
                                    <FiPlus /> Adicionar Nova Empresa
                                </BotaoPrincipal>
                            </TituloSecaoRow>

                            <AcoesBar>
                                <BuscaWrapper>
                                    <FiSearch color="#8d8d99" />
                                    <input 
                                        placeholder="Buscar por nome ou CNPJ..." 
                                        value={busca}
                                        onChange={e => setBusca(e.target.value)}
                                    />
                                </BuscaWrapper>
                            </AcoesBar>

                            <TabelaContainer>
                                <Tabela>
                                    <thead>
                                        <tr>
                                            <th>Empresa</th>
                                            <th>Plano / Limite</th>
                                            <th>Status</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {empresasFiltradas.map(c => (
                                            <tr key={c.id}>
                                                <td>
                                                    <InfoEmpresa>
                                                        <div className="nome">{c.nome}</div>
                                                        <div className="id">{c.cnpj || c.id}</div>
                                                    </InfoEmpresa>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <PlanoBadge>{c.plano || "Básico"}</PlanoBadge>
                                                        <LimitInfo>
                                                            <FiCheckCircle size={14} />
                                                            <span>
                                                                {c.plano === "enterprise" || (c.limiteFuncionarios && c.limiteFuncionarios >= 999)
                                                                    ? "Ilimitado" 
                                                                    : `Até ${c.limiteFuncionarios || (c.plano === 'pro' ? 99 : 10)} Colaboradores`}
                                                            </span>
                                                        </LimitInfo>
                                                    </div>
                                                </td>
                                                <td>
                                                    <StatusBadge $ativo={c.status === "ativo"}>
                                                        {c.status || "ativo"}
                                                    </StatusBadge>
                                                </td>
                                                <td>
                                                    <GroupAcoes>
                                                        <BotaoIcone onClick={() => { setEmpresaEditando(c); setModalAberto(true); }}>
                                                            <FiEdit2 size={14} />
                                                        </BotaoIcone>
                                                        <BotaoIcone onClick={() => handleToggleStatus(c)}>
                                                            {c.status === "bloqueado" ? <FiUnlock size={14} /> : <FiLock size={14} />}
                                                        </BotaoIcone>
                                                    </GroupAcoes>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Tabela>
                            </TabelaContainer>
                        </div>
                    </>
                )}

                {abaAtiva === "CONFIG" && (
                    <ConfigContainer>
                        <TituloSecaoRow>
                            <div>
                                <TituloSecao>Configurações Globais do SaaS</TituloSecao>
                                <p style={{ color: '#8d8d99', fontSize: '14px', margin: 0 }}>
                                    Gerencie a identidade, faturamento e canais de suporte padrão do sistema.
                                </p>
                            </div>
                            <StatusSalvo $status={statusSalvo}>
                                {statusSalvo === "salvando" && <><FiClock size={13} /> Salvando...</>}
                                {statusSalvo === "salvo" && <><FiCheckCircle size={13} /> Salvo</>}
                                {statusSalvo === "idle" && "Salvo automaticamente"}
                            </StatusSalvo>
                        </TituloSecaoRow>

                        <GridConfig>
                            <SecaoConfig>
                                <Subtitulo><FiTag /> Identidade e Branding</Subtitulo>
                                <InputGroup>
                                    <label>Nome do Sistema (SaaS)</label>
                                    <input
                                        value={saasConfig.nomeSaaS}
                                        onChange={e => updateConfig("nomeSaaS", e.target.value)}
                                        placeholder="Ex: PontoFlow"
                                    />
                                </InputGroup>
                                <InputGroup>
                                    <label>URL do Logotipo <span style={{ fontWeight: 400, color: '#8d8d99' }}>(opcional)</span></label>
                                    <input
                                        value={saasConfig.logoUrl}
                                        onChange={e => updateConfig("logoUrl", e.target.value)}
                                        placeholder="https://..."
                                    />
                                </InputGroup>
                            </SecaoConfig>

                            <SecaoConfig>
                                <Subtitulo><FiDollarSign /> Tabelas de Preços (Mensal)</Subtitulo>
                                <InputGroup>
                                    <label>Valor Plano Básico (R$)</label>
                                    <input
                                        type="number"
                                        value={saasConfig.planoBasicoValor}
                                        onChange={e => updateConfig("planoBasicoValor", Number(e.target.value))}
                                    />
                                </InputGroup>
                                <InputGroup>
                                    <label>Valor Plano Pro (R$)</label>
                                    <input
                                        type="number"
                                        value={saasConfig.planoProValor}
                                        onChange={e => updateConfig("planoProValor", Number(e.target.value))}
                                    />
                                </InputGroup>
                            </SecaoConfig>

                            <SecaoConfig>
                                <Subtitulo><FiMail /> Canais de Suporte e Vendas</Subtitulo>
                                <InputGroup>
                                    <label>Email de Suporte</label>
                                    <input
                                        type="email"
                                        value={saasConfig.emailSuporte}
                                        onChange={e => updateConfig("emailSuporte", e.target.value)}
                                        placeholder="suporte@..."
                                    />
                                </InputGroup>
                                <InputGroup>
                                    <label>WhatsApp de Vendas (DDD + Número)</label>
                                    <input
                                        value={saasConfig.whatsappVendas}
                                        onChange={e => {
                                            // Máscara: (XX) XXXXX-XXXX
                                            const nums = e.target.value.replace(/\D/g, '').substring(0, 11);
                                            let masked = nums;
                                            if (nums.length > 2) masked = `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
                                            if (nums.length > 7) masked = `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
                                            updateConfig("whatsappVendas", masked);
                                        }}
                                        placeholder="(31) 99166-0594"
                                        maxLength={15}
                                        inputMode="numeric"
                                    />
                                </InputGroup>
                            </SecaoConfig>

                            <SecaoConfig>
                                <Subtitulo><FiInfo /> Status do Sistema</Subtitulo>
                                <ToggleWrapper>
                                    <label>
                                        <ToggleSwitch
                                            $ativo={saasConfig.modoManutencao}
                                            onClick={() => updateConfig("modoManutencao", !saasConfig.modoManutencao)}
                                        >
                                            <span />
                                        </ToggleSwitch>
                                        Modo Manutenção Global
                                    </label>
                                    <small>Se ativado, bloqueia o acesso de todos os usuários (exceto Master).</small>
                                </ToggleWrapper>
                            </SecaoConfig>
                        </GridConfig>

                        {/* ── NOTAS DE ATUALIZAÇÃO ─────────────────────── */}
                        <SecaoDivisor />

                        <SecaoChangelog>
                            <Subtitulo><FiZap /> Notas de Atualização</Subtitulo>
                            <p style={{ color: '#8d8d99', fontSize: '13px', margin: '0 0 16px' }}>
                                Publique o que foi modificado nesta versão. As notas aparecerão no painel de cada empresa cliente.
                            </p>

                            <GridChangelog>
                                <InputGroup>
                                    <label>Versão (ex: 1.2.0)</label>
                                    <input
                                        value={novaVersao}
                                        onChange={e => setNovaVersao(e.target.value)}
                                        placeholder="1.0.0"
                                    />
                                </InputGroup>
                                <InputGroup>
                                    <label>Título da Atualização</label>
                                    <input
                                        value={novaTitulo}
                                        onChange={e => setNovaTitulo(e.target.value)}
                                        placeholder="Ex: Melhorias no relatório PDF"
                                    />
                                </InputGroup>
                                <InputGroup>
                                    <label>Público-Alvo</label>
                                    <SeletorEditor 
                                        value={novaDestinatario}
                                        onChange={e => setNovaDestinatario(e.target.value)}
                                        opcoes={[
                                            { value: "TODOS", label: "Todos os Perfis" },
                                            { value: "ADMIN", label: "Apenas Administradores" },
                                            { value: "COLABORADOR", label: "Apenas Colaboradores" }
                                        ]}
                                    />
                                </InputGroup>
                            </GridChangelog>

                            <InputGroup style={{ marginTop: '12px' }}>
                                <label>Notas (o que mudou nesta versão)</label>
                                <TextareaNotas
                                    value={novasNotas}
                                    onChange={e => setNovasNotas(e.target.value)}
                                    placeholder={"• Correção no cálculo de horas\n• Novo filtro por data no histórico\n• Melhorias de performance"}
                                    rows={5}
                                />
                            </InputGroup>

                            <BotaoPublicar onClick={handlePublicarChangelog} disabled={publicando}>
                                <FiZap size={15} />
                                {publicando ? "Publicando..." : "Publicar Atualização"}
                            </BotaoPublicar>

                            {/* Histórico de versões */}
                            {changelog.length > 0 && (
                                <HistoricoChangelog>
                                    <h4>Versões Publicadas</h4>
                                    {changelog.map(entry => (
                                        <EntryChangelog key={entry.id}>
                                            <EntryHeader>
                                                <VersionBadge>v{entry.versao}</VersionBadge>
                                                <EntryTitulo>{entry.titulo}</EntryTitulo>
                                                <EntryData>
                                                    {entry.dataPublicacao?.toDate
                                                        ? entry.dataPublicacao.toDate().toLocaleDateString("pt-BR")
                                                        : "..."}
                                                </EntryData>
                                            </EntryHeader>
                                            <EntryNotas>{entry.notas}</EntryNotas>
                                        </EntryChangelog>
                                    ))}
                                </HistoricoChangelog>
                            )}
                        </SecaoChangelog>
                    </ConfigContainer>
                )}


                {abaAtiva === "ADMINS" && <AbaAdminsMaster />}

                {abaAtiva === "MANUAL" && (
                    <ConfigContainer>
                        <TituloSecaoRow>
                            <div>
                                <TituloSecao>Editor Visual do Manual</TituloSecao>
                                <p style={{ color: '#8d8d99', fontSize: '14px', margin: 0 }}>
                                    Interface estruturada para gestão completa do conteúdo e design do manual.
                                </p>
                            </div>
                            <BotaoPrincipal 
                                onClick={async () => {
                                    setPublicando(true);
                                    try {
                                        await setDoc(doc(db, "settings", "manual"), {
                                            template: manualEditavel,
                                            atualizadoEm: serverTimestamp()
                                        });
                                        toast.success("Design e conteúdo do manual salvos!");
                                    } catch (e) {
                                        toast.error("Erro ao salvar manual.");
                                    } finally {
                                        setPublicando(false);
                                    }
                                }}
                                disabled={publicando}
                            >
                                <FiSave /> {publicando ? "Salvando..." : "Salvar Configurações"}
                            </BotaoPrincipal>
                        </TituloSecaoRow>

                        <div style={{ background: '#19191b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
                            <Subtitulo><FiEdit2 /> Composição Visual</Subtitulo>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={{ fontSize: '12px', color: '#8d8d99' }}>
                                    Adicione seções, ajuste pesos de fonte e cores. O layout premium é gerado em tempo real no PDF.
                                </label>
                            </div>
                            
                            <VisualEditor manual={manualEditavel} setManual={setManualEditavel} />
                        </div>
                    </ConfigContainer>
                )}

                {abaAtiva === "SUPORTE" && (
                    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
                        <TabelaContainer style={{ height: '600px', overflowY: 'auto' }}>
                            <Tabela>
                                <thead>
                                    <tr><th>Empresas</th></tr>
                                </thead>
                                <tbody>
                                    {companies.map(c => (
                                        <tr 
                                            key={c.id} 
                                            onClick={() => setEmpresaEditando(c)}
                                            style={{ 
                                                cursor: 'pointer', 
                                                background: empresaEditando?.id === c.id ? 'rgba(47, 129, 247, 0.1)' : 'transparent' 
                                            }}
                                        >
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{c.nome}</div>
                                                <div style={{ fontSize: 11, opacity: 0.6 }}>ID: {c.id}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Tabela>
                        </TabelaContainer>

                        <ChatSuporte 
                            companyId={empresaEditando?.id} 
                            isMaster={true}
                            userName={"Master Suporte"}
                        />
                    </div>
                )}
            </Conteudo>

            <ModalNovaEmpresa
                aberto={modalAberto}
                onFechar={() => setModalAberto(false)}
                empresa={empresaEditando}
            />

            <TabbarMasterMobile
                abaAtiva={abaAtiva}
                setAbaAtiva={setAbaAtiva}
            />
        </Layout>
    );
}

/* Styled Components */

const Layout = styled.div`
    display: flex;
    min-height: 100vh;
    background: #121214;
    color: #e1e1e6;

    @media (max-width: 900px) {
        flex-direction: column;
    }
`;

const Sidebar = styled.aside`
    width: 260px;
    background: #19191b;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    padding: 24px;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    overflow-y: auto;

    @media (max-width: 900px) {
        display: none;
    }
`;

const Branding = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 700;
    font-size: 18px;
    margin-bottom: 40px;
`;

const Logo = styled.img`
    width: 32px;
    height: 32px;
`;

const Nav = styled.nav`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const NavItem = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    color: ${props => props.$ativo ? "#fff" : "#8d8d99"};
    background: ${props => props.$ativo ? "rgba(255, 255, 255, 0.05)" : "transparent"};

    &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
    }
`;

const NavSeparador = styled.div`
    height: 1px;
    background: rgba(255, 255, 255, 0.05);
    margin: 16px 0;
`;

const Conteudo = styled.main`
    flex: 1;
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    max-width: 1200px;
    margin: 0 auto 0 260px;
    width: calc(100% - 260px);

    @media (max-width: 900px) {
        padding: 24px 16px;
        margin: 0 auto;
        width: 100%;
    }
`;

const TituloSecao = styled.h2`
    font-size: 24px;
    font-weight: 700;
    margin: 0;
`;

const AcoesBar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    gap: 16px;
    flex-wrap: wrap;
`;

const GridCards = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
`;

const Card = styled.div`
    background: #19191b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
`;

const IconCircle = styled.div`
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: ${props => props.color}22;
    color: ${props => props.color};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
`;

const LabelCard = styled.div`
    font-size: 13px;
    color: #8d8d99;
    margin-bottom: 4px;
`;

const ValorCard = styled.div`
    font-size: 24px;
    font-weight: 700;
`;

const TopoAcoes = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
`;

const BuscaWrapper = styled.div`
    flex: 1;
    max-width: 400px;
    background: #19191b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 12px;

    input {
        background: transparent;
        border: 0;
        color: #fff;
        height: 44px;
        width: 100%;
        outline: none;
    }
`;

const BotaoPrincipal = styled.button`
    background: #2f81f7;
    color: #fff;
    border: 0;
    padding: 0 24px;
    height: 44px;
    border-radius: 8px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
`;

const TabelaContainer = styled.div`
    background: #19191b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow-x: auto;
`;

const Tabela = styled.table`
    width: 100%;
    border-collapse: collapse;
    text-align: left;

    th, td {
        padding: 16px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);

        @media (max-width: 600px) {
            padding: 12px 16px;
        }
    }

    th {
        background: rgba(255, 255, 255, 0.02);
        color: #8d8d99;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
`;

const InfoEmpresa = styled.div`
    .nome { font-weight: 600; }
    .id { font-size: 11px; color: #8d8d99; }
`;

const PlanoBadge = styled.span`
    background: rgba(47, 129, 247, 0.1);
    color: #2f81f7;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    width: fit-content;
`;

const LimitInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #e1e1e6;
    margin-top: 4px;

    svg {
        color: #2f81f7;
    }
`;

const StatusBadge = styled.span`
    background: ${props => props.$ativo ? "rgba(46, 204, 113, 0.1)" : "rgba(235, 77, 75, 0.1)"};
    color: ${props => props.$ativo ? "#2ecc71" : "#eb4d4b"};
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
`;

const GroupAcoes = styled.div`
    display: flex;
    gap: 8px;
`;

const BotaoIcone = styled.button`
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: ${props => props.$danger ? "#eb4d4b" : "#8d8d99"};
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: ${props => props.$danger ? "rgba(235, 77, 75, 0.1)" : "rgba(255, 255, 255, 0.05)"};
        border-color: ${props => props.$danger ? "#eb4d4b" : "#2f81f7"};
    }
`;

const ConfigContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 32px;
    animation: fadeIn 0.3s ease-out;

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

const FormConfig = styled.form`
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const TituloSecaoRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 24px;

    @media (max-width: 600px) {
        flex-direction: column;
        align-items: stretch;
        
        button {
            width: 100%;
            justify-content: center;
        }
    }
`;

const StatusSalvo = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 20px;
    white-space: nowrap;
    transition: all 0.3s;
    background: ${props => props.$status === "salvo" ? "rgba(46,204,113,0.1)" :
        props.$status === "salvando" ? "rgba(245,158,11,0.1)" :
            "rgba(255,255,255,0.04)"
    };
    color: ${props => props.$status === "salvo" ? "#2ecc71" :
        props.$status === "salvando" ? "#f59e0b" :
            "#8d8d99"
    };
`;

const GridConfig = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

const SecaoConfig = styled.div`
    background: #19191b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Subtitulo = styled.h3`
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    svg { color: #2f81f7; }
`;

const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    label { font-size: 12px; font-weight: 600; color: #8d8d99; }

    input {
        background: #121214;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        height: 44px;
        padding: 0 16px;
        color: #fff;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;

        &:focus { border-color: #2f81f7; }
    }
`;

const ToggleWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;

    label {
        display: flex;
        align-items: center;
        gap: 14px;
        font-weight: 600;
        cursor: pointer;
    }

    small { color: #8d8d99; font-size: 12px; line-height: 1.5; }
`;

const ToggleSwitch = styled.div`
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: ${props => props.$ativo ? "#2f81f7" : "rgba(255,255,255,0.1)"};
    position: relative;
    cursor: pointer;
    transition: background 0.25s;
    flex-shrink: 0;

    span {
        position: absolute;
        top: 3px;
        left: ${props => props.$ativo ? "23px" : "3px"};
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #fff;
        transition: left 0.25s;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
`;

const FooterAcoes = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
`;

const SecaoDivisor = styled.hr`
    border: none;
    border-top: 1px solid rgba(255,255,255,0.06);
    margin: 8px 0;
`;

const SecaoChangelog = styled.div`
    background: #19191b;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const GridChangelog = styled.div`
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 16px;

    @media (max-width: 700px) { grid-template-columns: 1fr; }
`;

const TextareaNotas = styled.textarea`
    background: #121214;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 12px 16px;
    color: #fff;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    line-height: 1.6;
    transition: border-color 0.2s;

    &:focus { border-color: #2f81f7; }
    &::placeholder { color: #8d8d9966; }
`;

const BotaoPublicar = styled.button`
    margin-top: 16px;
    align-self: flex-start;
    background: linear-gradient(135deg, #f59e0b, #f97316);
    color: #111;
    border: 0;
    padding: 0 24px;
    height: 44px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: filter 0.2s;

    &:hover:not(:disabled) { filter: brightness(1.1); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const BotaoGhost = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
    height: 38px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #8d8d99;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: #2f81f7;
        color: #fff;
    }
`;

const HistoricoChangelog = styled.div`
    margin-top: 28px;
    padding-top: 24px;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    flex-direction: column;
    gap: 16px;

    h4 { font-size: 13px; font-weight: 600; color: #8d8d99; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.8px; }
`;

const EntryChangelog = styled.div`
    background: #121214;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const EntryHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

const VersionBadge = styled.span`
    background: rgba(245,158,11,0.15);
    color: #f59e0b;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
`;

const EntryTitulo = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: #e1e1e6;
    flex: 1;
`;

const EntryData = styled.span`
    font-size: 12px;
    color: #8d8d99;
`;

const EntryNotas = styled.pre`
    font-size: 13px;
    color: #8d8d99;
    line-height: 1.7;
    margin: 0;
    white-space: pre-wrap;
    font-family: inherit;
`;
