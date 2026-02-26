// src/components/admin/PainelBancoHoras.jsx
import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import {
  collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, deleteDoc, doc
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContexto";
import { format, differenceInMinutes, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FiPlus, FiMinus, FiX, FiClock, FiChevronDown, FiChevronRight, FiCalendar, FiAlertTriangle, FiCheckCircle, FiTrendingUp, FiTrendingDown, FiFile, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { exportarParaCsv } from "../../utils/exportarCsv";
import {
  horaParaMin,
  formatarSaldo,
  formatarDuracao,
  calcularResumoDiario
} from "../../utils/pontoUtils";

import SeletorAcordeao from "../SeletorAcordeao";

// (Funções helpers movidas para src/utils/pontoUtils.js)

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PainelBancoHoras({ funcionarios, pontos }) {
  const { perfil } = useAuth();

  // Período: mês/ano
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth()); // 0–11
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

  // Lançamentos manuais do Firestore
  const [lancamentos, setLancamentos] = useState([]);

  // Linha expandida
  const [expandido, setExpandido] = useState(null);

  // Modal ajuste manual
  const [modalAberto, setModalAberto] = useState(false);
  const [funcSelecionado, setFuncSelecionado] = useState(null);
  const [tipo, setTipo] = useState("CREDITO");
  const [horas, setHoras] = useState("");
  const [minutos, setMinutos] = useState("");
  const [descricao, setDescricao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  // Busca lançamentos manuais do Firestore
  useEffect(() => {
    if (!perfil?.companyId) return;
    const q = query(
      collection(db, "banco_horas"),
      where("companyId", "==", perfil.companyId),
      orderBy("criadoEm", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setLancamentos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [perfil?.companyId]);

  // Filtrar pontos no período selecionado
  const pontosNoPeriodo = useMemo(() => {
    const inicio = startOfMonth(new Date(anoSelecionado, mesSelecionado, 1));
    const fim = endOfMonth(inicio);
    return (pontos || []).filter((p) => {
      const d = p.criadoEm?.toDate ? p.criadoEm.toDate() : p.criadoEm ? new Date(p.criadoEm) : null;
      if (!d) return false;
      return d >= inicio && d <= fim;
    });
  }, [pontos, mesSelecionado, anoSelecionado]);

  // Lançamentos manuais no período selecionado
  const lancamentosNoPeriodo = useMemo(() => {
    const inicio = startOfMonth(new Date(anoSelecionado, mesSelecionado, 1));
    const fim = endOfMonth(inicio);
    return lancamentos.filter((l) => {
      // Se for um lançamento novo (ainda sem timestamp do servidor), 
      // mostramos no mês atual se o sistema estiver no mês atual
      if (!l.criadoEm) {
        return mesSelecionado === hoje.getMonth() && anoSelecionado === hoje.getFullYear();
      }

      const d = l.criadoEm?.toDate ? l.criadoEm.toDate() : null;
      if (!d) return false;
      return d >= inicio && d <= fim;
    });
  }, [lancamentos, mesSelecionado, anoSelecionado, hoje]);

  // Colaboradores (sem admins)
  const colaboradores = useMemo(
    () => (funcionarios || []).filter((f) => f.role !== "admin"),
    [funcionarios]
  );

  // Para cada colaborador, calcula o resumo
  const resumoPorFunc = useMemo(() => {
    return colaboradores.map((f) => {
      const pontosFunc = pontosNoPeriodo.filter((p) => p.userId === f.id);
      const dias = calcularResumoDiario(pontosFunc, f.jornada);

      const totalTrabalhadoMinutos = dias.reduce((acc, d) => acc + (d.minutosTrabalhados ?? 0), 0);
      const totalEsperadoMinutos = dias.reduce((acc, d) => acc + (d.minutosEsperados ?? 0), 0);

      const somaAutoMinutos = dias.reduce((acc, d) => acc + (d.diferenca ?? 0), 0);
      const somaManualMinutos = lancamentosNoPeriodo
        .filter((l) => l.userId === f.id)
        .reduce((acc, l) => acc + (l.tipo === "CREDITO" ? l.minutos : -l.minutos), 0);
      const saldoTotal = somaAutoMinutos + somaManualMinutos;

      const diasUteis = dias.filter(d => d.minutosEsperados > 0).length;
      const mediaTrabalhadaDia = diasUteis > 0 ? Math.floor(totalTrabalhadoMinutos / diasUteis) : 0;

      // Calcular minutos de um dia de jornada para converter horas -> dias
      const jornadaMin = (() => {
        if (!f.jornada?.entrada || !f.jornada?.saida) return 480; // fallback 8h
        const ini = horaParaMin(f.jornada.entrada);
        const fim = horaParaMin(f.jornada.saida);
        const pausa = f.jornada.intervaloMin ?? 60;
        return Math.max(1, fim - ini - pausa);
      })();

      const saldoTotalDias = saldoTotal / jornadaMin;

      return {
        func: f,
        dias,
        totalTrabalhadoMinutos,
        totalEsperadoMinutos,
        somaAutoMinutos,
        somaManualMinutos,
        saldoTotal,
        mediaTrabalhadaDia,
        saldoTotalDias
      };
    });
  }, [colaboradores, pontosNoPeriodo, lancamentosNoPeriodo]);

  // Meses para o seletor
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Anos disponíveis (últimos 3 anos)
  const anos = [hoje.getFullYear() - 2, hoje.getFullYear() - 1, hoje.getFullYear()];

  const handleExportarCSV = () => {
    const dadosParaExportar = resumoPorFunc.map(({ func, totalTrabalhadoMinutos, totalEsperadoMinutos, somaAutoMinutos, somaManualMinutos, saldoTotal, mediaTrabalhadaDia, saldoTotalDias }) => ({
      nome: func.nome || "—",
      jornada: func.jornada ? `${func.jornada.entrada} - ${func.jornada.saida}` : "—",
      totalTrabalhado: formatarDuracao(totalTrabalhadoMinutos),
      totalEsperado: formatarDuracao(totalEsperadoMinutos),
      mediaDiaria: formatarDuracao(mediaTrabalhadaDia),
      saldoAuto: formatarSaldo(somaAutoMinutos),
      ajustes: formatarSaldo(somaManualMinutos),
      saldoTotalHoras: formatarSaldo(saldoTotal),
      saldoTotalDias: `${saldoTotalDias >= 0 ? "+" : ""}${saldoTotalDias.toFixed(2)} dias`,
    }));

    exportarParaCsv({
      dados: dadosParaExportar,
      colunas: ["Funcionário", "Jornada", "Total Trabalhado", "Total Esperado", "Média Diária", "Saldo Auto", "Ajustes", "Saldo Total (Horas)", "Saldo Total (Dias)"],
      chaves: ["nome", "jornada", "totalTrabalhado", "totalEsperado", "mediaDiaria", "saldoAuto", "ajustes", "saldoTotalHoras", "saldoTotalDias"],
      nomeArquivo: `banco_horas_${meses[mesSelecionado]}_${anoSelecionado}.csv`
    });
    toast.success("Banco de Horas exportado!");
  };

  const handleLancar = async (e) => {
    e.preventDefault();
    const totalMin = (parseInt(horas || 0) * 60) + parseInt(minutos || 0);
    if (totalMin <= 0) return toast.error("Informe a quantidade de horas/minutos.");
    if (!funcSelecionado) return toast.error("Selecione um funcionário.");
    if (!descricao.trim()) return toast.error("Adicione uma descrição.");

    const companyId = perfil?.companyId;
    if (!companyId) {
      return toast.error("Erro: ID da empresa não identificado. Tente recarregar a página.");
    }

    setCarregando(true);
    try {
      await addDoc(collection(db, "banco_horas"), {
        userId: funcSelecionado,
        companyId,
        tipo,
        minutos: totalMin,
        descricao: descricao.trim(),
        origem: "MANUAL",
        criadoEm: serverTimestamp(),
        criadoPor: perfil?.uid || "admin",
      });
      toast.success(`${tipo === "CREDITO" ? "Crédito" : "Débito"} lançado!`);
      setModalAberto(false);
      // Limpar campos
      setHoras(""); setMinutos(""); setDescricao(""); setFuncSelecionado(null);
    } catch (err) {
      console.error("Erro ao lançar horas:", err);
      toast.error("Erro ao salvar no banco de dados.");
    } finally {
      setCarregando(false);
    }
  };

  const abrirModal = (funcId) => {
    setFuncSelecionado(funcId);
    setModalAberto(true);
  };

  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      toast.loading("Sincronizando vínculos...", { id: "sync-bh" });
      const func = httpsCallable(functions, "corrigirCompanyFuncionarios");
      const res = await func();

      if (res.data?.usersCorrigidos > 0 || res.data?.pontosCorrigidos > 0) {
        toast.success(`Sincronizado! Foram corrigidos vínculos de ${res.data.usersCorrigidos} usuários e ${res.data.pontosCorrigidos} pontos/horas.`, { id: "sync-bh" });
      } else {
        toast.success("Tudo certo! Banco de horas e vínculos estão em dia.", { id: "sync-bh" });
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Erro ao sincronizar vínculos e saldos.", { id: "sync-bh" });
    } finally {
      setSincronizando(false);
    }
  };

  const handleExcluirLancamento = async (id) => {
    if (!window.confirm("Certeza que deseja excluir este ajuste manual? Essa ação não pode ser desfeita e o banco de horas será recalculado.")) return;

    try {
      await deleteDoc(doc(db, "banco_horas", id));
      toast.success("Ajuste excluído com sucesso!");
    } catch (err) {
      console.error("Erro ao excluir ajuste:", err);
      toast.error("Erro ao excluir o ajuste.");
    }
  };

  return (
    <>
      {/* ── Cabeçalho ── */}
      <Topo>
        <TituloBloco>
          <FiClock size={22} />
          <h2>Banco de Horas</h2>
          <Subtitulo>Cálculo automático por histórico de ponto</Subtitulo>
        </TituloBloco>

        <FiltrosPeriodo>
          <SeletorWrapper>
            <SeletorAcordeao
              opcoes={meses.map((m, i) => ({ value: i, label: m }))}
              value={mesSelecionado}
              onChange={(val) => setMesSelecionado(Number(val))}
            />
          </SeletorWrapper>
          <SeletorWrapper $small>
            <SeletorAcordeao
              opcoes={[hoje.getFullYear() - 2, hoje.getFullYear() - 1, hoje.getFullYear()].map(a => ({ value: a, label: String(a) }))}
              value={anoSelecionado}
              onChange={(val) => setAnoSelecionado(Number(val))}
            />
          </SeletorWrapper>
          <BotaoAjuste onClick={() => setModalAberto(true)}>
            <FiPlus size={15} />
            Ajuste Manual
          </BotaoAjuste>

          <BotaoAjuste $sincronizar onClick={handleSincronizar} disabled={sincronizando}>
            <FiRefreshCw size={15} className={sincronizando ? "spin" : ""} />
            {sincronizando ? "Sinc..." : "Sincronizar"}
          </BotaoAjuste>

          <GrupoExportar>
            <BotaoExportar $csv onClick={handleExportarCSV}>
              <FiFile size={15} />
              CSV
            </BotaoExportar>
          </GrupoExportar>
        </FiltrosPeriodo>
      </Topo>

      {/* ── Tabela de saldos ── */}
      <TabelaContainer>
        <TabelaStyled>
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Funcionário</th>
              <th>Total Trabalhado</th>
              <th>Saldo Auto</th>
              <th>Ajustes</th>
              <th>Saldo Total (h)</th>
              <th>Saldo Total (d)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {colaboradores.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "#666", padding: 32 }}>
                  Nenhum funcionário cadastrado.
                </td>
              </tr>
            )}
            {resumoPorFunc.map(({ func, dias, totalTrabalhadoMinutos, totalEsperadoMinutos, somaAutoMinutos, somaManualMinutos, saldoTotal, mediaTrabalhadaDia, saldoTotalDias }) => {
              const temJornada = !!func.jornada?.entrada && !!func.jornada?.saida;
              const isExpandido = expandido === func.id;

              return (
                <React.Fragment key={func.id}>
                  <TrPrincipal
                    $expandido={isExpandido}
                    onClick={() => setExpandido(isExpandido ? null : func.id)}
                  >
                    <td>
                      <ChevronIcon>
                        {isExpandido ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                      </ChevronIcon>
                    </td>
                    <td>
                      <NomeFunc>{func.nome}</NomeFunc>
                      <small style={{ display: "block", fontSize: 10, color: "#666" }}>
                        {temJornada ? `${func.jornada.entrada} - ${func.jornada.saida}` : "Sem jornada"}
                      </small>
                    </td>
                    <td>
                      <DuracaoTexto>{formatarDuracao(totalTrabalhadoMinutos)}</DuracaoTexto>
                    </td>
                    <td>
                      {temJornada
                        ? <SaldoBadge $positivo={somaAutoMinutos >= 0}>{formatarSaldo(somaAutoMinutos)}</SaldoBadge>
                        : <SemDados>—</SemDados>
                      }
                    </td>
                    <td>
                      <SaldoBadge $positivo={somaManualMinutos >= 0} $neutro={somaManualMinutos === 0}>
                        {formatarSaldo(somaManualMinutos)}
                      </SaldoBadge>
                    </td>
                    <td>
                      <SaldoTotal $positivo={saldoTotal >= 0}>
                        {formatarSaldo(saldoTotal)}
                      </SaldoTotal>
                    </td>
                    <td>
                      <SaldoDias $positivo={saldoTotalDias >= 0}>
                        {saldoTotalDias >= 0 ? "+" : ""}{saldoTotalDias.toFixed(1)}d
                      </SaldoDias>
                    </td>
                    <td>
                      <BtnAjusteLinha onClick={(e) => { e.stopPropagation(); abrirModal(func.id); }}>
                        <FiPlus size={12} /> Ajuste
                      </BtnAjusteLinha>
                    </td>
                  </TrPrincipal>

                  {/* ── Detalhe diário ── */}
                  {isExpandido && (
                    <TrDetalhe>
                      <td colSpan={8}>
                        <DetalheContainer>
                          <DetalheHeader>
                            <FiCalendar size={14} />
                            Detalhamento diário — {meses[mesSelecionado]} {anoSelecionado}
                          </DetalheHeader>
                          {dias.length === 0 ? (
                            <SemRegistros>Nenhum registro de ponto neste período.</SemRegistros>
                          ) : (
                            <TabelaDetalhe>
                              <thead>
                                <tr>
                                  <th>Data</th>
                                  <th>Entrada</th>
                                  <th>Iní. Intervalo</th>
                                  <th>Fim Intervalo</th>
                                  <th>Saída</th>
                                  <th>Trabalhado</th>
                                  <th>Esperado</th>
                                  <th>Diferença</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dias.map((dia) => (
                                  <tr key={dia.dataKey}>
                                    <td>{format(dia.data, "dd/MM/yyyy", { locale: ptBR })}</td>
                                    <td>{dia.check.entrada ? format(dia.check.entrada, "HH:mm") : "—"}</td>
                                    <td>{dia.check.iniInt ? format(dia.check.iniInt, "HH:mm") : "—"}</td>
                                    <td>{dia.check.fimInt ? format(dia.check.fimInt, "HH:mm") : "—"}</td>
                                    <td>{dia.check.saida ? format(dia.check.saida, "HH:mm") : "—"}</td>
                                    <td>{formatarDuracao(dia.minutosTrabalhados)}</td>
                                    <td>{dia.minutosEsperados !== null ? formatarDuracao(dia.minutosEsperados) : "—"}</td>
                                    <td>
                                      {dia.diferenca !== null
                                        ? <DifBadge $positivo={dia.diferenca >= 0}>{formatarSaldo(dia.diferenca)}</DifBadge>
                                        : <SemDados>—</SemDados>
                                      }
                                    </td>
                                    <td>
                                      <StatusBadge $ok={dia.status === "Ok"}>
                                        {dia.status === "Ok" ? <FiCheckCircle size={12} /> : <FiAlertTriangle size={12} />}
                                        {dia.status}
                                      </StatusBadge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </TabelaDetalhe>
                          )}

                          {/* Ajustes manuais no período */}
                          {lancamentosNoPeriodo.filter(l => l.userId === func.id).length > 0 && (
                            <AjustesManualSection>
                              <DetalheHeader style={{ marginTop: 16 }}>
                                <FiPlus size={14} />
                                Ajustes Manuais no Período
                              </DetalheHeader>
                              <TabelaDetalhe>
                                <thead>
                                  <tr>
                                    <th>Tipo</th>
                                    <th>Valor</th>
                                    <th>Descrição</th>
                                    <th style={{ width: 40, textAlign: "center" }}></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lancamentosNoPeriodo
                                    .filter(l => l.userId === func.id)
                                    .map((l) => (
                                      <tr key={l.id}>
                                        <td>
                                          <DifBadge $positivo={l.tipo === "CREDITO"}>
                                            {l.tipo === "CREDITO" ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
                                            {l.tipo === "CREDITO" ? "Crédito" : "Débito"}
                                          </DifBadge>
                                        </td>
                                        <td>
                                          <SaldoBadge $positivo={l.tipo === "CREDITO"}>
                                            {l.tipo === "CREDITO" ? "+" : "-"}{formatarDuracao(l.minutos)}
                                          </SaldoBadge>
                                        </td>
                                        <td style={{ fontSize: 12, color: "#aaa" }}>{l.descricao}</td>
                                        <td style={{ textAlign: "center" }}>
                                          <BtnAjusteLinha
                                            style={{ color: "#e74c3c", borderColor: "transparent", padding: 4 }}
                                            onClick={(e) => { e.stopPropagation(); handleExcluirLancamento(l.id); }}
                                            title="Excluir ajuste"
                                          >
                                            <FiTrash2 size={14} />
                                          </BtnAjusteLinha>
                                        </td>
                                      </tr>
                                    ))
                                  }
                                </tbody>
                              </TabelaDetalhe>
                            </AjustesManualSection>
                          )}
                        </DetalheContainer>
                      </td>
                    </TrDetalhe>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </TabelaStyled>
      </TabelaContainer>

      {/* ── Modal de Ajuste Manual ── */}
      {modalAberto && (
        <Overlay>
          <ModalBox>
            <ModalTopo>
              <ModalTitulo><FiClock size={16} /> Ajuste Manual de Banco de Horas</ModalTitulo>
              <FecharBtn onClick={() => setModalAberto(false)}><FiX size={18} /></FecharBtn>
            </ModalTopo>
            <ModalInfo>Use para registrar correções pontuais: feriados trabalhados, horas acordadas extra, etc.</ModalInfo>

            <Form onSubmit={handleLancar}>
              <Campo>
                <label>Funcionário</label>
                <SeletorAcordeao
                  opcoes={colaboradores.map(f => ({ value: f.id, label: f.nome }))}
                  value={funcSelecionado}
                  onChange={(val) => setFuncSelecionado(val)}
                />
              </Campo>

              <Campo>
                <label>Tipo</label>
                <TipoSelector>
                  <TipoOption $ativo={tipo === "CREDITO"} onClick={() => setTipo("CREDITO")} type="button">
                    <FiPlus size={14} /> Crédito (horas a receber)
                  </TipoOption>
                  <TipoOption $ativo={tipo === "DEBITO"} $danger onClick={() => setTipo("DEBITO")} type="button">
                    <FiMinus size={14} /> Débito (horas devidas)
                  </TipoOption>
                </TipoSelector>
              </Campo>

              <Campo>
                <label>Quantidade</label>
                <GradeQuantidade>
                  <div>
                    <input type="number" min="0" max="999" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="0" />
                    <span>horas</span>
                  </div>
                  <div>
                    <input type="number" min="0" max="59" value={minutos} onChange={(e) => setMinutos(e.target.value)} placeholder="0" />
                    <span>minutos</span>
                  </div>
                </GradeQuantidade>
              </Campo>

              <Campo>
                <label>Descrição / Motivo</label>
                <input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Feriado trabalhado 12/02"
                />
              </Campo>

              <Rodape>
                <BtnGhost type="button" onClick={() => setModalAberto(false)}>Cancelar</BtnGhost>
                <BtnPrimary disabled={carregando}>
                  {carregando ? "Lançando..." : "Confirmar Ajuste"}
                </BtnPrimary>
              </Rodape>
            </Form>
          </ModalBox>
        </Overlay>
      )}
    </>
  );
}

/* ─── STYLED COMPONENTS ──────────────────────────────────────────────────────── */

const Topo = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
`;

const TituloBloco = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  h2 { margin: 0; font-size: 22px; font-weight: 700; color: #fff; }
  svg { color: ${({ theme }) => theme.cores.azul}; flex-shrink: 0; }
`;

const Subtitulo = styled.span`
  font-size: 12px;
  color: #666;
  font-weight: 400;
  margin-left: 4px;
`;

const FiltrosPeriodo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const SeletorWrapper = styled.div`
  width: ${({ $small }) => $small ? "100px" : "150px"};
  
  @media (max-width: 600px) {
    width: 100%;
  }
`;

const SelectPill = styled.select`
  display: none; // Desativado em favor do SeletorAcordeao
`;

const BotaoAjuste = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  height: 38px;
  background: ${({ theme, $sincronizar }) => $sincronizar ? theme.cores.sucesso : theme.cores.azul};
  color: #fff;
  font-weight: 700;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  &:hover { opacity: 0.85; transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }

  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    100% { transform: rotate(360deg); }
  }
`;

const GrupoExportar = styled.div`
  display: flex;
  gap: 8px;
  margin-left: 4px;
`;

const BotaoExportar = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 38px;
  background: ${({ theme, $csv }) => $csv ? "rgba(46, 204, 113, 0.15)" : theme.cores.superficie};
  color: ${({ theme, $csv }) => $csv ? "#2ecc71" : theme.cores.texto};
  font-weight: 700;
  border: 1px solid ${({ theme, $csv }) => $csv ? "rgba(46, 204, 113, 0.3)" : theme.cores.borda};
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;

  &:hover { 
    background: ${({ $csv }) => $csv ? "rgba(46, 204, 113, 0.25)" : "rgba(255,255,255,0.05)"};
    transform: translateY(-1px);
  }

  svg { opacity: 0.8; }
`;

const TabelaContainer = styled.div`
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 16px;
  overflow-x: auto;
`;

const TabelaStyled = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 13px 16px;
    text-align: left;
    white-space: nowrap;
  }

  th {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${({ theme }) => theme.cores.texto2};
    border-bottom: 1px solid ${({ theme }) => theme.cores.borda};
  }
`;

const TrPrincipal = styled.tr`
  cursor: pointer;
  transition: background 0.15s;
  background: ${({ $expandido, theme }) => $expandido ? theme.cores.superficie + "55" : "transparent"};

  &:hover { background: ${({ theme }) => theme.cores.superficie}55; }
  &:not(:last-child) td { border-bottom: 1px solid ${({ theme }) => theme.cores.borda}22; }
`;

const TrDetalhe = styled.tr`
  background: ${({ theme }) => theme.cores.fundo}44;
  td { border-bottom: 1px solid ${({ theme }) => theme.cores.borda}; }
`;

const ChevronIcon = styled.div`
  color: ${({ theme }) => theme.cores.texto2};
  display: flex;
  align-items: center;
`;

const NomeFunc = styled.span`
  font-weight: 600;
  font-size: 14px;
`;

const DuracaoTexto = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.cores.texto};
`;

const JornadaTag = styled.span`
  font-size: 12px;
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  padding: 3px 10px;
  border-radius: 8px;
`;

const SemJornada = styled.span`
  font-size: 12px;
  color: #666;
  font-style: italic;
`;

const DiasCount = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.cores.texto2};
`;

const SemDados = styled.span`
  color: #555;
  font-size: 13px;
`;

const SaldoBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  background: ${({ $positivo, $neutro }) =>
    $neutro ? "rgba(100,100,100,0.12)" :
      $positivo ? "rgba(46, 204, 113, 0.12)" : "rgba(231, 76, 60, 0.12)"};
  color: ${({ $positivo, $neutro }) =>
    $neutro ? "#888" :
      $positivo ? "#2ecc71" : "#e74c3c"};
`;

const SaldoTotal = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 900;
  background: ${({ $positivo }) => $positivo ? "rgba(46,204,113,0.15)" : "rgba(231,76,60,0.15)"};
  color: ${({ $positivo }) => $positivo ? "#2ecc71" : "#e74c3c"};
  border: 1px solid ${({ $positivo }) => $positivo ? "rgba(46,204,113,0.3)" : "rgba(231,76,60,0.3)"};
`;

const SaldoDias = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $positivo }) => $positivo ? "#2ecc71" : "#e74c3c"};
  background: ${({ $positivo }) => $positivo ? "rgba(46, 204, 113, 0.08)" : "rgba(231, 76, 60, 0.08)"};
  padding: 3px 8px;
  border-radius: 6px;
`;

const BtnAjusteLinha = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: transparent;
  color: ${({ theme }) => theme.cores.texto2};
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: ${({ theme }) => theme.cores.azul};
    color: ${({ theme }) => theme.cores.azul};
  }
`;

/* ── Detalhe ── */

const DetalheContainer = styled.div`
  padding: 16px 20px 20px;
`;

const DetalheHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.cores.texto2};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
`;

const SemRegistros = styled.p`
  color: #555;
  font-size: 13px;
  margin: 0;
  padding: 8px 0;
`;

const TabelaDetalhe = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: ${({ theme }) => theme.cores.fundo}66;
  border-radius: 10px;
  overflow: hidden;

  th, td {
    padding: 9px 12px;
    text-align: left;
    white-space: nowrap;
  }
  th {
    color: ${({ theme }) => theme.cores.texto2};
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid ${({ theme }) => theme.cores.borda}55;
  }
  tr:not(:last-child) td { border-bottom: 1px solid ${({ theme }) => theme.cores.borda}33; }
`;

const DifBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $positivo }) => $positivo ? "rgba(46,204,113,0.12)" : "rgba(231,76,60,0.12)"};
  color: ${({ $positivo }) => $positivo ? "#2ecc71" : "#e74c3c"};
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $ok }) => $ok ? "rgba(46,204,113,0.1)" : "rgba(231,76,60,0.1)"};
  color: ${({ $ok }) => $ok ? "#2ecc71" : "#e74c3c"};
`;

const AjustesManualSection = styled.div`
  margin-top: 8px;
`;

/* ── Modal ── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 999;
`;

const ModalBox = styled.div`
  width: 100%;
  max-width: 480px;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 20px;
  box-shadow: 0 24px 40px rgba(0, 0, 0, 0.6);
  overflow: hidden;
`;

const ModalTopo = styled.div`
  padding: 16px 16px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ModalTitulo = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 15px;
`;

const ModalInfo = styled.p`
  margin: 0 16px 4px;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
`;

const FecharBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie};
  color: ${({ theme }) => theme.cores.texto2};
  height: 34px;
  width: 34px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Form = styled.form`
  padding: 10px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 12px;
    color: ${({ theme }) => theme.cores.texto2};
    font-weight: 600;
  }

  input, select {
    height: 44px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid ${({ theme }) => theme.cores.borda};
    background: ${({ theme }) => theme.cores.superficie};
    color: ${({ theme }) => theme.cores.texto};
    outline: none;
    font-size: 14px;
  }

  select { cursor: pointer; }
`;

const TipoSelector = styled.div`
  display: flex;
  gap: 8px;
`;

const TipoOption = styled.button`
  flex: 1;
  height: 40px;
  border: 1px solid ${({ $ativo, $danger, theme }) =>
    $ativo ? ($danger ? "#e74c3c" : theme.cores.azul) : theme.cores.borda};
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
  background: ${({ $ativo, $danger }) =>
    $ativo ? ($danger ? "rgba(231,76,60,0.15)" : "rgba(79,172,254,0.15)") : "transparent"};
  color: ${({ $ativo, $danger, theme }) =>
    $ativo ? ($danger ? "#e74c3c" : theme.cores.azul) : theme.cores.texto2};
`;

const GradeQuantidade = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  div {
    display: flex;
    align-items: center;
    gap: 8px;

    input { width: 100%; text-align: center; }
    span { font-size: 12px; color: ${({ theme }) => theme.cores.texto2}; white-space: nowrap; }
  }
`;

const Rodape = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
`;

const BtnGhost = styled.button`
  height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: transparent;
  color: ${({ theme }) => theme.cores.texto2};
  font-weight: 700;
  cursor: pointer;
`;

const BtnPrimary = styled.button`
  height: 42px;
  padding: 0 20px;
  border-radius: 999px;
  border: 0;
  background: ${({ theme }) => theme.cores.azul};
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`;
