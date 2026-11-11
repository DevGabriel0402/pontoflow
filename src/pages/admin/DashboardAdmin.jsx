import React from "react";
import styled from "styled-components";
import { useAdminPontos } from "../../hooks/useAdminPontos";
import { exportarPontosPdf } from "../../utils/exportarPontosPdf";
import { exportarResumoPdf } from "../../utils/exportarResumoPdf";
import { exportarMensalPdf } from "../../utils/exportarMensalPdf";
import { exportarParaCsv } from "../../utils/exportarCsv";
import { useNavigate } from "react-router-dom";
import ModalMapaPonto from "../../components/ModalMapaPonto";
import {
  FiFileText, FiFile, FiSearch, FiGrid, FiClock, FiSettings, FiDownload, FiMapPin, FiAlertTriangle, FiAlertCircle, FiCheckSquare, FiMoreVertical, FiUserPlus, FiUsers, FiUserCheck, FiUserX, FiArrowLeft, FiMap, FiCalendar, FiCheckCircle, FiTrash2, FiMessageSquare, FiEdit2, FiDatabase, FiLock, FiLogOut, FiKey,
  FiShield, FiBell, FiPlus, FiUpload, FiShare2, FiChevronDown
} from "react-icons/fi";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import SeletorAcordeao from "../../components/SeletorAcordeao";
import ModalEditarFuncionario from "../../components/admin/ModalEditarFuncionario";
import MapaConfig from "../../components/admin/MapaConfig";
import ModalConfirmacao from "../../components/ModalConfirmacao";
import { db } from "../../services/firebase";
import { doc, setDoc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { useAdminFuncionarios } from "../../hooks/useAdminFuncionarios";
import TabbarAdminMobile from "../../components/admin/TabbarAdminMobile";
import { useConfig } from "../../contexts/ConfigContexto";
import LoadingGlobal from "../../components/LoadingGlobal";
import { deletarFuncionarioFn, corrigirCompanyFn, resetarSenhaPadraoFn } from "../../services/funcoes";
import { useAuth } from "../../contexts/AuthContexto";
import BannerNovaAtualizacao from "../../components/admin/BannerNovaAtualizacao";
import PainelJustificativas from "../../components/admin/PainelJustificativas";
import PainelBancoHoras from "../../components/admin/PainelBancoHoras";
import PainelCadastro from "../../components/admin/PainelCadastro";
import ModalTrocaSenha from "../../components/colaborador/ModalTrocaSenha";
import ModalCompartilharSistema from "../../components/admin/ModalCompartilharSistema";
import BotaoTema from "../../components/BotaoTema";
import { usePonto } from "../../hooks/usePonto";
import { calcularResumoDiario, formatarDuracao } from "../../utils/pontoUtils";
import { MOTIVOS_JUSTIFICATIVA } from "../../components/colaborador/ModalJustificativa";
import { maskMatricula } from "../../utils/mascaras";
import DateRangePicker from "../../components/DateRangePicker";
import { INITIAL_MANUAL_DATA, gerarManualHtml } from "../../utils/manualTemplate";
import { baixarBackup, restaurarBackup } from "../../services/backup";

const TIPOS = [
  { value: "TODOS", label: "Todos" },
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saída" },
];

const getMotivoLabel = (motivoValue) => {
  const m = MOTIVOS_JUSTIFICATIVA.find(opt => opt.value === motivoValue);
  return m ? m.label : "Justificado";
};

function formatarTipo(tipo) {
  const map = {
    ENTRADA: "Entrada",
    SAIDA: "Saída",
  };
  return map[tipo] || tipo;
}

function getDataPonto(p) {
  if (p?.dataHoraOriginal) return new Date(p.dataHoraOriginal);
  if (p?.criadoEmLocal) return new Date(p.criadoEmLocal);
  if (p?.criadoEm?.toDate) return p.criadoEm.toDate();
  if (p?.criadoEm) return new Date(p.criadoEm);
  return null;
}

function formatarData(p) {
  const d = getDataPonto(p);
  if (!d) return "—";
  try {
    if (isNaN(d.getTime())) return "Data Inválida";
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch (e) {
    return "Erro Data";
  }
}

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const { usuario, perfil, logout, temModulo, empresaConfig } = useAuth();
  const corPrimaria = empresaConfig?.config?.visual?.corPrimaria || "var(--cor-primaria, #2f81f7)";
  const logoUrl = empresaConfig?.config?.visual?.logoUrl || "/icons/pwa-512x512.png";
  const isSuperAdmin = perfil?.isSuperAdmin === true;
  const { itens, carregando, erro } = useAdminPontos();
  const { config, nomePainel } = useConfig();
  const temPonto = (id) => {
    // Se não houver config ou pontosAtivos, mostra tudo (fallback legacy)
    const ativos = config?.regras?.pontosAtivos || configPontosAtivos || ['entrada', 'saida'];
    return ativos.includes(id);

  };
  const { validacao, validarLocal } = usePonto();

  const [buscaNome, setBuscaNome] = React.useState("");
  const [tipo, setTipo] = React.useState("TODOS");
  const [dataInicio, setDataInicio] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return format(d, "yyyy-MM-dd");
  });
  const [dataFim, setDataFim] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [mostrarToast, setMostrarToast] = React.useState(false);
  const [abaAtiva, setAbaAtiva] = React.useState("DASHBOARD"); // DASHBOARD, HISTORICO, FUNCIONARIOS, CONFIG
  const [modalSenhaAberto, setModalSenhaAberto] = React.useState(false);
  const [modalCompartilharAberto, setModalCompartilharAberto] = React.useState(false);
  const [secoesAbertasConfig, setSecoesAbertasConfig] = React.useState({ regime: true, geo: false });

  const toggleSecaoConfig = (chave) => {
    setSecoesAbertasConfig(prev => ({ ...prev, [chave]: !prev[chave] }));
  };
  const [funcEditando, setFuncEditando] = React.useState(null);
  const [confirmarExclusao, setConfirmarExclusao] = React.useState({ aberto: false, func: null });
  const [confirmarResetSenha, setConfirmarResetSenha] = React.useState({ aberto: false, func: null });
  const [resetandoSenha, setResetandoSenha] = React.useState(false);

  // Lista de funcionários para a aba específica
  const { funcionarios, carregando: carregandoFuncs, erro: erroFuncs } = useAdminFuncionarios();
  const [buscaFunc, setBuscaFunc] = React.useState("");

  // Estados para Configurações (Geofencing)
  const [configRaio, setConfigRaio] = React.useState(120);
  const [configLat, setConfigLat] = React.useState(-19.9440459);
  const [configLng, setConfigLng] = React.useState(-43.9147834);
  const [tempNomePainel, setTempNomePainel] = React.useState("");
  const [pontoParaMapa, setPontoParaMapa] = React.useState(null);
  const [configPontosAtivos, setConfigPontosAtivos] = React.useState(['entrada', 'saida']);
  const [salvandoConfig, setSalvandoConfig] = React.useState(false);
  const [bancoHoras, setBancoHoras] = React.useState([]);
  const backupInputRef = React.useRef(null);
  const [processandoBackup, setProcessandoBackup] = React.useState(false);

  const handleBaixarBackup = async () => {
    setProcessandoBackup(true);
    try {
      await baixarBackup();
      toast.success("Backup baixado com sucesso.");
    } catch (error) {
      toast.error(error?.message || "Não foi possível gerar o backup.");
    } finally {
      setProcessandoBackup(false);
    }
  };

  const handleRestaurarBackup = async (event) => {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    if (!window.confirm("Restaurar este backup? Os dados serão mesclados e nenhum registro atual será apagado.")) return;

    setProcessandoBackup(true);
    try {
      const backup = JSON.parse(await arquivo.text());
      const resultado = await restaurarBackup(backup);
      toast.success(`${resultado.registrosRestaurados} registros restaurados.`);
    } catch (error) {
      toast.error(error?.message || "Arquivo de backup inválido.");
    } finally {
      setProcessandoBackup(false);
    }
  };

  // Estados para Calendário e Ausências
  const [listaFeriados, setListaFeriados] = React.useState([]);
  const [listaAusencias, setListaAusencias] = React.useState([]);
  const [novaAusencia, setNovaAusencia] = React.useState({
    userId: "",
    dataInicio: format(new Date(), "yyyy-MM-dd"),
    dataFim: format(new Date(), "yyyy-MM-dd"),
    tipo: "FERIADO",
    motivo: ""
  });

  // Validar local ao abrir o painel
  React.useEffect(() => {
    validarLocal();
  }, [validarLocal]);

  // Carregar config inicial do Firestore de forma isolada por empresa
  React.useEffect(() => {
    const carregar = async () => {
      try {
        const companyId = perfil?.companyId;
        const docRef = companyId
          ? doc(db, "companies", companyId)
          : doc(db, "settings", "geofencing");

        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const configData = data.config || data; // Se for empresa, está em .config; se for global, é o próprio data

          if (configData.raio || configData.raioM) setConfigRaio(configData.raioM || configData.raio);
          if (configData.lat) setConfigLat(configData.lat);
          if (configData.lng) setConfigLng(configData.lng);
          if (configData.nomePainel) {
            setTempNomePainel(configData.nomePainel);
          }
          if (configData.feriados) setListaFeriados(configData.feriados);
          if (configData.ausencias) setListaAusencias(configData.ausencias);
          const pAtivos = configData.regras?.pontosAtivos || configData.pontosAtivos;
          if (Array.isArray(pAtivos) && pAtivos.length > 0) {
            setConfigPontosAtivos(pAtivos);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar settings:", e);
      }
    };
    carregar();
  }, [perfil?.companyId]);

  // Busca lançamentos do banco de horas para cálculo de saldo total
  React.useEffect(() => {
    if (!perfil?.companyId) return;
    const q = query(
      collection(db, "banco_horas"),
      where("companyId", "==", perfil.companyId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setBancoHoras(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [perfil?.companyId]);

  const handleSalvarConfig = async () => {
    setSalvandoConfig(true);
    try {
      const companyId = perfil?.companyId;

      if (companyId) {
        // Salva na empresa específica
        await updateDoc(doc(db, "companies", companyId), {
          "config.raioM": Number(configRaio),
          "config.lat": Number(configLat),
          "config.lng": Number(configLng),
          "config.nomePainel": tempNomePainel.trim() || nomePainel,
          "config.feriados": listaFeriados,
          "config.ausencias": listaAusencias,
          "config.regras.pontosAtivos": configPontosAtivos,
          "config.atualizadoEm": new Date(),
        });
      } else {
        // Fallback global (legado ou superadmin)
        await setDoc(doc(db, "settings", "geofencing"), {
          raio: Number(configRaio),
          lat: Number(configLat),
          lng: Number(configLng),
          nomePainel: tempNomePainel.trim() || nomePainel,
          feriados: listaFeriados,
          ausencias: listaAusencias,
          "regras.pontosAtivos": configPontosAtivos,
          atualizadoEm: new Date(),
        });
      }
      toast.success("Configurações salvas localmente para sua empresa!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar. Verifique suas permissões.");
    } finally {
      setSalvandoConfig(false);
    }
  };

  React.useEffect(() => {
    if (mostrarToast) {
      const timer = setTimeout(() => {
        setMostrarToast(false);
      }, 3000); // 3 segundos
      return () => clearTimeout(timer);
    }
  }, [mostrarToast]);

  // --- Funções de Exportação ---
  const gerarPdf = () => {
    const periodo =
      dataInicio || dataFim
        ? `${dataInicio || "…"} até ${dataFim || "…"} `
        : "Todos os períodos";

    exportarPontosPdf(filtrados, {
      titulo: `Relatório de Pontos — ${nomePainel}`,
      empresa: nomePainel,
      periodo,
      nomeArquivo: `relatorio_pontos_${format(new Date(), "yyyy-MM-dd_HH-mm")}.pdf`,
    });

    setMostrarToast(true);
  };

  const handleGerarResumoPdf = () => {
    const periodo =
      dataInicio || dataFim
        ? `${dataInicio ? format(new Date(`${dataInicio}T12:00:00`), "dd/MM/yyyy") : "…"} até ${dataFim ? format(new Date(`${dataFim}T12:00:00`), "dd/MM/yyyy") : "…"} `
        : "Todos os períodos";

    exportarResumoPdf(resumoJornada, {
      empresa: nomePainel,
      periodo,
      totalGeral: totalHorasPeriodo,
      pontosAtivos: config?.regras?.pontosAtivos
    });

    setMostrarToast(true);
  };

  const handleGerarMensalPdf = () => {
    const periodo =
      dataInicio || dataFim
        ? `${dataInicio ? format(new Date(`${dataInicio}T12:00:00`), "dd/MM/yyyy") : "…"} até ${dataFim ? format(new Date(`${dataFim}T12:00:00`), "dd/MM/yyyy") : "…"} `
        : "Todos os períodos";

    exportarMensalPdf(resumoJornada, {
      empresa: nomePainel,
      periodo,
      pontosAtivos: config?.regras?.pontosAtivos
    });

    setMostrarToast(true);
  };

  const handleBaixarManual = async () => {
    try {
      const snap = await getDoc(doc(db, "settings", "manual"));
      const conteudo = snap.exists() ? snap.data().template : INITIAL_MANUAL_DATA;
      const htmlFinal = gerarManualHtml(conteudo);

      const win = window.open("", "_blank");
      win.document.write(htmlFinal);
      win.document.close();
    } catch (e) {
      console.error("Erro ao baixar manual:", e);
      const win = window.open("", "_blank");
      win.document.write(gerarManualHtml(INITIAL_MANUAL_DATA));
      win.document.close();
    }
  };

  const handleExportarCsvHistorico = () => {
    const dados = filtrados.map(p => ({
      funcionario: p.userName || "—",
      tipo: formatarTipo(p.type),
      data: formatarData(p),
      origem: p.origem === "offline_queue" ? "Offline" : "Online",
      ip: p.ip || "—",
      status: p.dentroDoRaio ? "Dentro do Raio" : "Fora do Raio",
      distancia: typeof p.distanciaRelativa === "number" ? `${p.distanciaRelativa} m` : "X"
    }));

    exportarParaCsv({
      dados,
      colunas: ["Funcionário", "Tipo", "Data/Hora", "Origem", "IP", "Status Localização", "Distância"],
      chaves: ["funcionario", "tipo", "data", "origem", "ip", "status", "distancia"],
      nomeArquivo: `historico_pontos_${format(new Date(), "yyyy-MM-dd")}.csv`
    });
    toast.success("Histórico exportado em CSV!");
  };

  const handleExportarCsvResumo = () => {
    const colunas = ["Funcionário", "Data"];
    const chaves = ["funcionario", "data"];

    if (temPonto('entrada')) { colunas.push("Entrada"); chaves.push("entrada"); }
    if (temPonto('intervalo_saida')) { colunas.push("Iní. Int"); chaves.push("iniInt"); }
    if (temPonto('intervalo_entrada')) { colunas.push("Fim Int"); chaves.push("fimInt"); }
    if (temPonto('saida')) { colunas.push("Saída"); chaves.push("saida"); }

    colunas.push("Total", "Status");
    chaves.push("total", "status");

    const dados = resumoJornada.map(j => ({
      funcionario: j.userName || "—",
      data: format(j.data, "dd/MM/yyyy"),
      entrada: j.check.entrada ? format(j.check.entrada, "HH:mm") : "—",
      iniInt: j.check.iniInt ? format(j.check.iniInt, "HH:mm") : "—",
      fimInt: j.check.fimInt ? format(j.check.fimInt, "HH:mm") : "—",
      saida: j.check.saida ? format(j.check.saida, "HH:mm") : "—",
      total: j.totalFormatado,
      status: j.status
    }));

    exportarParaCsv({
      dados,
      colunas,
      chaves,
      nomeArquivo: `resumo_jornada_${format(new Date(), "yyyy-MM-dd")}.csv`
    });
    toast.success("Resumo exportado em CSV!");
  };
  // -----------------------------

  const filtrados = React.useMemo(() => {
    const ini = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
    const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;

    return itens.filter((p) => {
      if (buscaNome && p.userId !== buscaNome) return false;
      if (tipo !== "TODOS" && p.type !== tipo) return false;

      let d;
      if (p.dataHoraOriginal) {
        d = new Date(p.dataHoraOriginal);
      } else {
        d = p.criadoEm?.toDate ? p.criadoEm.toDate() : (p.criadoEm ? new Date(p.criadoEm) : null);
      }

      if (!d) return true;

      if (ini && d < ini) return false;
      if (fim && d > fim) return false;

      return true;
    });
  }, [itens, buscaNome, tipo, dataInicio, dataFim]);

  const countAtivos = React.useMemo(() => {
    const ids = new Set(itens.map(p => p.userId));
    return ids.size;
  }, [itens]);

  const opcoesFuncionarios = React.useMemo(() => {
    const lista = (funcionarios || [])
      .filter(f => f.role !== 'admin')
      .map(f => ({ value: f.id, label: f.nome }));

    return [{ value: "", label: "Todos os Funcionários" }, ...lista];
  }, [funcionarios]);

  const resumoJornada = React.useMemo(() => {
    // 1. Determinar quais funcionários processar
    const funcsInteresse = (funcionarios || []).filter(f => f.role !== 'admin' && f.ativo !== false);

    const funcsProcessar = buscaNome
      ? funcsInteresse.filter(f => f.id === buscaNome)
      : funcsInteresse;

    const todosResumos = [];

    // 2. Calcular para cada um
    funcsProcessar.forEach(func => {
      const pontosUser = itens.filter(p => p.userId === func.id);
      const feriados = config?.feriados || [];

      const dZerado = func.bancoHorasZeradoEm?.toDate
        ? func.bancoHorasZeradoEm.toDate()
        : (func.bancoHorasZeradoEm ? new Date(func.bancoHorasZeradoEm) : null);

      const dataCriacao = dZerado || (func.criadoEm?.toDate ? func.criadoEm.toDate() : (func.criadoEm ? new Date(func.criadoEm) : null));

      // Filtrar apenas lançamentos feitos após a data de zeramento
      const lancamentosValidos = (bancoHoras || []).filter((l) => {
        if (l.userId !== func.id) return false;
        if (!dZerado) return true;
        let dLanc = l.criadoEm?.toDate ? l.criadoEm.toDate() : (l.dataReferencia ? new Date(`${l.dataReferencia}T12:00:00`) : null);
        if (dLanc && dLanc < dZerado) return false;
        return true;
      });

      // Extrair abonos (justificativas aprovadas ou abonos manuais) para este funcionário
      const abonosFunc = {};
      lancamentosValidos
        .filter(l => (
          (l.origem === "JUSTIFICATIVA_APROVADA" && l.minutos === 0 && l.descricao?.includes("Abono de Falta")) ||
          (l.origem === "ABONO_MANUAL")
        ))
        .forEach(l => {
          let dataKey = null;
          if (l.origem === "ABONO_MANUAL" && l.dataReferencia) {
            dataKey = l.dataReferencia;
          } else {
            const match = l.descricao?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
              dataKey = `${match[3]}-${match[2]}-${match[1]}`;
            }
          }
          if (dataKey) {
            abonosFunc[dataKey] = l.motivo ? getMotivoLabel(l.motivo) : "Justificado";
          }
        });

      // Injetar Ausências/Férias/Recessos configurados na empresa
      (config?.ausencias || []).forEach(aus => {
        if (aus.userId === func.id || !aus.userId) {
          try {
            let d = new Date(`${aus.dataInicio}T12:00:00`);
            const f = new Date(`${aus.dataFim}T12:00:00`);
            while (d <= f) {
              const key = format(d, "yyyy-MM-dd");
              abonosFunc[key] = aus.motivo || (aus.tipo === "FERIAS" ? "Férias" : (aus.tipo === "RECESSO" ? "Recesso" : (aus.tipo === "FERIADO" ? "Feriado" : "Abonado")));
              d.setDate(d.getDate() + 1);
            }
          } catch (e) { console.error("Erro ao processar ausência:", e); }
        }
      });

      const dataCriacaoTotal = dataCriacao || new Date();

      // Calcular resumo HISTÓRICO TOTAL (para o Saldo Total)
      const resumoHistorico = calcularResumoDiario(
        pontosUser,
        func.jornadas || func.jornada,
        abonosFunc, // Incluindo abonos aqui
        func.cargaHorariaSemanal,
        format(dataCriacaoTotal, "yyyy-MM-dd"),
        format(new Date(), "yyyy-MM-dd"),
        feriados,
        dataCriacaoTotal
      );

      const somaAuto = resumoHistorico.reduce((acc, d) => acc + (d.diferenca ?? 0), 0);
      const somaManual = lancamentosValidos
        .reduce((acc, l) => acc + (l.tipo === "CREDITO" ? l.minutos : -l.minutos), 0);

      const saldoTotal = somaAuto + somaManual;

      // Calcular resumo do PERÍODO SELECIONADO (para a tabela do PDF)
      const resumosUser = calcularResumoDiario(
        pontosUser,
        func.jornadas || func.jornada,
        abonosFunc, // Incluindo abonos aqui também
        func.cargaHorariaSemanal,
        dataInicio,
        dataFim,
        feriados,
        dataCriacao
      );

      resumosUser.forEach(r => {
        todosResumos.push({
          ...r,
          userId: func.id,
          userName: func.nome,
          totalMinutos: r.minutosTrabalhados,
          totalFormatado: formatarDuracao(r.minutosTrabalhados),
          saldo: saldoTotal
        });
      });
    });

    // 3. Ordenar por data decrescente (mais recente primeiro)
    return todosResumos.sort((a, b) => b.data - a.data);
  }, [itens, funcionarios, buscaNome, dataInicio, dataFim, config]);

  const totalHorasPeriodo = React.useMemo(() => {
    const totalMin = resumoJornada.reduce((acc, curr) => acc + curr.totalMinutos, 0);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m}m`;
  }, [resumoJornada]);


  const handleDeletarFuncionario = async () => {
    const funcionario = confirmarExclusao.func;
    if (!funcionario) return;

    const tId = toast.loading("Excluindo funcionário...");
    try {
      await deletarFuncionarioFn(funcionario.id);
      toast.success("Funcionário excluído com sucesso!", { id: tId });
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Erro ao excluir funcionário.", { id: tId });
    } finally {
      setConfirmarExclusao({ aberto: false, func: null });
    }
  };

  const handleResetarSenhaPadrao = (f) => {
    if (!f?.dataNascimento) {
      toast.error(`O funcionário ${f.nome || f.email} não possui data de nascimento cadastrada.`);
      return;
    }
    setConfirmarResetSenha({ aberto: true, func: f });
  };

  const executarResetSenha = async () => {
    const f = confirmarResetSenha.func;
    if (!f) return;

    setResetandoSenha(true);
    const tId = toast.loading(`Resetando senha de ${f.nome}...`);
    try {
      const res = await resetarSenhaPadraoFn(f.id);
      toast.success(
        `Senha de ${f.nome} resetada para a data de nascimento! Nova senha temporária: ${res.senhaPadrao}`,
        { id: tId, duration: 8000 }
      );
    } catch (err) {
      console.error("Erro ao resetar senha:", err);
      toast.error(err.message || "Erro ao resetar senha.", { id: tId, duration: 8000 });
    } finally {
      setResetandoSenha(false);
      setConfirmarResetSenha({ aberto: false, func: null });
    }
  };

  const handleNotificar = async (j) => {
    const tId = toast.loading(`Analisando pendências de ${j.userName}...`);
    try {
      const dataFormatada = format(j.data, "dd/MM/yyyy");
      const companyId = perfil?.companyId;
      if (!companyId || companyId === "default") {
        toast.error("Vínculo de empresa inválido. Sincronize seus dados.", { id: tId });
        return;
      }

      // Mapeamento de pendências
      const pendencias = [];

      // Verifica o que falta baseado nos pontos ativos e no que foi batido
      if (temPonto('entrada') && !j.check.entrada) pendencias.push({ label: "entrada", tipo: "ENTRADA" });
      if (temPonto('saida') && !j.check.saida) pendencias.push({ label: "saída", tipo: "SAIDA" });

      if (pendencias.length === 0) {
        toast.success("Nenhuma pendência encontrada para este dia.", { id: tId });
        return;
      }

      // Envia uma notificação para cada pendência
      for (const p of pendencias) {
        await addDoc(collection(db, "notificacoes"), {
          userId: j.userId,
          companyId,
          mensagem: `Você esqueceu de registrar sua ${p.label} do dia ${dataFormatada}. Por favor, justifique.`,
          data: serverTimestamp(),
          lida: false,
          tipo: "ponto_faltante",
          tipoAlerta: p.tipo,
          diaReferencia: j.dataKey
        });
      }

      toast.success(`${pendencias.length} notificações enviadas com sucesso!`, { id: tId });
    } catch (error) {
      console.error("Erro ao notificar:", error);
      toast.error("Erro ao enviar notificações.", { id: tId });
    }
  };

  return (
    <LayoutAdmin style={{ "--cor-primaria": corPrimaria }}>
      <Sidebar>
        <Branding>
          <Logo src={logoUrl} alt={nomePainel} />
          {nomePainel}
        </Branding>

        <Nav>
          <NavItem $ativo={abaAtiva === "DASHBOARD"} onClick={() => setAbaAtiva("DASHBOARD")}>
            <FiGrid /> <span>Visão Geral</span>
          </NavItem>
          <NavItem $ativo={abaAtiva === "FUNCIONARIOS"} onClick={() => setAbaAtiva("FUNCIONARIOS")}>
            <FiUsers /> <span>Funcionários</span>
          </NavItem>
          <NavItem $ativo={abaAtiva === "CADASTRO"} onClick={() => setAbaAtiva("CADASTRO")}>
            <FiUserPlus /> <span>Cadastrar</span>
          </NavItem>

          {temModulo('bancoHoras') && (
            <NavItem $ativo={abaAtiva === "BANCO_HORAS"} onClick={() => setAbaAtiva("BANCO_HORAS")}>
              <FiDatabase /> <span>Banco de Horas</span>
            </NavItem>
          )}

          {temModulo('justificativas') && (
            <NavItem $ativo={abaAtiva === "JUSTIFICATIVAS"} onClick={() => setAbaAtiva("JUSTIFICATIVAS")}>
              <FiMessageSquare /> <span>Justificativas</span>
            </NavItem>
          )}

          <NavItem $ativo={abaAtiva === "CONFIG"} onClick={() => setAbaAtiva("CONFIG")}>
            <FiSettings /> <span>Configurações</span>
          </NavItem>

          {isSuperAdmin && (
            <>
              <NavSeparador />
              <NavItem onClick={() => navigate("/master")} style={{ color: 'var(--cor-primaria, #2f81f7)' }}>
                <FiShield /> <span>Painel Master</span>
              </NavItem>
            </>
          )}

          <NavItem onClick={() => setModalCompartilharAberto(true)}>
            <FiShare2 /> <span>Compartilhar Sistema</span>
          </NavItem>

          <NavSeparador />

          <NavItem onClick={() => setModalSenhaAberto(true)}>
            <FiLock /> <span>Trocar Senha</span>
          </NavItem>

          <NavSeparador />

          <div style={{ padding: "4px 8px" }}>
            <BotaoTema texto={true} />
          </div>

          <NavSeparador />

          <NavItem onClick={logout} style={{ color: '#eb4d4b' }}>
            <FiLogOut /> <span>Sair</span>
          </NavItem>

          <NavSeparador />

          <StatusLocal>
            <div className="label">Status da Sede</div>
            <div className={`status ${validacao.ok ? 'online' : 'offline'}`}>
              <FiMapPin />
              {validacao.ok ? 'Você está na Sede' : 'Você está fora da Sede'}
            </div>
            {validacao.distance !== null && (
              <div className="distancia">
                Distância: {Math.round(validacao.distance)}m
              </div>
            )}
          </StatusLocal>
        </Nav>
      </Sidebar>

      <ConteudoPrincipal>
        <BannerNovaAtualizacao />

        {/* Indicador de Localização Mobile */}
        <StatusLocalMobile className={validacao.ok ? 'online' : 'offline'}>
          <div className="location-info">
            <FiMapPin />
            <span>{validacao.ok ? 'Na Sede' : 'Fora da Sede'}</span>
            {validacao.distance !== null && <strong>{Math.round(validacao.distance)}m</strong>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BotaoTema compacto={true} />
            <button className="logout-btn" onClick={logout}>
              <FiLogOut />
              Sair
            </button>
          </div>
        </StatusLocalMobile>

        {carregando && <LoadingGlobal />}
        {erro && <AvisoErro>{erro}</AvisoErro>}

        {!carregando && !erro && (
          <>
            {/* Removida aba HISTORICO conforme solicitação */}


            {abaAtiva === "DASHBOARD" && (
              <>
                <TituloSecao>Visão Geral</TituloSecao>
                <ResumoCards>
                  <Card>
                    <LabelCard>Funcionários Ativos</LabelCard>
                    <ValorCard>{funcionarios.filter(f => f.ativo).length}</ValorCard>
                  </Card>
                  <Card>
                    <LabelCard>Registros Totais</LabelCard>
                    <ValorCard>{itens.length}</ValorCard>
                  </Card>
                  <Card>
                    <LabelCard>Pontos com Alerta</LabelCard>
                    <ValorCard>{filtrados.filter(p => !p.dentroDoRaio).length}</ValorCard>
                  </Card>
                </ResumoCards>

                <div style={{ marginTop: '32px' }}>
                  <Topo>
                    <SeletorAcordeaoWrapper>
                      <SeletorAcordeao
                        opcoes={opcoesFuncionarios}
                        value={buscaNome}
                        onChange={(val) => setBuscaNome(val)}
                      />
                    </SeletorAcordeaoWrapper>

                    <DateRangePicker
                      startDate={dataInicio}
                      endDate={dataFim}
                      onChange={(ini, fim) => {
                        setDataInicio(ini);
                        setDataFim(fim);
                      }}
                    />

                    <GrupoBotoesExportar>
                      <BotaoExportar onClick={() => setModalCompartilharAberto(true)} style={{ background: 'rgba(79, 172, 254, 0.15)', color: '#4facfe', borderColor: 'rgba(79, 172, 254, 0.3)' }}>
                        <FiShare2 /> Compartilhar Sistema
                      </BotaoExportar>
                      {temModulo('relatorios') && (
                        <>
                          <BotaoExportar onClick={handleGerarMensalPdf} disabled={resumoJornada.length === 0}>
                            <FiFileText /> Mensal PDF
                          </BotaoExportar>
                          <BotaoExportar onClick={handleBaixarManual} style={{ background: 'rgba(241, 196, 15, 0.15)', color: '#f1c40f', borderColor: 'rgba(241, 196, 15, 0.3)' }}>
                            <FiFileText /> Baixar Manual
                          </BotaoExportar>
                          <BotaoExportar $csv onClick={handleExportarCsvResumo} disabled={resumoJornada.length === 0}>
                            <FiFile /> Resumo CSV
                          </BotaoExportar>
                        </>
                      )}
                    </GrupoBotoesExportar>
                  </Topo>

                  <TabelaContainer>
                    <ResumoHeader>
                      <div className="resumo-info">
                        <h3>Resumo de Jornada</h3>
                        <p>Detalhamento Diário — Últimos 30 Dias (Atualizado)</p>
                      </div>
                    </ResumoHeader>
                    <TabelaStyled>
                      <thead>
                        <tr>
                          <th>Funcionário</th>
                          <th>Data</th>
                          {temPonto('entrada') && <th>Entrada</th>}
                          {temPonto('saida') && <th>Saída</th>}
                          <th>Total Trabalhado</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumoJornada.map((j, index) => (
                          <tr key={`${j.userId}-${format(j.data, 'yyyy-MM-dd')}-${index}`}>
                            <td>{j.userName || "—"}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {format(j.data, 'dd/MM/yyyy')}
                                {j.status !== "Ok" && j.status !== "Futuro" && j.status !== "Hoje" && (
                                  <BtnNotificar
                                    onClick={() => handleNotificar(j)}
                                    title="Notificar colaborador sobre este dia"
                                  >
                                    <FiBell size={14} />
                                  </BtnNotificar>
                                )}
                              </div>
                            </td>
                            {temPonto('entrada') && (
                              <td>
                                {j.ponto_indices.entrada?.time ? format(j.ponto_indices.entrada.time, 'HH:mm') : '—'}
                                {j.ponto_indices.entrada?.foiJustificado && <IconJustificado />}
                              </td>
                            )}
                            {temPonto('saida') && (
                              <td>
                                {j.ponto_indices.saida?.time ? format(j.ponto_indices.saida.time, 'HH:mm') : '—'}
                                {j.ponto_indices.saida?.foiJustificado && <IconJustificado />}
                              </td>
                            )}
                            <td>{j.totalFormatado}</td>
                            <td>
                              <StatusBadge
                                $ativo={j.status === "Ok"}
                                $justificado={j.status !== "Ok" && j.status !== "Incompleto" && j.status !== "Falta"}
                              >
                                {j.status === "Ok" ? (
                                  <FiCheckCircle />
                                ) : (j.status !== "Incompleto" && j.status !== "Falta") ? (
                                  <FiAlertTriangle />
                                ) : (
                                  <FiAlertCircle />
                                )}
                                {j.status}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </TabelaStyled>
                  </TabelaContainer>
                </div>
              </>
            )}

            {abaAtiva === "FUNCIONARIOS" && (
              <>
                {erroFuncs && <AvisoErro>{erroFuncs}</AvisoErro>}

                <Topo>
                  <BuscaWrapper>
                    <FiSearch />
                    <input
                      placeholder="Buscar funcionário pelo nome ou email"
                      value={buscaFunc}
                      onChange={(e) => setBuscaFunc(e.target.value)}
                    />
                  </BuscaWrapper>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <BotaoGhost onClick={async () => {
                      try {
                        toast.loading('Sincronizando vínculos...', { id: 'fix-company' });
                        const result = await corrigirCompanyFn();
                        if (result.usersCorrigidos > 0 || result.pontosCorrigidos > 0) {
                          toast.success(`Corrigidos: ${result.usersCorrigidos} func. e ${result.pontosCorrigidos} pontos!`, { id: 'fix-company' });
                        } else {
                          toast.success('Tudo certo! Nenhum vínculo pendente de correção.', { id: 'fix-company' });
                        }
                      } catch (err) {
                        console.error(err);
                        toast.error(err?.message || 'Erro ao sincronizar vínculos.', { id: 'fix-company' });
                      }
                    }} title="Buscar funcionários antigos e vincular à sua empresa">
                      <FiCheckSquare size={16} />
                      <span className="esconder-mobile">Sincronizar</span>
                    </BotaoGhost>

                    <Botao onClick={() => setAbaAtiva("CADASTRO")}>
                      <FiUserPlus size={16} />
                      Novo Func.
                    </Botao>
                  </div>
                </Topo>

                <TabelaContainer>
                  <TabelaStyled>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Nome</th>
                        <th>Matrícula</th>
                        <th>Email</th>
                        <th>Jornada</th>
                        <th>Cargo</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funcionarios
                        .filter(f =>
                          f.nome?.toLowerCase().includes(buscaFunc.toLowerCase()) ||
                          f.email?.toLowerCase().includes(buscaFunc.toLowerCase())
                        )
                        .map((f) => (
                          <tr key={f.id}>
                            <td>
                              <StatusBadge $ativo={f.ativo}>
                                {f.ativo ? <FiUserCheck /> : <FiUserX />}
                                {f.ativo ? "Ativo" : "Inativo"}
                              </StatusBadge>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {f.nome}
                                {f.status === 'novo' && (
                                  <span style={{
                                    background: 'var(--cor-primaria)',
                                    color: '#fff',
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '900',
                                    textTransform: 'uppercase'
                                  }}>Novo</span>
                                )}
                                {f.exigirGeo === false && (
                                  <span title="Geofencing desativado para este colaborador" style={{
                                    background: '#f39c12',
                                    color: '#000',
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '700'
                                  }}>GPS Livre</span>
                                )}
                              </div>
                            </td>
                            <td style={{ fontSize: 13, fontWeight: 700, color: 'var(--cor-primaria)' }}>{maskMatricula(f.matricula) || "—"}</td>
                            <td>{f.email}</td>
                            <td style={{ fontSize: 12, whiteSpace: 'nowrap', fontWeight: 600, color: '#e1e1e6' }}>
                              {f.cargaHorariaSemanal
                                ? f.cargaHorariaSemanal
                                : f.jornada
                                  ? `${f.jornada.entrada} - ${f.jornada.saida}`
                                  : <span style={{ color: '#666' }}>Não definida</span>
                              }
                            </td>
                            <td>
                              {f.funcao
                                ? f.funcao
                                : f.role === 'admin' ? 'Administrador' : 'Colaborador'
                              }
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <BotaoAcao onClick={() => setFuncEditando(f)} title="Editar Funcionário">
                                  <FiEdit2 size={16} />
                                </BotaoAcao>

                                <BotaoAcao
                                  onClick={() => handleResetarSenhaPadrao(f)}
                                  title="Resetar senha para a data de nascimento padrão"
                                  style={{ color: '#e67e22', borderColor: 'rgba(230, 126, 34, 0.3)', background: 'rgba(230, 126, 34, 0.08)' }}
                                >
                                  <FiKey size={16} />
                                </BotaoAcao>

                                <BotaoAcao onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, "users", f.id), { ativo: !f.ativo });
                                    toast.success(`Usuário ${f.ativo ? 'desativado' : 'ativado'}!`);
                                  } catch (e) {
                                    toast.error("Erro ao mudar status.");
                                  }
                                }}>
                                  {f.ativo ? "Desativar" : "Ativar"}
                                </BotaoAcao>

                                <BtnAcao $perigoso onClick={() => setConfirmarExclusao({ aberto: true, func: f })} title="Excluir funcionário">
                                  <FiTrash2 size={16} />
                                  <span>Excluir</span>
                                </BtnAcao>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </TabelaStyled>
                </TabelaContainer>
              </>
            )}

            {abaAtiva === "CONFIG" && (
              <ConfigContainer>
                <ConfigHeaderWrapper>
                  <div className="info">
                    <span className="tag-secao">
                      <FiSettings size={12} /> Painel de Ajustes • Governança
                    </span>
                    <h2>Configurações do Sistema</h2>
                    <p>Gerencie parâmetros operacionais, geofencing, segurança e personalização da instituição.</p>
                  </div>
                  <div className="status-empresa-box">
                    <div className="dot" />
                    <div className="empresa-info">
                      <span className="label-empresa">INSTITUIÇÃO ATIVA</span>
                      <strong>{tempNomePainel || nomePainel || "PontoFlow Admin"}</strong>
                    </div>
                  </div>
                </ConfigHeaderWrapper>

                {/* GRUPO 1: Jornada & Regras de Batida */}
                <ConfigGrupo>
                  <ConfigGrupoHeader>
                    <div className="grupo-titulo">
                      <FiClock size={14} color="var(--cor-primaria, #2f81f7)" />
                      <span>Jornada & Regras de Batida</span>
                    </div>
                  </ConfigGrupoHeader>

                  <ConfigGrupoCard>
                    {/* 1. Regime de Registro de Ponto */}
                    <ConfigItemLinha>
                      <ConfigItemHeader $aberto={secoesAbertasConfig.regime} onClick={() => toggleSecaoConfig('regime')}>
                        <ConfigItemLeft>
                          <IconeBox style={{ color: 'var(--cor-primaria, #4facfe)', background: 'rgba(79, 172, 254, 0.12)' }}>
                            <FiClock size={20} />
                          </IconeBox>
                          <AccordionTitulos>
                            <h4>Regime de Registro de Ponto</h4>
                            <p>Formato de batidas diárias para os colaboradores</p>
                          </AccordionTitulos>
                        </ConfigItemLeft>
                        <ConfigItemRight>
                          <PillValorAtual>
                            {configPontosAtivos.length === 2 && configPontosAtivos.includes('entrada') && configPontosAtivos.includes('saida')
                              ? "Entrada e Saída (2 batidas)"
                              : "Personalizado"}
                          </PillValorAtual>
                          <AccordionChevron $aberto={secoesAbertasConfig.regime}>
                            <FiChevronDown size={20} />
                          </AccordionChevron>
                        </ConfigItemRight>
                      </ConfigItemHeader>

                    {secoesAbertasConfig.regime && (
                      <AccordionBody>
                        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'inherit', opacity: 0.85 }}>
                          Defina a forma como os colaboradores registrarão as batidas diárias na instituição.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                          <CardOpcaoRegime
                            $ativo={configPontosAtivos.length === 2 && configPontosAtivos.includes('entrada') && configPontosAtivos.includes('saida')}
                            onClick={() => setConfigPontosAtivos(['entrada', 'saida'])}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <strong>Somente Entrada e Saída (2 batidas)</strong>
                              {(configPontosAtivos.length === 2 && configPontosAtivos.includes('entrada') && configPontosAtivos.includes('saida')) && (
                                <span className="badge-ativo">Ativo</span>
                              )}
                            </div>
                            <p>
                              Fluxo suave e sem atrito. O colaborador registra a Entrada ao chegar e a Saída ao encerrar. Ideal para simplificar a rotina.
                            </p>
                          </CardOpcaoRegime>
                        </div>
                      </AccordionBody>
                    )}
                  </ConfigItemLinha>

                  {/* 2. Geofencing (Raio de Ponto) */}
                  <ConfigItemLinha>
                    <ConfigItemHeader $aberto={secoesAbertasConfig.geo} onClick={() => toggleSecaoConfig('geo')}>
                      <ConfigItemLeft>
                        <IconeBox style={{ color: '#2ecc71', background: 'rgba(46, 204, 113, 0.12)' }}>
                          <FiMapPin size={20} />
                        </IconeBox>
                        <AccordionTitulos>
                          <h4>Geofencing & Localização da Sede</h4>
                          <p>Raio de tolerância GPS e coordenadas da sede no mapa</p>
                        </AccordionTitulos>
                      </ConfigItemLeft>
                      <ConfigItemRight>
                        <PillValorAtual>
                          {configRaio ? `${configRaio}m • GPS Ativo` : "Não configurado"}
                        </PillValorAtual>
                        <AccordionChevron $aberto={secoesAbertasConfig.geo}>
                          <FiChevronDown size={20} />
                        </AccordionChevron>
                      </ConfigItemRight>
                    </ConfigItemHeader>

                    {secoesAbertasConfig.geo && (
                      <AccordionBody>
                        <ConfigBox style={{ background: 'transparent', padding: 0, border: 'none' }}>
                          <p>Defina o raio de tolerância para batida de ponto na sede da instituição.</p>
                          <div className="input-row">
                            <input
                              type="number"
                              placeholder="Ex: 500"
                              value={configRaio}
                              onChange={(e) => setConfigRaio(e.target.value)}
                            />
                            <span>metros</span>
                          </div>

                          <div style={{ marginTop: '24px' }}>
                            <h4>Localização da Sede</h4>
                            <p>Coordenadas centrais da instituição ou arraste o marcador no mapa.</p>
                            <div className="input-grid" style={{ marginBottom: '16px' }}>
                              <div className="input-group">
                                <label>Latitude</label>
                                <input
                                  type="text"
                                  placeholder="Latitude"
                                  value={configLat}
                                  onChange={(e) => setConfigLat(e.target.value)}
                                />
                              </div>
                              <div className="input-group">
                                <label>Longitude</label>
                                <input
                                  type="text"
                                  placeholder="Longitude"
                                  value={configLng}
                                  onChange={(e) => setConfigLng(e.target.value)}
                                />
                              </div>
                            </div>
                            <MapaConfig
                              lat={Number(configLat)}
                              lng={Number(configLng)}
                              raio={Number(configRaio)}
                              onMove={(pos) => {
                                setConfigLat(pos.lat);
                                setConfigLng(pos.lng);
                              }}
                            />
                            <BotaoGhost
                              onClick={() => {
                                setConfigLat(-19.9440459);
                                setConfigLng(-43.9147834);
                                toast.success("Mapa resetado para a Sede");
                              }}
                              style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}
                            >
                              <FiMapPin size={16} />
                              Resetar para Sede (Rua Caraça, 910)
                            </BotaoGhost>
                          </div>

                          <Botao
                            onClick={handleSalvarConfig}
                            disabled={salvandoConfig}
                            style={{ marginTop: '24px', width: '100%', justifyContent: 'center' }}
                          >
                            {salvandoConfig ? "Salvando..." : <><FiCheckSquare size={18} /> Salvar Localização & Raio</>}
                          </Botao>
                        </ConfigBox>
                      </AccordionBody>
                    )}
                  </ConfigItemLinha>

                  {/* 3. Calendário e Ausências */}
                  <ConfigItemLinha>
                    <ConfigItemHeader $aberto={secoesAbertasConfig.calendario} onClick={() => toggleSecaoConfig('calendario')}>
                      <ConfigItemLeft>
                        <IconeBox style={{ color: '#f1c40f', background: 'rgba(241, 196, 15, 0.12)' }}>
                          <FiCalendar size={20} />
                        </IconeBox>
                        <AccordionTitulos>
                          <h4>Calendário Corporativo & Ausências</h4>
                          <p>Gerencie feriados, recessos, férias e abonos</p>
                        </AccordionTitulos>
                      </ConfigItemLeft>
                      <ConfigItemRight>
                        <PillValorAtual>
                          {listaFeriados.length + listaAusencias.length} datas cadastradas
                        </PillValorAtual>
                        <AccordionChevron $aberto={secoesAbertasConfig.calendario}>
                          <FiChevronDown size={20} />
                        </AccordionChevron>
                      </ConfigItemRight>
                    </ConfigItemHeader>

                    {secoesAbertasConfig.calendario && (
                      <AccordionBody>
                        <ConfigBox style={{ background: 'transparent', padding: 0, border: 'none' }}>
                          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#8d8d99' }}>Gerencie feriados, recessos e férias para garantir a precisão do banco de horas.</p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="input-group">
                              <label>Tipo de Ausência</label>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {[
                                  { value: "FERIADO", label: "Feriado", icon: <FiMapPin size={12} /> },
                                  { value: "RECESSO", label: "Recesso", icon: <FiClock size={12} /> },
                                  { value: "FERIAS", label: "Férias", icon: <FiUserPlus size={12} /> },
                                  { value: "OUTRO", label: "Abono", icon: <FiCheckSquare size={12} /> }
                                ].map(opt => (
                                  <div
                                    key={opt.value}
                                    onClick={() => setNovaAusencia({ ...novaAusencia, tipo: opt.value, userId: opt.value === "FERIAS" ? novaAusencia.userId : "" })}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                                      background: novaAusencia.tipo === opt.value ? 'var(--cor-primaria, #2f81f7)' : 'rgba(255,255,255,0.05)',
                                      color: novaAusencia.tipo === opt.value ? '#fff' : '#8d8d99',
                                      border: '1px solid',
                                      borderColor: novaAusencia.tipo === opt.value ? 'var(--cor-primaria, #2f81f7)' : 'rgba(255,255,255,0.05)'
                                    }}
                                  >
                                    {opt.icon} {opt.label}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {novaAusencia.tipo === "FERIAS" && (
                              <div className="input-group" style={{ animation: 'fadeIn 0.3s ease' }}>
                                <label>Selecionar Colaborador</label>
                                <SeletorAcordeao
                                  opcoes={opcoesFuncionarios}
                                  value={novaAusencia.userId}
                                  onChange={(val) => setNovaAusencia({ ...novaAusencia, userId: val })}
                                />
                              </div>
                            )}

                            <div className="input-grid">
                              <div className="input-group">
                                <label>Data Início</label>
                                <input
                                  type="date"
                                  value={novaAusencia.dataInicio}
                                  onChange={(e) => setNovaAusencia({ ...novaAusencia, dataInicio: e.target.value, dataFim: e.target.value > novaAusencia.dataFim ? e.target.value : novaAusencia.dataFim })}
                                />
                              </div>
                              <div className="input-group">
                                <label>Data Fim (opcional)</label>
                                <input
                                  type="date"
                                  value={novaAusencia.dataFim}
                                  onChange={(e) => setNovaAusencia({ ...novaAusencia, dataFim: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="input-group">
                              <label>Descrição / Motivo</label>
                              <input
                                type="text"
                                placeholder="Ex: Férias Anuais, Feriado Municipal..."
                                value={novaAusencia.motivo}
                                onChange={(e) => setNovaAusencia({ ...novaAusencia, motivo: e.target.value })}
                              />
                            </div>

                            <BotaoGhost
                              onClick={() => {
                                if (!novaAusencia.dataInicio) return toast.error("Selecione a data.");
                                if (novaAusencia.tipo === "FERIAS" && !novaAusencia.userId) return toast.error("Selecione o colaborador.");

                                if (novaAusencia.tipo === "FERIADO" && novaAusencia.dataInicio === novaAusencia.dataFim) {
                                  if (listaFeriados.includes(novaAusencia.dataInicio)) {
                                    toast.error("Este feriado já está cadastrado.");
                                    return;
                                  }
                                  setListaFeriados([...listaFeriados, novaAusencia.dataInicio].sort());
                                } else {
                                  const id = Math.random().toString(36).substr(2, 9);
                                  setListaAusencias([...listaAusencias, { ...novaAusencia, id }].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)));
                                }

                                toast.success("Adicionado à lista!", { icon: '📅' });
                                setNovaAusencia({ ...novaAusencia, motivo: "" });
                              }}
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.1)', height: '48px' }}
                            >
                              <FiPlus /> Adicionar ao Calendário
                            </BotaoGhost>
                          </div>

                          <div style={{ marginTop: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                              <h5 style={{ color: '#8d8d99', fontSize: '11px', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>Datas Confirmadas</h5>
                              <span style={{ fontSize: '10px', color: '#666' }}>{listaFeriados.length + listaAusencias.length} registros</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                              {listaFeriados.map(f => (
                                <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(241, 196, 15, 0.03)', border: '1px solid rgba(241, 196, 15, 0.1)', borderRadius: '12px', transition: 'all 0.2s' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(241, 196, 15, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <FiCalendar size={16} color="#d97706" />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'inherit' }}>{format(new Date(`${f}T12:00:00`), "dd 'de' MMMM", { locale: ptBR })}</span>
                                      <span style={{ fontSize: '11px', opacity: 0.75 }}>Feriado Nacional • {format(new Date(`${f}T12:00:00`), "yyyy")}</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setListaFeriados(listaFeriados.filter(x => x !== f))}
                                    style={{ background: 'transparent', border: 0, padding: '8px', color: '#eb4d4b', cursor: 'pointer', borderRadius: '8px' }}
                                    className="hover-danger"
                                  >
                                    <FiTrash2 size={15} />
                                  </button>
                                </div>
                              ))}
                              {listaAusencias.map(aus => (
                                <div key={aus.id} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
                                  background: aus.tipo === 'FERIAS' ? 'rgba(46, 204, 113, 0.05)' : 'rgba(47, 129, 247, 0.05)',
                                  border: '1px solid',
                                  borderColor: aus.tipo === 'FERIAS' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(47, 129, 247, 0.15)',
                                  borderRadius: '12px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                      width: '36px', height: '36px', borderRadius: '10px',
                                      background: aus.tipo === 'FERIAS' ? 'rgba(46, 204, 113, 0.12)' : 'rgba(47, 129, 247, 0.12)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                      {aus.tipo === 'FERIAS' ? <FiUserCheck size={16} color="#16a34a" /> : <FiClock size={16} color="#2f81f7" />}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'inherit' }}>
                                        {format(new Date(`${aus.dataInicio}T12:00:00`), "dd/MM")}
                                        {aus.dataFim !== aus.dataInicio && ` — ${format(new Date(`${aus.dataFim}T12:00:00`), "dd/MM")}`}
                                      </span>
                                      <span style={{ fontSize: '11px', opacity: 0.75 }}>
                                        {aus.tipo === 'FERIAS'
                                          ? `Férias: ${funcionarios.find(f => f.id === aus.userId)?.nome}`
                                          : (aus.tipo === 'FERIADO' ? 'Feriado' : aus.tipo === 'RECESSO' ? 'Recesso Corporativo' : 'Outra Ausência')}
                                        {aus.motivo && ` • ${aus.motivo}`}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setListaAusencias(listaAusencias.filter(x => x.id !== aus.id))}
                                    style={{ background: 'transparent', border: 0, padding: '8px', color: '#eb4d4b', cursor: 'pointer', borderRadius: '8px' }}
                                  >
                                    <FiTrash2 size={15} />
                                  </button>
                                </div>
                              ))}
                              {listaFeriados.length === 0 && listaAusencias.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '16px', background: 'rgba(255,255,255,0.01)' }}>
                                  <FiCalendar size={24} style={{ marginBottom: '12px', opacity: 0.2 }} />
                                  <p style={{ margin: 0 }}>Nenhuma data cadastrada para este ano.</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <Botao
                            onClick={handleSalvarConfig}
                            disabled={salvandoConfig}
                            style={{ marginTop: '24px', width: '100%', justifyContent: 'center', height: '52px' }}
                          >
                            {salvandoConfig ? "Gravando Alterações..." : <><FiCheckSquare size={18} /> Salvar Calendário Corporativo</>}
                          </Botao>
                        </ConfigBox>
                      </AccordionBody>
                    )}
                  </ConfigItemLinha>
                </ConfigGrupoCard>
              </ConfigGrupo>

              {/* GRUPO 2: Instituição & Dados */}
              <ConfigGrupo>
                <ConfigGrupoHeader>
                  <div className="grupo-titulo">
                    <FiSettings size={14} color="#e67e22" />
                    <span>Instituição & Dados</span>
                  </div>
                </ConfigGrupoHeader>

                <ConfigGrupoCard>
                  {/* 4. Identidade do Painel */}
                  <ConfigItemLinha>
                    <ConfigItemHeader $aberto={secoesAbertasConfig.identidade} onClick={() => toggleSecaoConfig('identidade')}>
                      <ConfigItemLeft>
                        <IconeBox style={{ color: '#e67e22', background: 'rgba(230, 126, 34, 0.12)' }}>
                          <FiSettings size={20} />
                        </IconeBox>
                        <AccordionTitulos>
                          <h4>Identidade do Painel</h4>
                          <p>Personalize o nome da empresa/instituição no sistema</p>
                        </AccordionTitulos>
                      </ConfigItemLeft>
                      <ConfigItemRight>
                        <PillValorAtual>
                          {tempNomePainel || nomePainel || "Padrão"}
                        </PillValorAtual>
                        <AccordionChevron $aberto={secoesAbertasConfig.identidade}>
                          <FiChevronDown size={20} />
                        </AccordionChevron>
                      </ConfigItemRight>
                    </ConfigItemHeader>

                    {secoesAbertasConfig.identidade && (
                      <AccordionBody>
                        <ConfigBox style={{ background: 'transparent', padding: 0, border: 'none' }}>
                          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#8d8d99' }}>
                            Personalize o nome que aparece no topo e na barra lateral do painel.
                          </p>
                          <div className="input-group" style={{ marginBottom: '20px' }}>
                            <label>Nome do Painel</label>
                            <input
                              type="text"
                              value={tempNomePainel}
                              onChange={(e) => setTempNomePainel(e.target.value)}
                              placeholder="Ex: Minha Empresa"
                            />
                          </div>
                          <Botao
                            onClick={handleSalvarConfig}
                            disabled={salvandoConfig}
                            style={{ width: '100%', justifyContent: 'center', height: '48px' }}
                          >
                            {salvandoConfig ? <FiSettings className="spin" /> : <FiCheckSquare size={18} />}
                            Salvar Identidade
                          </Botao>
                        </ConfigBox>
                      </AccordionBody>
                    )}
                  </ConfigItemLinha>

                  {/* 5. Backup & Restauração dos Dados */}
                  <ConfigItemLinha>
                    <ConfigItemHeader $aberto={secoesAbertasConfig.backup} onClick={() => toggleSecaoConfig('backup')}>
                      <ConfigItemLeft>
                        <IconeBox style={{ color: '#9b59b6', background: 'rgba(155, 89, 182, 0.12)' }}>
                          <FiDatabase size={20} />
                        </IconeBox>
                        <AccordionTitulos>
                          <h4>Backup & Restauração de Dados</h4>
                          <p>Baixe cópias de segurança ou restaure dados do sistema</p>
                        </AccordionTitulos>
                      </ConfigItemLeft>
                      <ConfigItemRight>
                        <PillValorAtual>JSON • Local</PillValorAtual>
                        <AccordionChevron $aberto={secoesAbertasConfig.backup}>
                          <FiChevronDown size={20} />
                        </AccordionChevron>
                      </ConfigItemRight>
                    </ConfigItemHeader>

                    {secoesAbertasConfig.backup && (
                      <AccordionBody>
                        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#8d8d99' }}>
                          Baixe os dados da instituição em formato JSON ou restaure um arquivo salvo anteriormente.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <BotaoGhost onClick={handleBaixarBackup} disabled={processandoBackup} style={{ width: '100%', justifyContent: 'center' }}>
                            <FiDownload size={16} /> Baixar Backup
                          </BotaoGhost>
                          <BotaoGhost onClick={() => backupInputRef.current?.click()} disabled={processandoBackup} style={{ width: '100%', justifyContent: 'center' }}>
                            <FiUpload size={16} /> Restaurar Backup
                          </BotaoGhost>
                          <input ref={backupInputRef} type="file" accept="application/json,.json" onChange={handleRestaurarBackup} hidden />
                        </div>
                      </AccordionBody>
                    )}
                  </ConfigItemLinha>
                </ConfigGrupoCard>
              </ConfigGrupo>

              {/* GRUPO 3: Conta & Segurança */}
              <ConfigGrupo>
                <ConfigGrupoHeader>
                  <div className="grupo-titulo">
                    <FiShield size={14} color="#1abc9c" />
                    <span>Conta & Segurança</span>
                  </div>
                </ConfigGrupoHeader>

                <ConfigGrupoCard>
                  {/* 6. Segurança e Gestão de Acessos */}
                  <ConfigItemLinha>
                    <ConfigItemHeader $aberto={secoesAbertasConfig.acessos} onClick={() => toggleSecaoConfig('acessos')}>
                      <ConfigItemLeft>
                        <IconeBox style={{ color: '#1abc9c', background: 'rgba(26, 188, 156, 0.12)' }}>
                          <FiShield size={20} />
                        </IconeBox>
                        <AccordionTitulos>
                          <h4>Segurança & Gestão de Acessos</h4>
                          <p>Troca de senha e cadastramento de novos usuários</p>
                        </AccordionTitulos>
                      </ConfigItemLeft>
                      <ConfigItemRight>
                        <PillValorAtual>Acesso Administrativo</PillValorAtual>
                        <AccordionChevron $aberto={secoesAbertasConfig.acessos}>
                          <FiChevronDown size={20} />
                        </AccordionChevron>
                      </ConfigItemRight>
                    </ConfigItemHeader>

                    {secoesAbertasConfig.acessos && (
                      <AccordionBody>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <BotaoGhost onClick={() => setAbaAtiva("CADASTRO")} style={{ width: '100%', justifyContent: 'center' }}>
                            <FiUserPlus size={16} /> Cadastrar Funcionário
                          </BotaoGhost>
                          <BotaoGhost onClick={() => setModalSenhaAberto(true)} style={{ width: '100%', justifyContent: 'center' }}>
                            <FiLock size={16} /> Trocar Minha Senha
                          </BotaoGhost>
                        </div>
                      </AccordionBody>
                    )}
                  </ConfigItemLinha>

                  {/* 7. Sessão */}
                  <ConfigItemLinha>
                    <ConfigItemHeader $aberto={secoesAbertasConfig.sessao} onClick={() => toggleSecaoConfig('sessao')}>
                      <ConfigItemLeft>
                        <IconeBox style={{ color: '#eb4d4b', background: 'rgba(235, 77, 75, 0.12)' }}>
                          <FiLogOut size={20} />
                        </IconeBox>
                        <AccordionTitulos>
                          <h4 style={{ color: '#eb4d4b' }}>Sessão do Usuário</h4>
                          <p>Encerrar sessão atual neste dispositivo</p>
                        </AccordionTitulos>
                      </ConfigItemLeft>
                      <ConfigItemRight>
                        <PillValorAtual style={{ borderColor: 'rgba(235, 77, 75, 0.2)', color: '#eb4d4b' }}>Conectado</PillValorAtual>
                        <AccordionChevron $aberto={secoesAbertasConfig.sessao}>
                          <FiChevronDown size={20} />
                        </AccordionChevron>
                      </ConfigItemRight>
                    </ConfigItemHeader>

                    {secoesAbertasConfig.sessao && (
                      <AccordionBody>
                        <BotaoGhost
                          onClick={logout}
                          style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(235, 77, 75, 0.3)', color: '#eb4d4b' }}
                        >
                          <FiLogOut size={16} /> Sair da Conta
                        </BotaoGhost>
                      </AccordionBody>
                    )}
                  </ConfigItemLinha>
                </ConfigGrupoCard>
              </ConfigGrupo>
            </ConfigContainer>
          )}

            {abaAtiva === "BANCO_HORAS" && (
              <PainelBancoHoras funcionarios={funcionarios} pontos={itens} />
            )}

            {abaAtiva === "JUSTIFICATIVAS" && (
              <>
                <Topo>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Justificativas de Ponto</h2>
                </Topo>
                <PainelJustificativas funcionarios={funcionarios} />
              </>
            )}

            {abaAtiva === "CADASTRO" && (
              <PainelCadastro />
            )}

          </>
        )}

        {/* Toast com timeout */}
        {mostrarToast && <ToastSucesso>Relatório PDF gerado com sucesso!</ToastSucesso>}


        <ModalEditarFuncionario
          aberto={!!funcEditando}
          funcionario={funcEditando}
          onFechar={() => setFuncEditando(null)}
        />

        <ModalTrocaSenha
          aberto={modalSenhaAberto}
          onFechar={() => setModalSenhaAberto(false)}
          onSucesso={() => setModalSenhaAberto(false)}
        />

        <ModalCompartilharSistema
          aberto={modalCompartilharAberto}
          onFechar={() => setModalCompartilharAberto(false)}
        />

        <ModalMapaPonto
          aberto={!!pontoParaMapa}
          ponto={pontoParaMapa}
          onFechar={() => setPontoParaMapa(null)}
          userId={pontoParaMapa?.userId}
        />

        <TabbarAdminMobile abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      </ConteudoPrincipal>

      <ModalConfirmacao
        aberto={confirmarExclusao.aberto}
        onFechar={() => setConfirmarExclusao({ aberto: false, func: null })}
        onConfirmar={handleDeletarFuncionario}
        titulo="Excluir Funcionário"
        mensagem={`Tem certeza que deseja EXCLUIR permanentemente o funcionário ${confirmarExclusao.func?.nome}? Esta ação não pode ser desfeita e todos os registros dele sumirão.`}
        perigoso={true}
        textoConfirmar="Excluir Permanentemente"
      />

      <ModalConfirmacao
        aberto={confirmarResetSenha.aberto}
        onFechar={() => setConfirmarResetSenha({ aberto: false, func: null })}
        onConfirmar={executarResetSenha}
        titulo="Resetar Senha do Funcionário"
        mensagem={`Tem certeza que deseja resetar a senha de ${confirmarResetSenha.func?.nome} para a senha padrão da data de nascimento? O colaborador precisará cadastrar uma nova senha no próximo acesso.`}
        perigoso={true}
        textoConfirmar="Resetar Senha"
        carregando={resetandoSenha}
      />
    </LayoutAdmin>
  );
}

/* ---------------- styled ---------------- */

const Tela = styled.div`
min-height: 100vh;
background: ${({ theme }) => theme.cores.fundo};
color: ${({ theme }) => theme.cores.texto};
`;

const LayoutAdmin = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.cores.fundo};
  color: ${({ theme }) => theme.cores.texto};
  width: 100%;
  overflow-x: hidden; /* Garante que nada escape do layout principal */
`;

const Sidebar = styled.aside`
  width: 260px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.cores.sidebar};
  border-right: 1px solid ${({ theme }) => theme.cores.borda};
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
  font-size: 20px;
  margin-bottom: 48px;
  color: ${({ theme }) => theme.cores.texto};
`;

const Logo = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  object-fit: contain;
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

  color: ${({ $ativo, theme }) => ($ativo ? theme.cores.azul : theme.cores.texto2)};
  background: ${({ $ativo, theme }) => ($ativo ? theme.cores.azul + "15" : "transparent")};
  border: 1px solid ${({ $ativo, theme }) => ($ativo ? theme.cores.azul + "30" : "transparent")};

  &:hover {
    color: ${({ theme }) => theme.cores.texto};
    background: ${({ theme }) => theme.cores.destaqueHover};
  }

  svg {
    font-size: 18px;
  }
`;

const NavSeparador = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.cores.borda};
  margin: 16px 0;
`;

const StatusLocal = styled.div`
  padding: 12px 16px;
  background: ${({ theme }) => theme.cores.superficie2};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.cores.borda};
  margin-top: auto;

  .label {
    font-size: 10px;
    font-weight: 800;
    color: ${({ theme }) => theme.cores.texto2};
    text-transform: uppercase;
    margin-bottom: 8px;
    letter-spacing: 1px;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    
    &.online { color: #2ecc71; }
    &.offline { color: #f1c40f; }

    svg { font-size: 16px; }
  }

  .distancia {
    font-size: 11px;
    color: ${({ theme }) => theme.cores.texto2};
    margin-top: 4px;
    font-weight: 600;
  }
`;

const ConteudoPrincipal = styled.main`
  flex: 1;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0; /* Permite que o flex child encolha */
  margin-left: 260px;

  @media (max-width: 900px) {
    padding: 20px 16px 100px;
    margin-left: 0;
  }
`;

const Topo = styled.header`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  color: ${({ theme }) => theme.cores.texto};

  @media (max-width: 900px) {
    gap: 12px;
    margin-bottom: 16px;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const GrupoBotoesExportar = styled.div`
  display: flex;
  gap: 8px;
`;

const BotaoExportar = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: ${({ theme, $csv }) => $csv ? "rgba(46, 204, 113, 0.15)" : theme.cores.azul + "15"};
  color: ${({ theme, $csv }) => $csv ? "#2ecc71" : theme.cores.azul};
  border: 1px solid ${({ theme, $csv }) => $csv ? "rgba(46, 204, 113, 0.3)" : theme.cores.azul + "33"};
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${({ theme, $csv }) => $csv ? "rgba(46, 204, 113, 0.25)" : theme.cores.azul + "25"};
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 600px) {
    flex: 1;
    justify-content: center;
  }
`;

const BuscaWrapper = styled.div`
  flex: 1;
  max-width: 400px;
  height: 44px;
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: ${({ theme }) => theme.raio.lg};
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;

  &:focus-within {
    border-color: ${({ theme }) => theme.cores.azul};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.cores.azul}22;
  }

  @media (max-width: 600px) {
    max-width: none;
    width: 100%;
  }

  svg {
    color: ${({ theme }) => theme.cores.texto2};
    font-size: 18px;
  }

  input {
    background: transparent;
    border: 0;
    color: ${({ theme }) => theme.cores.texto};
    width: 100%;
    outline: none;
    font-size: 14px;
    &::placeholder { color: ${({ theme }) => theme.cores.texto2}88; }
  }
`;

const FiltroDataWrapper = styled.div`
  height: 44px;
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: ${({ theme }) => theme.raio.lg};
  padding: 0 12px;
  display: flex;
  align-items: center;
  transition: all 0.2s;

  &:focus-within {
    border-color: ${({ theme }) => theme.cores.azul};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.cores.azul}22;
  }

  @media (max-width: 600px) {
    width: 100%;
  }

  input {
    background: transparent;
    border: 0;
    color: ${({ theme }) => theme.cores.texto};
    outline: none;
    font-size: 14px;
    flex: 1;

    &::-webkit-calendar-picker-indicator {
      filter: ${({ theme }) => theme.nome === "dark" ? "invert(1)" : "none"};
      cursor: pointer;
    }
  }

  span {
    font-size: 11px;
    font-weight: 800;
    color: ${({ theme }) => theme.cores.texto2};
    text-transform: uppercase;
    margin-right: 8px;
    user-select: none;
    letter-spacing: 0.5px;
  }
`;

const SeletorAcordeaoWrapper = styled.div`
  min-width: 240px;
  @media (max-width: 600px) {
    min-width: 0;
    width: 100%;
  }
`;


const ResumoHeader = styled.div`
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.cores.borda};

  .resumo-info {
    h3 {
      font-size: 16px;
      font-weight: 700;
      color: ${({ theme }) => theme.cores.texto};
      margin: 0 0 4px;
    }
    p {
      font-size: 13px;
      color: ${({ theme }) => theme.cores.texto2};
      strong { color: var(--cor-primaria, #2f81f7); }
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    
    button { width: 100%; }
  }
`;

const ResumoCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  width: 100%;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.cores.card};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 12px;
  padding: 20px 24px;
  min-width: 180px;
  box-shadow: ${({ theme }) => theme.sombra.suave};

  @media (max-width: 600px) {
    min-width: 0;
    width: 100%;
  }
`;

const LabelCard = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.cores.texto2};
  font-weight: 600;
  margin-bottom: 8px;
`;

const ValorCard = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.cores.texto};
`;

const TabelaContainer = styled.div`
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 12px;
  overflow-x: auto;
  width: 100%; /* Garante que a div não estoure o pai */
  box-shadow: ${({ theme }) => theme.sombra.suave};
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.cores.borda};
    border-radius: 10px;
  }
`;

const TabelaStyled = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  min-width: 900px;

  th, td {
    padding: 14px 16px;
    font-size: 14px;
    border-bottom: 1px solid ${({ theme }) => theme.cores.borda};
    color: ${({ theme }) => theme.cores.texto};
  }

  th {
    background: ${({ theme }) => theme.cores.tabelaHeader};
    color: ${({ theme }) => theme.cores.texto2};
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  tr.row-alerta {
    background: rgba(235, 77, 75, 0.06);
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--cor-primaria, #2f81f7);
    cursor: pointer;
  }
`;

const LocalInfo = styled.div`
display: flex;
align-items: center;
gap: 8px;

  .pin-ok { color: #2ecc71; }
  .pin-alerta { color: #f1c40f; }
  .icon-alerta { color: #f1c40f; font-size: 16px; }
`;

const Botao = styled.button`
height: 44px;
padding: 0 20px;
background: var(--cor-primaria, #2f81f7);
color: #fff;
border: 0;
border-radius: 8px;
font-weight: 600;
display: flex;
align-items: center;
gap: 10px;
cursor: pointer;
transition: filter 0.2s;

  &:hover {
  filter: brightness(1.2);
}
`;

const BotaoGhost = styled.button`
  height: 44px;
  padding: 0 20px;
  background: transparent;
  color: ${({ theme }) => theme.cores.texto};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.cores.destaqueHover};
    border-color: var(--cor-primaria, #2f81f7);
    color: ${({ theme }) => theme.cores.texto};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TituloSecao = styled.h2`
font-size: 20px;
font-weight: 700;
margin: 0;
color: ${({ theme }) => theme.cores.texto};
`;

const PainelConfig = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 600px) {
    gap: 16px;
  }
`;

const ConfigBox = styled.div`
  background: ${({ theme }) => theme.cores.card};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 12px;
  padding: 24px;
  box-shadow: ${({ theme }) => theme.sombra.suave};

  @media (max-width: 600px) {
    padding: 20px 16px;
  }

  h4 {
    margin: 0 0 8px;
    font-size: 16px;
    color: ${({ theme }) => theme.cores.texto};
  }

  p {
    font-size: 13px;
    color: ${({ theme }) => theme.cores.texto2};
    margin: 0 0 20px;
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;

    @media (max-width: 480px) {
      gap: 8px;
      
      input {
        width: 100%;
        flex: none;
      }
    }

    input {
      background: ${({ theme }) => theme.cores.inputFundo};
      border: 1px solid ${({ theme }) => theme.cores.inputBorda};
      border-radius: 8px;
      height: 44px;
      padding: 0 16px;
      color: ${({ theme }) => theme.cores.texto};
      outline: none;
      flex: 1;
      
      &:focus {
        border-color: var(--cor-primaria, #2f81f7);
      }
    }

    span {
      color: ${({ theme }) => theme.cores.texto2};
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
    }
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: ${({ theme }) => theme.cores.texto2};
      margin-bottom: 0;
    }

    input, textarea {
      background: ${({ theme }) => theme.cores.inputFundo};
      border: 1px solid ${({ theme }) => theme.cores.inputBorda};
      border-radius: 8px;
      height: 44px;
      padding: 0 16px;
      color: ${({ theme }) => theme.cores.texto};
      outline: none;
      width: 100%;
      transition: all 0.2s;
      
      &:focus {
        border-color: var(--cor-primaria, #2f81f7);
        background: rgba(47, 129, 247, 0.05);
      }
    }
  }

  .input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const AvisoInfo = styled.div`
padding: 20px;
background: rgba(47, 129, 247, 0.1);
border-radius: 8px;
color: var(--cor-primaria, #2f81f7);
`;

const AvisoErro = styled.div`
padding: 20px;
background: rgba(235, 77, 75, 0.1);
border-radius: 8px;
color: #eb4d4b;
`;

const ToastSucesso = styled.div`
position: fixed;
bottom: 32px;
right: 32px;
background: #2ecc71;
color: #fff;
padding: 12px 24px;
border-radius: 8px;
font-weight: 600;
font-size: 14px;
box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
animation: slideIn 0.3s ease-out;

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
`;
const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  background: ${({ $ativo, $justificado }) =>
    $ativo ? "rgba(46, 204, 113, 0.1)" :
      $justificado ? "rgba(241, 196, 15, 0.15)" :
        "rgba(235, 77, 75, 0.1)"};
  color: ${({ $ativo, $justificado }) =>
    $ativo ? "#2ecc71" :
      $justificado ? "#f1c40f" :
        "#eb4d4b"};
  border: 1px solid ${({ $ativo, $justificado }) =>
    $ativo ? "rgba(46, 204, 113, 0.2)" :
      $justificado ? "rgba(241, 196, 15, 0.2)" :
        "rgba(235, 77, 75, 0.2)"};

  svg {
    font-size: 14px;
    &.spin {
      animation: spin 2s linear infinite;
    }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const BotaoAcao = styled.button`
  background: transparent;
  color: ${({ $danger }) => $danger ? "#eb4d4b" : "#8d8d99"};
  border: 1px solid ${({ $danger }) => $danger ? "rgba(235, 77, 75, 0.2)" : "rgba(255, 255, 255, 0.1)"};
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #fff;
    border-color: ${({ $danger }) => $danger ? "#eb4d4b" : "var(--cor-primaria, #2f81f7)"};
    background: ${({ $danger }) => $danger ? "rgba(235, 77, 75, 0.1)" : "rgba(47, 129, 247, 0.1)"};
  }
`;

const BtnVerMapa = styled.button`
  background: rgba(47, 129, 247, 0.1);
  border: 1px solid rgba(47, 129, 247, 0.2);
  color: var(--cor-primaria, #2f81f7);
  padding: 4px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: auto;

  &:hover {
    background: var(--cor-primaria, #2f81f7);
    color: #fff;
  }
`;

const AtalhosMobile = styled.div`
  display: none;
  gap: 12px;
  margin-bottom: 24px;
  width: 100%;

  @media (max-width: 900px) {
    display: flex;
  }
`;

const AtalhoBtn = styled.button`
  flex: 1;
  height: 48px;
  background: ${({ theme }) => theme.cores.card};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 12px;
  color: ${({ theme }) => theme.cores.texto};
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
    background: ${({ theme }) => theme.cores.destaqueHover};
  }

  svg {
    color: var(--cor-primaria, #2f81f7);
  }
`;

const StatusLocalMobile = styled.div`
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;

  .location-info {
    display: flex;
    align-items: center;
    gap: 8px;
    
    &.online { color: #2ecc71; }
    &.offline { color: #f1c40f; }

    strong { 
      font-size: 11px;
      opacity: 0.7;
      margin-left: 4px;
    }
  }

  .logout-btn {
    background: rgba(235, 77, 75, 0.1);
    border: 1px solid rgba(235, 77, 75, 0.2);
    color: #eb4d4b;
    padding: 6px 12px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;

    &:active {
      transform: scale(0.95);
      background: rgba(235, 77, 75, 0.2);
    }
  }

  &.online .location-info { color: #2ecc71; }
  &.offline .location-info { color: #f1c40f; }

  @media (max-width: 900px) {
    display: flex;
  }
`;

const BtnAcao = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.$perigoso ? 'rgba(235, 77, 75, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
  background: ${props => props.$perigoso ? 'rgba(235, 77, 75, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$perigoso ? '#eb4d4b' : '#8d8d99'};
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;

  &:hover {
    background: ${props => props.$perigoso ? '#eb4d4b' : 'rgba(255, 255, 255, 0.1)'};
    color: #fff;
  }

  svg {
    flex-shrink: 0;
  }
`;


const IconJustificado = () => (
  <FiAlertCircle size={10} style={{ color: '#f1c40f', marginLeft: '2px' }} />
);

const BtnNotificar = styled.button`
  background: #f1c40f22;
  border: 1px solid #f1c40f44;
  color: #f1c40f;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f1c40f33;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.9);
  }
`;

const ConfigContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding-bottom: 50px;
`;

const ConfigHeaderWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  background: ${({ theme }) => theme.cores.card};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 20px;
  box-shadow: ${({ theme }) => theme.sombra.suave};

  .info {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .tag-secao {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--cor-primaria, #2f81f7);
      background: rgba(47, 129, 247, 0.1);
      padding: 4px 12px;
      border-radius: 999px;
      width: fit-content;
    }

    h2 {
      margin: 2px 0 0;
      font-size: 22px;
      font-weight: 800;
      color: ${({ theme }) => theme.cores.texto};
    }

    p {
      margin: 0;
      font-size: 13px;
      color: ${({ theme }) => theme.cores.texto2};
      line-height: 1.45;
    }
  }

  .status-empresa-box {
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${({ theme }) => theme.cores.superficie2};
    border: 1px solid ${({ theme }) => theme.cores.borda};
    padding: 10px 16px;
    border-radius: 14px;
    flex-shrink: 0;

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #2ecc71;
      box-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
    }

    .empresa-info {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .label-empresa {
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.8px;
        color: ${({ theme }) => theme.cores.texto2};
      }

      strong {
        font-size: 13px;
        font-weight: 700;
        color: ${({ theme }) => theme.cores.texto};
      }
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
    .status-empresa-box { width: 100%; }
  }
`;

const ConfigGrupo = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ConfigGrupoHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px;

  .grupo-titulo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: ${({ theme }) => theme.cores.texto2};
  }
`;

const ConfigGrupoCard = styled.div`
  background: ${({ theme }) => theme.cores.card};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 18px;
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.sombra.suave};
  display: flex;
  flex-direction: column;
`;

const ConfigItemLinha = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.cores.borda};
  transition: all 0.2s ease;

  &:last-child {
    border-bottom: none;
  }
`;

const ConfigItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  cursor: pointer;
  user-select: none;
  background: ${({ theme, $aberto }) => ($aberto ? theme.cores.destaqueHover : "transparent")};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.cores.destaqueHover};
  }

  @media (max-width: 600px) {
    padding: 14px 16px;
  }
`;

const ConfigItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
`;

const ConfigItemRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  margin-left: 12px;
`;

const PillValorAtual = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  color: ${({ theme }) => theme.cores.texto};
  white-space: nowrap;

  @media (max-width: 680px) {
    display: none;
  }
`;

const IconeBox = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const AccordionTitulos = styled.div`
  h4 {
    margin: 0;
    font-size: 14.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.cores.texto};
  }
  p {
    margin: 3px 0 0;
    font-size: 12px;
    color: ${({ theme }) => theme.cores.texto2};
  }
`;

const AccordionChevron = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.cores.texto2};
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  transform: rotate(${p => p.$aberto ? "180deg" : "0deg"});
`;

const AccordionBody = styled.div`
  padding: 24px;
  border-top: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie};
  color: ${({ theme }) => theme.cores.texto};
  animation: fadeIn 0.25s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const CardOpcaoRegime = styled.div`
  padding: 16px;
  border-radius: 14px;
  cursor: pointer;
  border: 2px solid ${({ theme, $ativo }) => ($ativo ? "var(--cor-primaria, #2f81f7)" : theme.cores.borda)};
  background: ${({ theme, $ativo }) => ($ativo ? (theme.nome === "dark" ? "rgba(47, 129, 247, 0.12)" : "rgba(47, 129, 247, 0.06)") : theme.cores.superficie2)};
  transition: all 0.2s ease;

  strong {
    color: ${({ theme }) => theme.cores.texto};
    font-size: 14px;
    font-weight: 700;
  }

  p {
    margin: 6px 0 0;
    font-size: 12px;
    color: ${({ theme }) => theme.cores.texto2};
    line-height: 1.45;
  }

  .badge-ativo {
    font-size: 10px;
    background: var(--cor-primaria, #2f81f7);
    color: #ffffff;
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 800;
  }

  &:hover {
    border-color: var(--cor-primaria, #2f81f7);
    transform: translateY(-1px);
  }
`;
