import React from "react";
import styled from "styled-components";
import TabbarMobile from "../../components/TabbarMobile";
import { useAuth } from "../../contexts/AuthContexto";
import { useClock } from "../../hooks/useClock";
import { usePonto } from "../../hooks/usePonto";
import { toast } from "react-hot-toast";
import { FiShield } from "react-icons/fi";
import { useSync } from "../../hooks/useSync";

const TIPOS = {
    ENTRADA: "ENTRADA",
    INICIO_INTERVALO: "INICIO_INTERVALO",
    FIM_INTERVALO: "FIM_INTERVALO",
    SAIDA: "SAIDA",
};

export default function HomeColaborador() {
    const { perfil, isAdmin, logout } = useAuth();
    const { hora, data } = useClock();
    const { pendentes, online, sincronizando, syncAgora } = useSync();

    const { registrarPonto, validarLocal, validacao, carregandoGeo } = usePonto();

    const [checou, setChecou] = React.useState(false);

    const statusTexto = React.useMemo(() => {
        if (!checou) return "Validando localização...";
        if (validacao.ok) return "Localização Validada: Escola Municipal Senador Levindo Coelho";
        if (validacao.ok === false)
            return `Fora do raio permitido (${validacao.distance}m)`;
        return "Localização não verificada";
    }, [checou, validacao]);

    // ✅ validar local ao entrar na tela (e quando voltar pro app)
    React.useEffect(() => {
        const run = async () => {
            try {
                await validarLocal();
            } catch (e) {
                toast.error(e.message);
            } finally {
                setChecou(true);
            }
        };

        run();

        const onVis = () => {
            if (document.visibilityState === "visible") run();
        };
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
    }, [validarLocal]);

    const bloqueado = React.useMemo(() => {
        // colaborador bloqueia fora do raio; admin não bloqueia
        if (isAdmin) return false;
        return checou && validacao.ok === false;
    }, [isAdmin, checou, validacao.ok]);

    const handle = (tipo) => registrarPonto(tipo);

    return (
        <Tela>
            <Topo>
                <Marca>
                    <Logo src="/icons/pwa-512x512.png" alt="PontoFlow" />
                    <span>PontoFlow</span>
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

                <Status>
                    <PontoStatus $ok={validacao.ok === true} $bad={validacao.ok === false} />
                    <span>{carregandoGeo ? "Obtendo GPS..." : statusTexto}</span>
                </Status>

                <Grid>
                    <Botao
                        $cor="sucesso"
                        disabled={bloqueado || carregandoGeo}
                        onClick={() => handle(TIPOS.ENTRADA)}
                    >
                        ENTRADA
                    </Botao>

                    <Botao
                        $cor="alerta"
                        disabled={bloqueado || carregandoGeo}
                        onClick={() => handle(TIPOS.INICIO_INTERVALO)}
                    >
                        INÍCIO INTERVALO
                    </Botao>

                    <Botao
                        $cor="info"
                        disabled={bloqueado || carregandoGeo}
                        onClick={() => handle(TIPOS.FIM_INTERVALO)}
                    >
                        FIM INTERVALO
                    </Botao>

                    <Botao
                        $cor="perigo"
                        disabled={bloqueado || carregandoGeo}
                        onClick={() => handle(TIPOS.SAIDA)}
                    >
                        SAÍDA
                    </Botao>
                </Grid>

                {bloqueado && (
                    <Aviso>
                        Você está fora do raio permitido. Aproxime-se do local de trabalho para
                        liberar os botões.
                    </Aviso>
                )}
            </Conteudo>

            <TabbarMobile mostrarAdmin={isAdmin} />
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

