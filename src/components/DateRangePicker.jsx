import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isWithinInterval, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function DateRangePicker({ startDate, endDate, onChange }) {
    const [aberto, setAberto] = useState(false);
    const [mesAtual, setMesAtual] = useState(() => startDate ? new Date(startDate + "T12:00:00") : new Date());
    const [selecionando, setSelecionando] = useState(null); // null | 'start' after first click
    const [tempStart, setTempStart] = useState(null);
    const [hoverDate, setHoverDate] = useState(null);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickFora = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setAberto(false);
                setSelecionando(null);
                setTempStart(null);
            }
        };
        document.addEventListener("mousedown", handleClickFora);
        return () => document.removeEventListener("mousedown", handleClickFora);
    }, []);

    const start = startDate ? new Date(startDate + "T12:00:00") : null;
    const end = endDate ? new Date(endDate + "T12:00:00") : null;

    const inicioMes = startOfMonth(mesAtual);
    const fimMes = endOfMonth(mesAtual);
    const diasDoMes = eachDayOfInterval({ start: inicioMes, end: fimMes });
    const offsetInicio = getDay(inicioMes);

    const handleDiaClick = (dia) => {
        if (!selecionando) {
            // Primeiro clique: define o início
            setTempStart(dia);
            setSelecionando("start");
            setHoverDate(null);
        } else {
            // Segundo clique: define o fim
            let s = tempStart;
            let e = dia;
            if (isBefore(e, s)) {
                [s, e] = [e, s];
            }
            onChange(format(s, "yyyy-MM-dd"), format(e, "yyyy-MM-dd"));
            setSelecionando(null);
            setTempStart(null);
            setHoverDate(null);
            setAberto(false);
        }
    };

    const isDentroDaSelecao = (dia) => {
        if (selecionando && tempStart) {
            const fim = hoverDate || tempStart;
            const [a, b] = isBefore(fim, tempStart) ? [fim, tempStart] : [tempStart, fim];
            return isWithinInterval(dia, { start: a, end: b });
        }
        if (start && end) {
            return isWithinInterval(dia, { start, end });
        }
        return false;
    };

    const isInicio = (dia) => {
        if (selecionando && tempStart) return isSameDay(dia, tempStart);
        return start && isSameDay(dia, start);
    };

    const isFim = (dia) => {
        if (selecionando && hoverDate) return isSameDay(dia, hoverDate);
        if (selecionando && tempStart) return isSameDay(dia, tempStart);
        return end && isSameDay(dia, end);
    };

    const labelDatas = () => {
        if (start && end) {
            return `${format(start, "dd/MM/yyyy")} — ${format(end, "dd/MM/yyyy")}`;
        }
        return "Selecionar período";
    };

    return (
        <Container ref={ref}>
            <Trigger onClick={() => setAberto(!aberto)} $aberto={aberto}>
                <FiCalendar size={14} />
                <span>{labelDatas()}</span>
            </Trigger>

            {aberto && (
                <Dropdown>
                    <NavMes>
                        <NavBtn onClick={() => setMesAtual(subMonths(mesAtual, 1))}><FiChevronLeft /></NavBtn>
                        <MesLabel>{format(mesAtual, "MMMM yyyy", { locale: ptBR })}</MesLabel>
                        <NavBtn onClick={() => setMesAtual(addMonths(mesAtual, 1))}><FiChevronRight /></NavBtn>
                    </NavMes>

                    <DiasSemana>
                        {DIAS_SEMANA.map(d => <DiaHeader key={d}>{d}</DiaHeader>)}
                    </DiasSemana>

                    <GridDias>
                        {Array.from({ length: offsetInicio }).map((_, i) => <DiaVazio key={`v-${i}`} />)}
                        {diasDoMes.map(dia => {
                            const dentro = isDentroDaSelecao(dia);
                            const inicio = isInicio(dia);
                            const fim = isFim(dia);
                            const hoje = isSameDay(dia, new Date());

                            return (
                                <DiaCell
                                    key={dia.toISOString()}
                                    $dentro={dentro}
                                    $inicio={inicio}
                                    $fim={fim}
                                    $hoje={hoje}
                                    onClick={() => handleDiaClick(dia)}
                                    onMouseEnter={() => selecionando && setHoverDate(dia)}
                                >
                                    {format(dia, "d")}
                                </DiaCell>
                            );
                        })}
                    </GridDias>

                    {selecionando && (
                        <Dica>Clique no dia final do período</Dica>
                    )}
                </Dropdown>
            )}
        </Container>
    );
}

/* ─── STYLED ─── */

const Container = styled.div`
  position: relative;
`;

const Trigger = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ $aberto, theme }) => $aberto ? theme.cores.azul : theme.cores.borda};
  color: ${({ theme }) => theme.cores.texto};
  padding: 0 14px;
  height: 44px;
  border-radius: ${({ theme }) => theme.raio.lg};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  svg { color: ${({ theme }) => theme.cores.azul}; flex-shrink: 0; }
  &:hover { border-color: ${({ theme }) => theme.cores.azul}; }
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${({ theme }) => theme.cores.superficie2};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: 16px;
  padding: 16px;
  z-index: 999;
  box-shadow: 0 16px 40px rgba(0,0,0,0.5);
  min-width: 300px;
  animation: fadeIn 0.15s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const NavMes = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const NavBtn = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.cores.borda};
  color: ${({ theme }) => theme.cores.texto};
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255,255,255,0.05); border-color: ${({ theme }) => theme.cores.azul}; }
`;

const MesLabel = styled.span`
  font-weight: 700;
  font-size: 14px;
  text-transform: capitalize;
  color: ${({ theme }) => theme.cores.texto};
`;

const DiasSemana = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  margin-bottom: 4px;
`;

const DiaHeader = styled.div`
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.cores.texto2};
  padding: 4px 0;
  text-transform: uppercase;
`;

const GridDias = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
`;

const DiaVazio = styled.div``;

const DiaCell = styled.button`
  height: 36px;
  border: 0;
  border-radius: ${({ $inicio, $fim, $dentro }) => {
        if ($inicio && $fim) return '8px';
        if ($inicio) return '8px 0 0 8px';
        if ($fim) return '0 8px 8px 0';
        if ($dentro) return '0';
        return '8px';
    }};
  background: ${({ $dentro, $inicio, $fim, theme }) => {
        if ($inicio || $fim) return theme.cores.azul;
        if ($dentro) return 'rgba(47,129,247,0.15)';
        return 'transparent';
    }};
  color: ${({ $dentro, $inicio, $fim, $hoje, theme }) => {
        if ($inicio || $fim) return '#fff';
        if ($dentro) return theme.cores.azul;
        if ($hoje) return theme.cores.azul;
        return theme.cores.texto;
    }};
  font-size: 13px;
  font-weight: ${({ $inicio, $fim, $hoje }) => ($inicio || $fim || $hoje) ? '700' : '500'};
  cursor: pointer;
  transition: all 0.15s;
  position: relative;

  ${({ $hoje, $inicio, $fim }) => $hoje && !$inicio && !$fim && `
    &::after {
      content: '';
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: currentColor;
    }
  `}

  &:hover {
    background: ${({ $inicio, $fim, theme }) => ($inicio || $fim) ? theme.cores.azul : 'rgba(47,129,247,0.25)'};
  }
`;

const Dica = styled.div`
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.cores.azul};
  margin-top: 10px;
  font-weight: 600;
`;
