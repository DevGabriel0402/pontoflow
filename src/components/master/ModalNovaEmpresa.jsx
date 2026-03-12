import React from "react";
import styled from "styled-components";
import { FiX, FiCheck, FiInfo } from "react-icons/fi";
import { db } from "../../services/firebase";
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { criarAdminEmpresaFn } from "../../services/funcoes";
import { FiMapPin, FiMap } from "react-icons/fi";
import MapaConfig from "../../components/admin/MapaConfig";

const PLANOS_MODULOS = {
    basico: ['relatorios'],
    pro: ['relatorios', 'geo', 'bancoHoras', 'justificativas'],
    enterprise: ['relatorios', 'geo', 'bancoHoras', 'justificativas', 'face']
};

export default function ModalNovaEmpresa({ aberto, empresa, onFechar }) {
    const [dados, setDados] = React.useState({
        id: "",
        nome: "",
        cnpj: "",
        endereco: {
            cep: "",
            logradouro: "",
            numero: "",
            bairro: "",
            cidade: "",
            uf: ""
        },
        plano: "basico",
        config: {
            nomePainel: "",
            raioM: 100, // Raio padrão menor para maior precisão
            lat: "",
            lng: "",
            modulos: {
                face: true,
                geo: true,
                justificativas: true,
                bancoHoras: true,
                relatorios: true
            },
            regras: {
                exigirFace: true,
                exigirGeo: true,
                loginPorMatricula: false,
                pontosAtivos: ['entrada', 'saida'], // Padrão básico
                cargaHorariaSemanal: ""
            },
            visual: {
                corPrimaria: "#2f81f7",
                logoUrl: ""
            }
        },
        admin: {
            nome: "",
            email: "",
            dataNascimento: ""
        },
        limiteFuncionarios: 10
    });

    const [salvando, setSalvando] = React.useState(false);
    const [buscandoCnpj, setBuscandoCnpj] = React.useState(false);
    const [buscandoCep, setBuscandoCep] = React.useState(false);
    const [buscandoGeo, setBuscandoGeo] = React.useState(false);
    const [mapaAberto, setMapaAberto] = React.useState(false);
    const [localizacaoManual, setLocalizacaoManual] = React.useState(false);
    const [planosConfig, setPlanosConfig] = React.useState({ basico: 99, pro: 199 });

    // Busca preços dos planos do painel Master ao abrir o modal
    React.useEffect(() => {
        if (!aberto) return;
        getDoc(doc(db, "settings", "saas"))
            .then(snap => {
                if (snap.exists()) {
                    const d = snap.data();
                    setPlanosConfig({
                        basico: d.planoBasicoValor ?? 99,
                        pro: d.planoProValor ?? 199,
                    });
                }
            })
            .catch(() => { });
    }, [aberto]);

    React.useEffect(() => {
        if (empresa) {
            // Garantir que endereco seja objeto se vier como string de versões anteriores
            const enderecoBase = typeof empresa.endereco === 'string'
                ? { logradouro: empresa.endereco, cep: "", numero: "", bairro: "", cidade: "", uf: "" }
                : empresa.endereco;

            setDados({
                id: empresa.id || "",
                nome: empresa.nome || "",
                cnpj: empresa.cnpj || "",
                plano: empresa.plano || "basico",
                status: empresa.status || "ativo",
                endereco: {
                    cep: "",
                    logradouro: "",
                    numero: "",
                    bairro: "",
                    cidade: "",
                    uf: "",
                    ...enderecoBase
                },
                config: {
                    nomePainel: empresa.nome || "",
                    raioM: 100,
                    lat: "",
                    lng: "",
                    modulos: { face: true, geo: true, justificativas: true, bancoHoras: true, relatorios: true },
                    regras: {
                        exigirFace: true,
                        exigirGeo: true,
                        loginPorMatricula: false,
                        pontosAtivos: ['entrada', 'saida'],
                        cargaHorariaSemanal: "",
                        ...(empresa.config?.regras || {})
                    },
                    visual: { corPrimaria: "#2f81f7", logoUrl: "" },
                    ...(empresa.config || {})
                },
                admin: {
                    nome: "",
                    email: "",
                    dataNascimento: ""
                }
            });
        } else {
            setDados({
                id: "",
                nome: "",
                cnpj: "",
                endereco: {
                    cep: "",
                    logradouro: "",
                    numero: "",
                    bairro: "",
                    cidade: "",
                    uf: ""
                },
                plano: "basico",
                config: {
                    nomePainel: "",
                    raioM: 100,
                    lat: "",
                    lng: "",
                    modulos: { face: true, geo: true, justificativas: true, bancoHoras: true, relatorios: true },
                    regras: {
                        exigirFace: true,
                        exigirGeo: true,
                        loginPorMatricula: false,
                        pontosAtivos: ['entrada', 'saida'],
                        cargaHorariaSemanal: ""
                    },
                    visual: { corPrimaria: "#2f81f7", logoUrl: "" }
                },
                admin: {
                    nome: "",
                    email: "",
                    dataNascimento: ""
                }
            });
        }
    }, [empresa, aberto]);

    // ==========================================
    // 3. ENFORCE PLAN LIMITS
    // ==========================================
    React.useEffect(() => {
        if (!dados.plano) return;
        const permitidos = PLANOS_MODULOS[dados.plano] || [];

        setDados(prev => {
            if (!prev.config || !prev.config.modulos) return prev;

            const novosModulos = { ...prev.config.modulos };
            let mudou = false;

            // Desliga os módulos que não são permitidos neste plano
            Object.keys(novosModulos).forEach(mod => {
                if (!permitidos.includes(mod) && novosModulos[mod]) {
                    novosModulos[mod] = false;
                    mudou = true;
                }
            });

            if (mudou || prev.limiteFuncionarios !== (prev.plano === 'enterprise' ? 9999 : prev.plano === 'pro' ? 99 : 10)) {
                return { 
                    ...prev, 
                    config: { ...prev.config, modulos: novosModulos },
                    limiteFuncionarios: prev.plano === 'enterprise' ? 9999 : prev.plano === 'pro' ? 99 : 10
                };
            }
            return prev;
        });
    }, [dados.plano]);

    // ==========================================
    // BUSCAS EXTERNAS (CEP, CNPJ, GEO)
    // ==========================================
    const handleBuscarCnpj = async () => {
        const cnpj = dados.cnpj.replace(/\D/g, '');
        if (cnpj.length !== 14) return;

        setBuscandoCnpj(true);
        try {
            const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
            if (!resp.ok) throw new Error("CNPJ não encontrado");
            const data = await resp.json();

            setDados(prev => ({
                ...prev,
                nome: data.nome_fantasia || data.razao_social,
                endereco: {
                    ...prev.endereco,
                    cep: data.cep,
                    logradouro: data.logradouro,
                    numero: data.numero,
                    bairro: data.bairro,
                    cidade: data.municipio,
                    uf: data.uf
                },
                config: {
                    ...prev.config,
                    nomePainel: data.nome_fantasia || data.razao_social
                }
            }));
            toast.success("Dados da empresa importados via BrasilAPI!");

            setLocalizacaoManual(false); // Reseta ao importar nova empresa
            // Tenta buscar coordenadas logo após preencher os dados
            const end = {
                logradouro: data.logradouro,
                numero: data.numero,
                cidade: data.municipio,
                uf: data.uf,
                cep: data.cep
            };
            setTimeout(() => handleBuscarCoordenadas(true, end), 300);

        } catch (e) {
            console.error(e);
            toast.error("Erro ao consultar CNPJ na BrasilAPI.");
        } finally {
            setBuscandoCnpj(false);
        }
    };

    const handleBuscarCep = async () => {
        const cep = dados.endereco.cep.replace(/\D/g, '');
        if (cep.length !== 8) return;

        setBuscandoCep(true);
        try {
            const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await resp.json();

            if (data.erro) {
                toast.error("CEP não encontrado.");
            } else {
                const novoEndereco = {
                    ...dados.endereco,
                    logradouro: data.logradouro,
                    bairro: data.bairro,
                    cidade: data.localidade,
                    uf: data.uf
                };

                setDados(prev => ({
                    ...prev,
                    endereco: novoEndereco
                }));

                // Tenta buscar coordenadas logo após o CEP preencher os dados
                setTimeout(() => handleBuscarCoordenadas(true, novoEndereco), 200);
            }
        } catch (e) {
            toast.error("Erro ao buscar CEP.");
        } finally {
            setBuscandoCep(false);
        }
    };

    const handleBuscarCoordenadas = async (silencioso = false, overrideEndereco = null) => {
        const targetEndereco = overrideEndereco || dados.endereco;
        const { logradouro, numero, cidade, uf } = targetEndereco;

        if (!logradouro || !cidade) {
            if (!silencioso) toast.error("Rua e Cidade são obrigatórios para buscar localização.");
            return;
        }

        if (localizacaoManual && !overrideEndereco && silencioso) return;

        setBuscandoGeo(true);
        try {
            const cleanCep = targetEndereco.cep?.replace(/\D/g, '');
            const cleanNumero = numero?.trim();

            // --- ESTÁGIO 1: CEP + NÚMERO (Ultra-preciso via Query Livre para evitar CORS) ---
            if (cleanCep && cleanNumero) {
                const queryCepNum = `${cleanCep}, ${cleanNumero}`;
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryCepNum)}&country=Brasil&addressdetails=1&limit=1&email=contato@pontoflow.com.br`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.length > 0) {
                    const item = data[0];
                    const hasHouseNumber = item.address?.house_number === cleanNumero || item.display_name.includes(cleanNumero);
                    if (hasHouseNumber) {
                        setDados(prev => ({ ...prev, config: { ...prev.config, lat: parseFloat(item.lat), lng: parseFloat(item.lon) } }));
                        if (!silencioso) toast.success("Localização exata encontrada!");
                        setLocalizacaoManual(false);
                        return;
                    }
                }
            }

            // --- ESTÁGIO 2: BUSCA LIVRE COMPLETA (Rua + Número + Cidade + Estado) ---
            // Formato robusto: "Rua Exemplo, 123 - Cidade, Estado, Brasil"
            const query = `${logradouro}${cleanNumero ? ', ' + cleanNumero : ''} - ${cidade}, ${uf || ''}, Brasil`.trim();
            const urlLivre = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&email=contato@pontoflow.com.br`;
            const resLivre = await fetch(urlLivre);
            const dataLivre = await resLivre.json();

            // Filtrar por quem REALMENTE tem o número (evita o centro da rua)
            let match = dataLivre.find(item => {
                const addr = item.address || {};
                return addr.house_number === cleanNumero || item.display_name.includes(` ${cleanNumero},`) || item.display_name.includes(`, ${cleanNumero} `) || item.display_name.startsWith(`${cleanNumero},`);
            });

            // Se não achou com número, mas tem resultados, pegamos o primeiro APENAS se não houver número na busca
            if (!match && !cleanNumero && dataLivre.length > 0) match = dataLivre[0];

            if (match) {
                setDados(prev => ({ ...prev, config: { ...prev.config, lat: parseFloat(match.lat), lng: parseFloat(match.lon) } }));
                const isExact = match.address?.house_number === cleanNumero;
                if (!silencioso) toast.success(isExact ? "Localização exata encontrada!" : "Localização aproximada encontrada.");
                setLocalizacaoManual(false);
                return;
            }

            // --- ESTÁGIO 3: FALLBACK BUSCA LIVRE (Sem Bairro se houver) ---
            const querySimples = `${logradouro}${cleanNumero ? ' ' + cleanNumero : ''}, ${cidade}, Brasil`;
            const resSimples = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(querySimples)}&limit=1&addressdetails=1&email=contato@pontoflow.com.br`);
            const dataSimples = await resSimples.json();

            if (dataSimples.length > 0) {
                const item = dataSimples[0];
                setDados(prev => ({ ...prev, config: { ...prev.config, lat: parseFloat(item.lat), lng: parseFloat(item.lon) } }));
                if (!silencioso) toast.success("Localização encontrada (Busca Simples).");
                setLocalizacaoManual(false);
                return;
            }

            if (!silencioso) toast.error("Não encontramos as coordenadas exatas. O marcador foi mantido ou zerado.");
        } catch (e) {
            console.error("Geocoding error:", e);
            if (!silencioso) toast.error("Erro ao conectar com serviço de mapas.");
        } finally {
            setBuscandoGeo(false);
        }
    };

    const formatarCNPJ = (val) => {
        const v = val.replace(/\D/g, '').substring(0, 14);
        if (v.length <= 2) return v;
        if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`;
        if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
        if (v.length <= 12) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`;
        return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
    };

    const handleSalvar = async (e) => {
        e.preventDefault();
        setSalvando(true);

        const companyId = dados.id?.trim().toLowerCase().replace(/\s+/g, '-');
        if (!companyId) {
            toast.error("O ID da empresa é obrigatório.");
            setSalvando(false);
            return;
        }

        try {
            // Extrair apenas dados da empresa (remover admin do corpo do doc se for salvar no doc da empresa)
            const { admin: adminDados, id: _tempId, ...empresaDados } = dados;

            const payload = {
                ...empresaDados,
                atualizadoEm: serverTimestamp()
            };

            if (empresa) {
                // MODO EDIÇÃO
                await updateDoc(doc(db, "companies", empresa.id), payload);
                toast.success("Empresa atualizada com sucesso!");
            } else {
                // MODO CRIAÇÃO
                // 1) Criar Documento da Empresa
                await setDoc(doc(db, "companies", companyId), {
                    ...payload,
                    id: companyId,
                    status: "ativo",
                    criadoEm: serverTimestamp()
                });

                // 2) Provisionar Admin Inicial (Via Cloud Function)
                try {
                    await criarAdminEmpresaFn({
                        companyId,
                        nome: adminDados.nome,
                        email: adminDados.email,
                        dataNascimento: adminDados.dataNascimento
                    });
                    toast.success("Empresa e Administrador criados!");
                } catch (errFunc) {
                    console.error("Erro na Cloud Function:", errFunc);
                    // Aqui a empresa foi criada mas o admin falhou. 
                    // Notificamos especificamente.
                    toast.error("Empresa criada, mas erro ao provisionar Administrador. Verifique o email.");
                }
            }
            onFechar();
        } catch (e) {
            console.error("Erro no Firestore:", e);
            toast.error("Erro ao salvar dados da empresa no servidor.");
        } finally {
            setSalvando(false);
        }
    };

    if (!aberto) return null;

    return (
        <Overlay>
            <ModalConteudo>
                <Header>
                    <h3>{empresa ? "Editar Empresa" : "Nova Empresa"}</h3>
                    <BotaoFechar onClick={onFechar}><FiX /></BotaoFechar>
                </Header>

                <Formulario onSubmit={handleSalvar}>
                    <ScrollArea>
                        <Secao>
                            <TituloSecao>Dados Cadastrais</TituloSecao>
                            <InputGroup>
                                <label>Código da Empresa (Slug)</label>
                                <input
                                    placeholder="ex: minha-empresa"
                                    value={dados.id}
                                    onChange={e => setDados({ ...dados, id: e.target.value })}
                                    disabled={!!empresa}
                                    required
                                />
                                <small>Este código será usado pelos funcionários para fazer login e no banco de dados.</small>
                            </InputGroup>

                            <InputRow>
                                <InputGroup>
                                    <label>Nome da Empresa</label>
                                    <input
                                        placeholder="Nome Fantasia"
                                        value={dados.nome}
                                        onChange={e => setDados({ ...dados, nome: e.target.value })}
                                        required
                                    />
                                </InputGroup>
                                <InputGroup>
                                    <label>CNPJ</label>
                                    <input
                                        placeholder="00.000.000/0000-00"
                                        value={dados.cnpj}
                                        onChange={e => setDados({ ...dados, cnpj: formatarCNPJ(e.target.value) })}
                                        onBlur={handleBuscarCnpj}
                                    />
                                    {buscandoCnpj && <small>Consultando BrasilAPI...</small>}
                                </InputGroup>
                            </InputRow>

                            <InputRow>
                                <InputGroup>
                                    <label>Plano</label>
                                    <select
                                        value={dados.plano}
                                        onChange={e => setDados({ ...dados, plano: e.target.value })}
                                    >
                                        <option value="basico">Básico (R$ {planosConfig.basico}/mês)</option>
                                        <option value="pro">Pro (R$ {planosConfig.pro}/mês)</option>
                                        <option value="enterprise">Enterprise (Sob consulta)</option>
                                    </select>
                                </InputGroup>
                                <InputGroup>
                                    <label>Limite de Colaboradores</label>
                                    <input
                                        type="number"
                                        value={dados.limiteFuncionarios}
                                        onChange={e => setDados({ ...dados, limiteFuncionarios: Number(e.target.value) })}
                                        placeholder="Ex: 10"
                                    />
                                </InputGroup>
                            </InputRow>
                        </Secao>

                        {!empresa && (
                            <>
                                <Separador />
                                <Secao>
                                    <TituloSecao>Administrador da Empresa</TituloSecao>
                                    <InputGroup>
                                        <label>Nome Completo do Admin</label>
                                        <input
                                            value={dados.admin?.nome || ""}
                                            onChange={e => setDados({ ...dados, admin: { ...dados.admin, nome: e.target.value } })}
                                            required={!empresa}
                                        />
                                    </InputGroup>
                                    <InputRow>
                                        <InputGroup>
                                            <label>Email do Admin</label>
                                            <input
                                                type="email"
                                                placeholder="admin@empresa.com"
                                                value={dados.admin?.email || ""}
                                                onChange={e => setDados({ ...dados, admin: { ...dados.admin, email: e.target.value } })}
                                                required={!empresa}
                                            />
                                        </InputGroup>
                                        <InputGroup>
                                            <label>Data de Nascimento</label>
                                            <input
                                                type="date"
                                                value={dados.admin?.dataNascimento || ""}
                                                onChange={e => setDados({ ...dados, admin: { ...dados.admin, dataNascimento: e.target.value } })}
                                                required={!empresa}
                                            />
                                        </InputGroup>
                                    </InputRow>
                                    <small>A senha inicial será o primeiro nome + dia/mês de nascimento.</small>
                                </Secao>
                            </>
                        )}

                        <Separador />

                        <Secao>
                            <TituloSecao>Endereço Completo</TituloSecao>
                            <InputRow>
                                <InputGroup>
                                    <label>CEP</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            placeholder="00000-000"
                                            value={dados.endereco.cep}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '').substring(0, 8);
                                                const masked = val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5)}` : val;
                                                setDados({ ...dados, endereco: { ...dados.endereco, cep: masked } });
                                            }}
                                            onBlur={handleBuscarCep}
                                        />
                                    </div>
                                </InputGroup>
                                <InputGroup>
                                    <label>Logradouro</label>
                                    <input
                                        placeholder="Rua, Avenida..."
                                        value={dados.endereco.logradouro}
                                        onChange={e => setDados({ ...dados, endereco: { ...dados.endereco, logradouro: e.target.value } })}
                                        onBlur={() => handleBuscarCoordenadas(true)}
                                        required
                                    />
                                </InputGroup>
                            </InputRow>

                            <InputRow>
                                <InputGroup>
                                    <label>Número</label>
                                    <input
                                        placeholder="123"
                                        value={dados.endereco.numero}
                                        onChange={e => setDados({ ...dados, endereco: { ...dados.endereco, numero: e.target.value } })}
                                        onBlur={() => handleBuscarCoordenadas(true)}
                                        required
                                    />
                                </InputGroup>
                                <InputGroup>
                                    <label>Bairro</label>
                                    <input
                                        placeholder="Centro"
                                        value={dados.endereco.bairro}
                                        onChange={e => setDados({ ...dados, endereco: { ...dados.endereco, bairro: e.target.value } })}
                                        required
                                    />
                                </InputGroup>
                            </InputRow>

                            <InputRow>
                                <InputGroup>
                                    <label>Cidade</label>
                                    <input
                                        placeholder="Belo Horizonte"
                                        value={dados.endereco.cidade}
                                        onChange={e => setDados({ ...dados, endereco: { ...dados.endereco, cidade: e.target.value } })}
                                        onBlur={() => handleBuscarCoordenadas(true)}
                                        required
                                    />
                                </InputGroup>
                                <InputGroup>
                                    <label>UF</label>
                                    <input
                                        placeholder="MG"
                                        maxLength={2}
                                        value={dados.endereco.uf}
                                        onChange={e => setDados({ ...dados, endereco: { ...dados.endereco, uf: e.target.value.toUpperCase() } })}
                                        onBlur={() => handleBuscarCoordenadas(true)}
                                        required
                                    />
                                </InputGroup>
                            </InputRow>
                        </Secao>

                        <Separador />

                        <Secao>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <TituloSecao>Configurações de Geofencing</TituloSecao>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <BotaoAcaoRapida
                                        type="button"
                                        onClick={() => setMapaAberto(!mapaAberto)}
                                        $ativo={mapaAberto}
                                    >
                                        <FiMap /> {mapaAberto ? "Ocultar Mapa" : "Ver no Mapa"}
                                    </BotaoAcaoRapida>
                                    <BotaoAcaoRapida type="button" onClick={() => handleBuscarCoordenadas(false)} disabled={buscandoGeo}>
                                        {buscandoGeo ? "Buscando..." : "Atualizar Coordenadas"}
                                    </BotaoAcaoRapida>
                                </div>
                            </div>

                            {mapaAberto && (
                                <MapaWrapper>
                                    <MapaConfig
                                        lat={dados.config.lat}
                                        lng={dados.config.lng}
                                        raio={dados.config.raioM}
                                        onMove={({ lat, lng }) => {
                                            setLocalizacaoManual(true);
                                            setDados(prev => ({
                                                ...prev,
                                                config: { ...prev.config, lat, lng }
                                            }));
                                        }}
                                    />
                                    <small>Você pode arrastar o marcador para o local exato se necessário.</small>
                                </MapaWrapper>
                            )}

                            <InputGroup>
                                <label>Nome no Painel</label>
                                <input
                                    placeholder="ex: Escola Municipal"
                                    value={dados.config.nomePainel}
                                    onChange={e => setDados({ ...dados, config: { ...dados.config, nomePainel: e.target.value } })}
                                    required
                                />
                            </InputGroup>

                            <InputRow>
                                <InputGroup>
                                    <label>Latitude</label>
                                    <input
                                        type="number" step="any"
                                        value={dados.config.lat}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setDados(prev => ({ ...prev, config: { ...prev.config, lat: val === "" ? "" : Number(val) } }));
                                        }}
                                        required
                                    />
                                </InputGroup>
                                <InputGroup>
                                    <label>Longitude</label>
                                    <input
                                        type="number" step="any"
                                        value={dados.config.lng}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setDados(prev => ({ ...prev, config: { ...prev.config, lng: val === "" ? "" : Number(val) } }));
                                        }}
                                        required
                                    />
                                </InputGroup>
                            </InputRow>

                            <InputGroup>
                                <label>Raio de Geofencing (Metros)</label>
                                <input
                                    type="number"
                                    value={dados.config.raioM}
                                    onChange={e => setDados(prev => ({ ...prev, config: { ...prev.config, raioM: Number(e.target.value) } }))}
                                    required
                                />
                                <small>Cada empresa possui seu próprio raio de bloqueio.</small>
                            </InputGroup>
                        </Secao>

                        <Separador />

                        <Secao>
                            <TituloSecao>Módulos Ativos (SaaS)</TituloSecao>
                            <GridConfig>
                                {/* FACE ID - Enterprise */}
                                <ToggleWrapper $disabled={!PLANOS_MODULOS[dados.plano]?.includes('face')}>
                                    <label>
                                        <ToggleSwitch
                                            $ativo={dados.config.modulos?.face}
                                            $disabled={!PLANOS_MODULOS[dados.plano]?.includes('face')}
                                            onClick={() => {
                                                if (!PLANOS_MODULOS[dados.plano]?.includes('face')) return;
                                                setDados({ ...dados, config: { ...dados.config, modulos: { ...dados.config.modulos, face: !dados.config.modulos?.face } } });
                                            }}
                                        >
                                            <span />
                                        </ToggleSwitch>
                                        Reconhecimento Facial
                                        {!PLANOS_MODULOS[dados.plano]?.includes('face') && <BadgePlano>Enterprise</BadgePlano>}
                                    </label>
                                    <small>Exige foto do colaborador ao bater o ponto.</small>
                                </ToggleWrapper>

                                {/* GELO LOCALIZAÇÃO - Pro+ */}
                                <ToggleWrapper $disabled={!PLANOS_MODULOS[dados.plano]?.includes('geo')}>
                                    <label>
                                        <ToggleSwitch
                                            $ativo={dados.config.modulos?.geo}
                                            $disabled={!PLANOS_MODULOS[dados.plano]?.includes('geo')}
                                            onClick={() => {
                                                if (!PLANOS_MODULOS[dados.plano]?.includes('geo')) return;
                                                setDados({ ...dados, config: { ...dados.config, modulos: { ...dados.config.modulos, geo: !dados.config.modulos?.geo } } });
                                            }}
                                        >
                                            <span />
                                        </ToggleSwitch>
                                        Geolocalização
                                        {!PLANOS_MODULOS[dados.plano]?.includes('geo') && <BadgePlano>Pro</BadgePlano>}
                                    </label>
                                    <small>Valida a posição GPS do colaborador.</small>
                                </ToggleWrapper>

                                {/* JUSTIFICATIVAS - Pro+ */}
                                <ToggleWrapper $disabled={!PLANOS_MODULOS[dados.plano]?.includes('justificativas')}>
                                    <label>
                                        <ToggleSwitch
                                            $ativo={dados.config.modulos?.justificativas}
                                            $disabled={!PLANOS_MODULOS[dados.plano]?.includes('justificativas')}
                                            onClick={() => {
                                                if (!PLANOS_MODULOS[dados.plano]?.includes('justificativas')) return;
                                                setDados({ ...dados, config: { ...dados.config, modulos: { ...dados.config.modulos, justificativas: !dados.config.modulos?.justificativas } } });
                                            }}
                                        >
                                            <span />
                                        </ToggleSwitch>
                                        Justificativas
                                        {!PLANOS_MODULOS[dados.plano]?.includes('justificativas') && <BadgePlano>Pro</BadgePlano>}
                                    </label>
                                    <small>Permite que colaboradores enviem atestados/justificativas.</small>
                                </ToggleWrapper>

                                {/* BANCO DE HORAS - Pro+ */}
                                <ToggleWrapper $disabled={!PLANOS_MODULOS[dados.plano]?.includes('bancoHoras')}>
                                    <label>
                                        <ToggleSwitch
                                            $ativo={dados.config.modulos?.bancoHoras}
                                            $disabled={!PLANOS_MODULOS[dados.plano]?.includes('bancoHoras')}
                                            onClick={() => {
                                                if (!PLANOS_MODULOS[dados.plano]?.includes('bancoHoras')) return;
                                                setDados({ ...dados, config: { ...dados.config, modulos: { ...dados.config.modulos, bancoHoras: !dados.config.modulos?.bancoHoras } } });
                                            }}
                                        >
                                            <span />
                                        </ToggleSwitch>
                                        Banco de Horas
                                        {!PLANOS_MODULOS[dados.plano]?.includes('bancoHoras') && <BadgePlano>Pro</BadgePlano>}
                                    </label>
                                    <small>Cálculo automático de saldo de horas positivas/negativas.</small>
                                </ToggleWrapper>

                                {/* RELATÓRIOS - Básico+ */}
                                <ToggleWrapper $disabled={!PLANOS_MODULOS[dados.plano]?.includes('relatorios')}>
                                    <label>
                                        <ToggleSwitch
                                            $ativo={dados.config.modulos?.relatorios}
                                            $disabled={!PLANOS_MODULOS[dados.plano]?.includes('relatorios')}
                                            onClick={() => {
                                                if (!PLANOS_MODULOS[dados.plano]?.includes('relatorios')) return;
                                                setDados({ ...dados, config: { ...dados.config, modulos: { ...dados.config.modulos, relatorios: !dados.config.modulos?.relatorios } } });
                                            }}
                                        >
                                            <span />
                                        </ToggleSwitch>
                                        Relatórios PDF/CSV
                                        {!PLANOS_MODULOS[dados.plano]?.includes('relatorios') && <BadgePlano>Básico</BadgePlano>}
                                    </label>
                                    <small>Permite exportar dados para contabilidade.</small>
                                </ToggleWrapper>
                            </GridConfig>
                        </Secao>

                        <Separador />

                        <Secao>
                            <TituloSecao>Regras de Negócio & Visual</TituloSecao>
                            <GridConfig>
                                <ToggleWrapper>
                                    <label>
                                        <ToggleSwitch
                                            $ativo={dados.config.regras?.exigirFace}
                                            onClick={() => setDados({ ...dados, config: { ...dados.config, regras: { ...dados.config.regras, exigirFace: !dados.config.regras?.exigirFace } } })}
                                        >
                                            <span />
                                        </ToggleSwitch>
                                        Bloquear se Face Falhar
                                    </label>
                                    <small>Impede o registro se o rosto não for reconhecido.</small>
                                </ToggleWrapper>

                                <ToggleWrapper>
                                    <label>
                                        <ToggleSwitch
                                            $ativo={dados.config.regras?.exigirGeo}
                                            onClick={() => setDados({ ...dados, config: { ...dados.config, regras: { ...dados.config.regras, exigirGeo: !dados.config.regras?.exigirGeo } } })}
                                        >
                                            <span />
                                        </ToggleSwitch>
                                        Bloquear Fora do Raio
                                    </label>
                                    <small>Impede o registro se o GPS estiver fora da sede.</small>
                                </ToggleWrapper>

                                <ToggleWrapper>
                                    <label>
                                        <ToggleSwitch
                                            $ativo={dados.config.regras?.loginPorMatricula}
                                            onClick={() => setDados({ ...dados, config: { ...dados.config, regras: { ...dados.config.regras, loginPorMatricula: !dados.config.regras?.loginPorMatricula } } })}
                                        >
                                            <span />
                                        </ToggleSwitch>
                                        Login por Matrícula
                                    </label>
                                    <small>Permite entrar usando Código + Matrícula em vez de e-mail.</small>
                                    {dados.config.regras?.loginPorMatricula && (
                                        <InputGroup style={{ marginTop: 8 }}>
                                            <label>Quantidade de Dígitos da Matrícula</label>
                                            <select
                                                value={dados.config.regras?.digitosMatricula || 8}
                                                onChange={e => setDados({
                                                    ...dados,
                                                    config: {
                                                        ...dados.config,
                                                        regras: { ...dados.config.regras, digitosMatricula: Number(e.target.value) }
                                                    }
                                                })}
                                            >
                                                {[4, 5, 6, 7, 8, 9, 10].map(n => (
                                                    <option key={n} value={n}>{n} dígitos</option>
                                                ))}
                                            </select>
                                        </InputGroup>
                                    )}
                                </ToggleWrapper>
                            </GridConfig>

                            <SeparadorMini />
                            <TituloSubSecao>Configuração de Jornada (Opcional)</TituloSubSecao>
                            <InputRow style={{ marginTop: '8px' }}>
                                <InputGroup>
                                    <label>Carga Horária Semanal (Horas)</label>
                                    <input
                                        type="number"
                                        placeholder="ex: 44"
                                        value={dados.config.regras?.cargaHorariaSemanal || ""}
                                        onChange={e => setDados({
                                            ...dados,
                                            config: {
                                                ...dados.config,
                                                regras: { ...dados.config.regras, cargaHorariaSemanal: e.target.value }
                                            }
                                        })}
                                    />
                                </InputGroup>
                            </InputRow>

                            <label style={{ display: 'block', marginTop: '16px', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: 'var(--texto2)' }}>
                                Pontos a serem registrados:
                            </label>
                            <GridConfig>
                                {[
                                    { id: 'entrada', label: 'Entrada' },
                                    { id: 'intervalo_saida', label: 'Início Intervalo' },
                                    { id: 'intervalo_entrada', label: 'Fim Intervalo' },
                                    { id: 'saida', label: 'Saída' }
                                ].map(ponto => (
                                    <ToggleWrapper key={ponto.id}>
                                        <label>
                                            <ToggleSwitch
                                                $ativo={dados.config.regras?.pontosAtivos?.includes(ponto.id)}
                                                onClick={() => {
                                                    const atuais = dados.config.regras?.pontosAtivos || [];
                                                    const novos = atuais.includes(ponto.id)
                                                        ? atuais.filter(a => a !== ponto.id)
                                                        : [...atuais, ponto.id];
                                                    setDados({
                                                        ...dados,
                                                        config: {
                                                            ...dados.config,
                                                            regras: { ...dados.config.regras, pontosAtivos: novos }
                                                        }
                                                    });
                                                }}
                                            >
                                                <span />
                                            </ToggleSwitch>
                                            {ponto.label}
                                        </label>
                                    </ToggleWrapper>
                                ))}
                            </GridConfig>

                            <InputRow style={{ marginTop: '16px' }}>
                                <InputGroup>
                                    <label>Cor Primária (Hex)</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="color"
                                            value={dados.config.visual?.corPrimaria || "#2f81f7"}
                                            onChange={e => setDados({ ...dados, config: { ...dados.config, visual: { ...dados.config.visual, corPrimaria: e.target.value } } })}
                                            style={{ width: '44px', padding: '4px', cursor: 'pointer' }}
                                        />
                                        <input
                                            placeholder="#2f81f7"
                                            value={dados.config.visual?.corPrimaria}
                                            onChange={e => setDados({ ...dados, config: { ...dados.config, visual: { ...dados.config.visual, corPrimaria: e.target.value } } })}
                                        />
                                    </div>
                                </InputGroup>
                                <InputGroup>
                                    <label>URL do Logo Personalizado</label>
                                    <input
                                        placeholder="https://..."
                                        value={dados.config.visual?.logoUrl}
                                        onChange={e => setDados({ ...dados, config: { ...dados.config, visual: { ...dados.config.visual, logoUrl: e.target.value } } })}
                                    />
                                </InputGroup>
                            </InputRow>
                        </Secao>
                    </ScrollArea>

                    <Footer>
                        <BotaoGhost type="button" onClick={onFechar}>Cancelar</BotaoGhost>
                        <BotaoPrincipal type="submit" disabled={salvando}>
                            {salvando ? "Salvando..." : <><FiCheck /> Salvar Empresa</>}
                        </BotaoPrincipal>
                    </Footer>
                </Formulario>
            </ModalConteudo >
        </Overlay >
    );
}

