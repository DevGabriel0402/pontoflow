import React from "react";
import styled from "styled-components";
import TabbarMobile from "../../components/TabbarMobile";
import { useAuth } from "../../contexts/AuthContexto";
import { useClock } from "../../hooks/useClock";
import { usePonto } from "../../hooks/usePonto";
import { toast } from "react-hot-toast";
import { FiShield, FiClock, FiMap, FiAlertTriangle, FiMapPin, FiCamera } from "react-icons/fi";
import { useSync } from "../../hooks/useSync";
import { useHistoricoPontos } from "../../hooks/useHistoricoPontos";
import { obterFila } from "../../services/offlineQueue";
import { startOfToday, isAfter, isWeekend } from "date-fns";
import ModalTrocaSenha from "../../components/colaborador/ModalTrocaSenha";
import ModalMapaPonto from "../../components/ModalMapaPonto";
import ModalConsentimentoGPS from "../../components/colaborador/ModalConsentimentoGPS";
import LoadingGlobal from "../../components/LoadingGlobal";
import FacePontoModal from "../../components/colaborador/FacePontoModal";
import { useSaldoBancoHoras } from "../../hooks/useSaldoBancoHoras";
import { formatarSaldo } from "../../utils/pontoUtils";

const TIPOS = {
  ENTRADA: "ENTRADA",
  INICIO_INTERVALO: "INICIO_INTERVALO",
  FIM_INTERVALO: "FIM_INTERVALO",
  SAIDA: "SAIDA",
};

/** 
 * Helper para pegar a data do ponto 
 */
function getDataPonto(p) {
  if (p?.criadoEmLocal) return new Date(p.criadoEmLocal);
  if (p?.criadoEm?.toDate) return p.criadoEm.toDate();
  if (p?.criadoEm) return new Date(p.criadoEm);
  return null;
}

