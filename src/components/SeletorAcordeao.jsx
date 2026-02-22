import React from "react";
import styled from "styled-components";
import { FiChevronDown } from "react-icons/fi";

/**
 * @param {string} label - Rótulo do campo
 * @param {Array<{value: string, label: string}>} opcoes - Lista de opções
 * @param {string} value - Valor selecionado
 * @param {function} onChange - Callback ao mudar
 */
export default function SeletorAcordeao({ label, opcoes, value, onChange }) {
  const [aberto, setAberto] = React.useState(false);

  const selecionado = React.useMemo(() => {
    if (!opcoes || !Array.isArray(opcoes) || opcoes.length === 0) return { label: "Selecione...", value: "" };
    return opcoes.find((o) => o.value === value) || opcoes[0];
  }, [opcoes, value]);

  const handleSelect = (val) => {
    onChange(val);
    setAberto(false);
  };

  return (
    <Container>
      {label && <Label>{label}</Label>}

      <Wrapper>
        <Header $aberto={aberto} onClick={() => setAberto(!aberto)}>
          <span>{selecionado.label}</span>
          <FiChevronDown size={18} />
        </Header>

        <Lista $aberto={aberto}>
          {opcoes.map((op) => (
            <Opcao
              key={op.value}
              $ativo={op.value === value}
              onClick={() => handleSelect(op.value)}
            >
              {op.label}
            </Opcao>
          ))}
        </Lista>
      </Wrapper>

      {aberto && <Overlay onClick={() => setAberto(false)} />}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
`;

const Label = styled.label`
  font-size: 12px;
  color: ${({ theme }) => theme.cores.texto2};
`;

const Wrapper = styled.div`
  position: relative;
  z-index: 100;
`;

const Header = styled.div`
  height: 44px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.raio.lg};
  border: 1px solid ${({ theme, $aberto }) => $aberto ? theme.cores.azul : theme.cores.borda};
  background: ${({ theme }) => theme.cores.superficie};
  color: ${({ theme }) => theme.cores.texto};
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${({ theme, $aberto }) => $aberto ? `0 0 0 3px ${theme.cores.azul}22` : "none"};

  svg {
    transition: transform 0.2s ease;
    transform: ${({ $aberto }) => $aberto ? "rotate(180deg)" : "rotate(0)"};
    opacity: 0.7;
  }

  &:hover {
    border-color: ${({ theme }) => theme.cores.azul};
  }
`;

const Lista = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.cores.superficie};
  border: 1px solid ${({ theme }) => theme.cores.borda};
  border-radius: ${({ theme }) => theme.raio.lg};
  box-shadow: ${({ theme }) => theme.sombra.forte};
  overflow: hidden;
  
  max-height: ${({ $aberto }) => ($aberto ? "300px" : "0")};
  opacity: ${({ $aberto }) => ($aberto ? "1" : "0")};
  pointer-events: ${({ $aberto }) => ($aberto ? "all" : "none")};
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
`;

const Opcao = styled.div`
  padding: 12px;
  font-size: 13px;
  cursor: pointer;
  background: ${({ theme, $ativo }) => $ativo ? theme.cores.azul + "15" : "transparent"};
  color: ${({ theme, $ativo }) => $ativo ? theme.cores.azul : theme.cores.texto};
  transition: background 0.15s ease;
  font-weight: ${({ $ativo }) => $ativo ? "700" : "400"};

  &:hover {
    background: ${({ theme }) => theme.cores.superficie2};
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
`;