/* Styled */

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
    max-width: 1200px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    margin: auto;

    @media (max-width: 920px) {
        max-width: 95%;
    }
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
    font-size: 20px;
    cursor: pointer;
    &:hover { color: #fff; }
`;

const Formulario = styled.form`
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const ScrollArea = styled.div`
    padding: 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 24px;

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
    }
`;

const Secao = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const TituloSecao = styled.h4`
    font-size: 14px;
    font-weight: 700;
    color: #2f81f7;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const InputRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
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

        &:focus { border-color: #2f81f7; }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    small { font-size: 11px; color: #8d8d99; }
`;

const Separador = styled.div`
    height: 1px;
    background: rgba(255, 255, 255, 0.05);
`;

const Footer = styled.div`
    padding: 24px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const BotaoPrincipal = styled.button`
    height: 44px;
    padding: 0 24px;
    background: #2f81f7;
    color: #fff;
    border: 0;
    border-radius: 8px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    &:disabled { opacity: 0.5; }
`;

const BotaoGhost = styled.button`
    height: 44px;
    padding: 0 24px;
    background: transparent;
    color: #8d8d99;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    &:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }
`;

const BotaoAcaoRapida = styled.button`
    background: ${props => props.$ativo ? "#2f81f7" : "rgba(47, 129, 247, 0.1)"};
    border: 1px solid ${props => props.$ativo ? "#2f81f7" : "rgba(47, 129, 247, 0.2)"};
    color: ${props => props.$ativo ? "#fff" : "#2f81f7"};
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;

    &:hover:not(:disabled) {
        background: #2f81f7;
        color: #fff;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const MapaWrapper = styled.div`
    width: 100%;
    margin: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;

    small {
        font-size: 11px;
        color: #8d8d99;
        text-align: center;
    }
`;

const GridConfig = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;

    @media (max-width: 600px) {
        grid-template-columns: 1fr;
    }
`;

const ToggleWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    label {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        font-weight: 600;
        color: ${props => props.$disabled ? 'rgba(255,255,255,0.4)' : '#fff'};
        cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    }

    small {
        font-size: 12px;
        color: ${props => props.$disabled ? 'rgba(141,141,153,0.4)' : '#8d8d99'};
        line-height: 1.4;
    }
`;

const BadgePlano = styled.span`
    background: rgba(235, 77, 75, 0.15);
    color: #eb4d4b;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 700;
    text-transform: uppercase;
    margin-left: auto;
`;

const ToggleSwitch = styled.div`
    width: 40px;
    height: 20px;
    border-radius: 10px;
    background: ${props => props.$ativo ? (props.$disabled ? "rgba(47,129,247,0.5)" : "#2f81f7") : "rgba(255,255,255,0.1)"};
    position: relative;
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    transition: background 0.2s;
    flex-shrink: 0;
    opacity: ${props => props.$disabled ? 0.5 : 1};

    span {
        position: absolute;
        top: 2px;
        left: ${props => props.$ativo ? "22px" : "2px"};
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        transition: left 0.2s;
    }
`;

const SeparadorMini = styled.div`
    height: 1px;
    background: rgba(255, 255, 255, 0.05);
    margin: 8px 0;
`;

const TituloSubSecao = styled.h5`
    font-size: 11px;
    font-weight: 800;
    color: #8d8d99;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
`;