export default function HomeColaborador() {
  const { usuario, perfil, isAdmin, logout, recarregarPerfil } = useAuth();
  const { hora, data } = useClock();
  const { pendentes, online, sincronizando, syncAgora } = useSync();
  const { itens: historico, carregando: carregandoHist } = useHistoricoPontos(usuario?.uid);
  const { registrarPonto, validarLocal, validacao, carregandoGeo } = usePonto();
  const { saldoMinutos, saldoDias, carregando: carregandoSaldo } = useSaldoBancoHoras(usuario?.uid, perfil);

  const [checou, setChecou] = React.useState(false);
  const [modalTrocaSenhaAberto, setModalTrocaSenhaAberto] = React.useState(false);
  const [pontoParaMapa, setPontoParaMapa] = React.useState(null);
  const [permissaoGPS, setPermissaoGPS] = React.useState("prompt");
  const [showConsentModal, setShowConsentModal] = React.useState(false);
  const [tipoSelecionado, setTipoSelecionado] = React.useState(null);
  const [modalFaceAberto, setModalFaceAberto] = React.useState(false);

  // ✅ Verifica se é final de semana
  const ehFimDeSemana = React.useMemo(() => isWeekend(new Date()), []);

  // ✅ Verifica pontos batidos HOJE (incluindo fila offline)
  const tiposFeitosHoje = React.useMemo(() => {
    const hoje = startOfToday();
    const fila = obterFila().filter(p => p.userId === usuario?.uid);

    // Mescla histórico do Firestore + Fila Offline
    const todos = [...fila, ...historico];

    // Filtra apenas os de hoje e mapeia os tipos
    const feitos = todos
      .filter(p => {
        const d = getDataPonto(p);
        return d && isAfter(d, hoje);
      })
      .map(p => p.type);

    return new Set(feitos);
  }, [historico, pendentes, usuario?.uid]);

  const todosConcluidos = React.useMemo(() => {
    return Object.values(TIPOS).every(t => tiposFeitosHoje.has(t));
  }, [tiposFeitosHoje]);

  // ✅ Filtra pontos de hoje para a lista de histórico
  const pontosHoje = React.useMemo(() => {
    const hoje = startOfToday();
    return historico.filter(p => {
      const d = getDataPonto(p);
      return d && isAfter(d, hoje);
    });
  }, [historico]);

  const statusTexto = React.useMemo(() => {
    if (!checou) return "Validando localização...";
    if (validacao.ok) return "Localização Validada: Escola Municipal Senador Levindo Coelho";
    if (validacao.ok === false)
      return `Fora do raio permitido (${validacao.distance}m)`;
    return "Localização não verificada";
  }, [checou, validacao]);

  // ✅ validar local ao entrar na tela (e quando voltar pro app)
  React.useEffect(() => {
    const checkPermission = async () => {
      if (!navigator.permissions) return;
      try {
        const status = await navigator.permissions.query({ name: "geolocation" });
        setPermissaoGPS(status.state);

        if (status.state === "prompt") {
          setShowConsentModal(true);
        }

        status.onchange = () => setPermissaoGPS(status.state);
      } catch (e) {
        console.error("Erro ao checar permissão GPS:", e);
      }
    };

    const run = async () => {
      try {
        await validarLocal();
      } catch (e) {
        // Se der erro de permissão (code 1), a gente já captura via navigator.permissions
        // mas alguns browsers não suportam navigator.permissions.query({...})
        if (e.message?.includes("negada")) {
          setPermissaoGPS("denied");
        }
      } finally {
        setChecou(true);
      }
    };

    checkPermission();
    run();

    const onVis = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [validarLocal]);

  const bloqueado = React.useMemo(() => {
    // colaborador bloqueia fora do raio ou fim de semana; admin não bloqueia
    if (isAdmin) return false;
    return (checou && validacao.ok === false) || ehFimDeSemana;
  }, [isAdmin, checou, validacao.ok, ehFimDeSemana]);

  const handle = async (tipo) => {
    if (permissaoGPS === "denied") {
      toast.error("Localização bloqueada. Ative nas configurações do navegador.");
      return;
    }
    if (ehFimDeSemana && !isAdmin) {
      toast.error("Registro de ponto não disponível no final de semana.");
      return;
    }
    if (tiposFeitosHoje.has(tipo)) {
      toast.error("Este ponto já foi registrado hoje!");
      return;
    }
    try {
      await registrarPonto(tipo);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar ponto. Tente novamente.");
    }
  };

  const handleAbrirFace = () => {
    if (!tipoSelecionado) {
      toast.error("Selecione o tipo de ponto antes de continuar.");
      return;
    }
    if (bloqueado && !isAdmin) {
      toast.error("Você está fora do raio permitido.");
      return;
    }
    setModalFaceAberto(true);
  };

  const handleSucessoFace = async () => {
    setModalFaceAberto(false);
    try {
      await handle(tipoSelecionado);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar ponto após autenticação facial.");
    }
    setTipoSelecionado(null);
  };


  const handleAceitarConsentimento = () => {
    setShowConsentModal(false);
    validarLocal().catch(e => {
      if (e.message?.includes("negada")) {
        setPermissaoGPS("denied");
      }
    });
  };

  if (carregandoHist || (carregandoGeo && !checou)) return <LoadingGlobal />;

  if (!perfil) {
    return (
      <Tela>
        <Conteudo>
          <FiAlertTriangle size={48} color="#f1c40f" style={{ marginBottom: '20px' }} />
          <h2 style={{ color: '#fff' }}>Perfil não encontrado</h2>
          <p style={{ color: '#8d8d99', textAlign: 'center', margin: '16px 0' }}>
            Não encontramos seus dados de acesso no sistema.
            Entre em contato com o administrador da sua empresa.
          </p>
          <BotaoReativar onClick={logout}>Sair do Sistema</BotaoReativar>
        </Conteudo>
      </Tela>
    );
  }

  return (
    <Tela>
      <Topo>
        <Marca>
          <Logo src="/icons/pwa-512x512.png" alt="PontoFlow" />
          <span>ClickPonto</span>
        </Marca>

        <AcoesTopo>
          {pendentes > 0 && (
            <BadgePendentes $ativo={true}>
              Pendentes: <strong>{pendentes}</strong>
            </BadgePendentes>
          )}

          {online && pendentes > 0 && (
            <BotaoTopo onClick={syncAgora} disabled={sincronizando} title="Sincronizar agora">
              {sincronizando ? "Sync..." : "Sync"}
            </BotaoTopo>
          )}

          <BotaoTopo onClick={() => setModalTrocaSenhaAberto(true)} title="Trocar Senha">
            Trocar Senha
          </BotaoTopo>

          <BotaoTopo onClick={logout} title="Sair">
            Sair
          </BotaoTopo>
        </AcoesTopo>
      </Topo>

      <Conteudo>
        <SeloSeguranca>
          <FiShield size={16} />
          <span>Geofence Ativo</span>
        </SeloSeguranca>

        <Relogio>{hora}</Relogio>
        <Data>{data}</Data>

        <ContainerSaldo>
          <LabelSaldo>Meu Banco de Horas</LabelSaldo>
          <GradeSaldo>
            <BoxSaldo $positivo={saldoMinutos >= 0}>
              <ValorSaldo $positivo={saldoMinutos >= 0}>{formatarSaldo(saldoMinutos)}</ValorSaldo>
              <SubSaldo>Saldo em Horas</SubSaldo>
            </BoxSaldo>
            <BoxSaldo $positivo={saldoMinutos >= 0}>
              <ValorSaldo $positivo={saldoMinutos >= 0}>{saldoMinutos >= 0 ? "+" : ""}{saldoDias.toFixed(1)}d</ValorSaldo>
              <SubSaldo>Saldo em Dias</SubSaldo>
            </BoxSaldo>
          </GradeSaldo>
        </ContainerSaldo>

        <Status>
          <PontoStatus $ok={validacao.ok === true} $bad={validacao.ok === false} />
          <span>{carregandoGeo ? "Obtendo GPS..." : statusTexto}</span>
        </Status>

        <ChipsGrid>
          {Object.entries({
            ENTRADA: "Entrada",
            INICIO_INTERVALO: "Início Intervalo",
            FIM_INTERVALO: "Fim Intervalo",
            SAIDA: "Saída",
          }).map(([key, label]) => (
            <Chip
              key={key}
              $selecionado={tipoSelecionado === key}
              $feito={tiposFeitosHoje.has(key)}
              onClick={() => !tiposFeitosHoje.has(key) && setTipoSelecionado(key)}
            >
              {tiposFeitosHoje.has(key) ? `✓ ${label}` : label}
            </Chip>
          ))}
        </ChipsGrid>

        <BotaoFace
          onClick={handleAbrirFace}
          disabled={!tipoSelecionado || bloqueado || carregandoGeo}
        >
          <FiCamera />
          Confirmar com Reconhecimento Facial
        </BotaoFace>

        {ehFimDeSemana && (
          <MensagemAlerta>
            🗓️ Estamos no final de semana. O registro de ponto não está disponível.
            {isAdmin && <span style={{ display: 'block', fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>(Acesso liberado para Administrador)</span>}
          </MensagemAlerta>
        )}

        {todosConcluidos ? (
          <MensagemConcluido>
            🎉 Você já completou todos os seus registros de hoje!
          </MensagemConcluido>
        ) : bloqueado && !ehFimDeSemana && (
          <Aviso>
            Você está fora do raio permitido. Aproxime-se do local de trabalho para
            liberar os botões.
          </Aviso>
        )}

        {/* Histórico Recente (Início) */}
        <SecaoHistorico>
          <TituloSecao>
            <FiClock size={16} /> Registros de Hoje
          </TituloSecao>
          <ListaHistorico>
            {pontosHoje.map((p) => (
              <ItemHistorico key={p.id}>
                <ItemInfo>
                  <TipoPonto>{p.type === 'ENTRADA' ? 'Entrada' : p.type === 'SAIDA' ? 'Saída' : p.type === 'INICIO_INTERVALO' ? 'Início Int.' : 'Fim Int.'}</TipoPonto>
                  <DataHora>{new Date(getDataPonto(p)).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</DataHora>
                </ItemInfo>
                <ItemAcoes>
                  <Indicator $ok={p.dentroDoRaio}>
                    {p.dentroDoRaio ? <FiMapPin size={12} /> : <FiAlertTriangle size={12} />}
                  </Indicator>
                  <BtnMapa onClick={() => setPontoParaMapa(p)}>
                    <FiMap size={14} />
                  </BtnMapa>
                </ItemAcoes>
              </ItemHistorico>
            ))}
            {pontosHoje.length === 0 && <SemHistorico>Nenhum registro hoje.</SemHistorico>}
          </ListaHistorico>
        </SecaoHistorico>
        {/* Histórico Recente (Fim) */}
      </Conteudo>

      <TabbarMobile mostrarAdmin={isAdmin} />

      <ModalTrocaSenha
        aberto={perfil?.primeiroAcesso === true || modalTrocaSenhaAberto}
        obrigatorio={perfil?.primeiroAcesso === true}
        onSucesso={() => {
          recarregarPerfil();
          setModalTrocaSenhaAberto(false);
        }}
        onFechar={() => setModalTrocaSenhaAberto(false)}
      />

      <ModalMapaPonto
        aberto={!!pontoParaMapa}
        ponto={pontoParaMapa}
        onFechar={() => setPontoParaMapa(null)}
      />

      <ModalConsentimentoGPS
        aberto={showConsentModal}
        onAceitar={handleAceitarConsentimento}
      />

      {modalFaceAberto && (
        <FacePontoModal
          tipo={tipoSelecionado}
          onSucesso={handleSucessoFace}
          onCancelar={() => setModalFaceAberto(false)}
        />
      )}

      {permissaoGPS === "denied" && (
        <OverlayBloqueio>
          <CardBloqueio>
            <FiAlertTriangle size={48} color="#f1c40f" />
            <TituloBloqueio>Acesso à Localização Negado</TituloBloqueio>
            <DescBloqueio>
              O PontoFlow precisa da sua localização para validar o registro de ponto.
              Você bloqueou o acesso anteriormente.
            </DescBloqueio>

            <Passos>
              <strong>Como reativar:</strong>
              <p>1. Clique no ícone de 🔒 ou ⚙️ na barra de endereço do navegador.</p>
              <p>2. Ative a opção "Localização".</p>
              <p>3. Recarregue esta página.</p>
            </Passos>

            <BotaoReativar onClick={() => window.location.reload()}>
              Já ativei, recarregar
            </BotaoReativar>
          </CardBloqueio>
        </OverlayBloqueio>
      )}
    </Tela>
  );
}

/* ---------------- styled ---------------- */

const Tela = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.cores.fundo};
  color: ${({ theme }) => theme.cores.texto};
`;

const Topo = styled.header`
  height: 56px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Marca = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 900;
`;

const Logo = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  object-fit: contain;
`;

const AcoesTopo = styled.div`
  display: flex;
  gap: 10px;
`;

const BotaoTopo = styled.button`
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie2};
  color: ${({ theme }) => theme.cores.texto2};
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 12px;
  cursor: pointer;
`;

const BadgePendentes = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${({ theme }) => theme.cores.alerta + "33"};
  color: ${({ theme }) => theme.cores.alerta};
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  border: 1px solid ${({ theme }) => theme.cores.alerta + "66"};
  cursor: pointer;

  strong {
    font-weight: 800;
  }
`;

const Conteudo = styled.main`
  padding: 22px 16px 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SeloSeguranca = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  color: ${({ theme }) => theme.cores.texto2};
  font-size: 12px;
`;

const ContainerSaldo = styled.div`
  width: 100%;
  max-width: 420px;
  margin-top: 24px;
`;

const LabelSaldo = styled.div`
  font-size: 10px;
  font-weight: 800;
  color: ${({ theme }) => theme.cores.texto2};
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
  opacity: 0.7;
  text-align: center;
`;

const GradeSaldo = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const BoxSaldo = styled.div`
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme, $positivo }) =>
    $positivo ? "rgba(46, 204, 113, 0.2)" : "rgba(231, 76, 60, 0.2)"};
  padding: 14px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
`;

const ValorSaldo = styled.div`
  font-size: 18px;
  font-weight: 900;
  color: ${({ theme, $positivo }) => $positivo ? "#2ecc71" : "#e74c3c"};
  margin-bottom: 2px;
  letter-spacing: -0.5px;
`;

const SubSaldo = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.cores.texto2};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const Relogio = styled.div`
  margin-top: 14px;
  font-size: 56px;
  font-weight: 300;
  letter-spacing: 1px;
`;

const Data = styled.div`
  margin-top: 8px;
  font-size: 12px;
  letter-spacing: 1.6px;
  color: ${({ theme }) => theme.cores.texto2};
  text-transform: uppercase;
`;

const Status = styled.div`
  margin-top: 18px;
  display: flex;
  gap: 10px;
  align-items: center;
  color: ${({ theme }) => theme.cores.texto2};
  font-size: 13px;
`;

const PontoStatus = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${({ theme, $ok, $bad }) =>
    $ok ? theme.cores.sucesso : $bad ? theme.cores.perigo : theme.cores.alerta};
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05);
`;

const Grid = styled.div`
  width: 100%;
  max-width: 420px;
  margin-top: 26px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
`;

const ChipsGrid = styled.div`
  width: 100%;
  max-width: 420px;
  margin-top: 26px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const Chip = styled.button`
  height: 72px;
  border-radius: 14px;
  border: 2px solid ${({ theme, $selecionado, $feito }) =>
    $feito ? theme.cores.sucesso + "66" :
      $selecionado ? theme.cores.azul :
        theme.cores.borda};
  background: ${({ theme, $selecionado, $feito }) =>
    $feito ? theme.cores.sucesso + "15" :
      $selecionado ? theme.cores.azul + "20" :
        theme.cores.superficie2};
  color: ${({ theme, $selecionado, $feito }) =>
    $feito ? theme.cores.sucesso :
      $selecionado ? theme.cores.azul :
        theme.cores.texto2};
  font-weight: 700;
  font-size: 13px;
  cursor: ${p => p.$feito ? "default" : "pointer"};
  transition: all 0.15s ease;
  letter-spacing: 0.2px;

  &:hover:not(:disabled) {
    border-color: ${({ theme, $feito }) => !$feito && theme.cores.azul};
    background: ${({ theme, $feito }) => !$feito && theme.cores.azul + "15"};
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
`;

const BotaoFace = styled.button`
  width: 100%;
  max-width: 420px;
  margin-top: 16px;
  height: 58px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  color: #111;
  font-weight: 800;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(79,172,254,0.35);
  transition: all 0.2s ease;
  letter-spacing: 0.3px;

  &:hover:not(:disabled) {
    filter: brightness(1.08);
    transform: translateY(-1px);
    box-shadow: 0 6px 28px rgba(79,172,254,0.45);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const Botao = styled.button`
  height: 92px;
  border: 0;
  border-radius: ${({ theme }) => theme.raio.xl};
  background: ${({ theme, $cor }) => theme.cores[$cor]};
  color: rgba(0, 0, 0, 0.72);
  font-weight: 900;
  font-size: 13px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  box-shadow: ${({ theme }) => theme.sombra.suave};
  transition: transform 0.08s ease, opacity 0.12s ease;
    cursor: pointer;


  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.45;
    transform: none;
  }
`;

const Aviso = styled.div`
  margin-top: 14px;
  max-width: 420px;
  width: 100%;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.raio.lg};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie2};
  color: ${({ theme }) => theme.cores.texto2};
  font-size: 13px;
`;

const MensagemConcluido = styled.div`
  margin-top: 24px;
  padding: 16px;
  background: ${({ theme }) => theme.cores.sucesso + "15"};
  border: 1px solid ${({ theme }) => theme.cores.sucesso + "40"};
  border-radius: 12px;
  color: ${({ theme }) => theme.cores.sucesso};
  font-weight: 700;
  font-size: 14px;
  text-align: center;
  max-width: 420px;
  width: 100%;
  animation: fadeIn 0.4s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const MensagemAlerta = styled.div`
  margin-top: 24px;
  padding: 16px;
  background: ${({ theme }) => theme.cores.alerta + "15"};
  border: 1px solid ${({ theme }) => theme.cores.alerta + "40"};
  border-radius: 12px;
  color: ${({ theme }) => theme.cores.alerta};
  font-weight: 700;
  font-size: 14px;
  text-align: center;
  max-width: 420px;
  width: 100%;
  animation: fadeIn 0.4s ease-out;
`;

const SecaoHistorico = styled.section`
  width: 100%;
  max-width: 420px;
  margin-top: 32px;
`;

const TituloSecao = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.cores.texto2};
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ListaHistorico = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ItemHistorico = styled.div`
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TipoPonto = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.cores.texto};
`;

const DataHora = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.cores.texto2};
`;

const ItemAcoes = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Indicator = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme, $ok }) => $ok ? theme.cores.sucesso + '15' : theme.cores.perigo + '15'};
  color: ${({ theme, $ok }) => $ok ? theme.cores.sucesso : theme.cores.perigo};
`;

const BtnMapa = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie};
  color: ${({ theme }) => theme.cores.texto2};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.cores.azul};
    color: #fff;
    border-color: ${({ theme }) => theme.cores.azul};
  }
`;

const SemHistorico = styled.div`
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.cores.texto2};
  padding: 20px;
  background: ${({ theme }) => theme.cores.superficie2};
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.cores.borda};
`;

const OverlayBloqueio = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(18, 18, 20, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 10000;
  backdrop-filter: blur(10px);
`;

const CardBloqueio = styled.div`
  background: #19191b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 32px;
  border-radius: 24px;
  max-width: 400px;
  width: 100%;
  text-align: center;
`;

const TituloBloqueio = styled.h2`
  font-size: 20px;
  font-weight: 800;
  margin: 20px 0 12px;
  color: #fff;
`;

const DescBloqueio = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.cores.texto2};
  line-height: 1.6;
  margin-bottom: 24px;
`;

const Passos = styled.div`
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 24px;

  strong {
    display: block;
    font-size: 13px;
    color: #fff;
    margin-bottom: 12px;
  }

  p {
    font-size: 12px;
    color: ${({ theme }) => theme.cores.texto2};
    margin: 8px 0;
    line-height: 1.4;
  }
`;

const BotaoReativar = styled.button`
  width: 100%;
  height: 48px;
  background: ${({ theme }) => theme.cores.azul};
  color: #fff;
  border: 0;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    filter: brightness(1.1);
  }
`;

