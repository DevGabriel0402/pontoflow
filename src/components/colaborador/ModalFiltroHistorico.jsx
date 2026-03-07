import React from "react";
import styled from "styled-components";
import { FiX, FiFilter } from "react-icons/fi";
import SeletorAcordeao from "../SeletorAcordeao";
import { useConfig } from "../../contexts/ConfigContexto";

const TIPOS = [
  { value: "TODOS", label: "Todos os Registros" },
  { value: "ENTRADA", label: "Entrada" },
  { value: "INICIO_INTERVALO", label: "Início Intervalo" },
  { value: "FIM_INTERVALO", label: "Fim Intervalo" },
  { value: "SAIDA", label: "Saída" },
];

export default function ModalFiltroHistorico({
  aberto,
  aoFechar,
  tipo,
  setTipo,
  dataInicio,
  setDataInicio,
  dataFim,
  setDataFim,
  aoLimpar
}) {
  const { config } = useConfig();

  const tiposFiltrados = React.useMemo(() => {
    if (!config?.regras?.pontosAtivos) return TIPOS;
    return TIPOS.filter(t => {
      if (t.value === "TODOS") return true;
      if (t.value === "ENTRADA") return config.regras.pontosAtivos.includes('entrada');
      if (t.value === "SAIDA") return config.regras.pontosAtivos.includes('saida');
      if (t.value === "INICIO_INTERVALO") return config.regras.pontosAtivos.includes('intervalo_saida');
      if (t.value === "FIM_INTERVALO") return config.regras.pontosAtivos.includes('intervalo_entrada');
      return true;
    });
  }, [config?.regras?.pontosAtivos]);

  if (!aberto) return null;

  return (
    <Overlay>
      <Modal>
        <Topo>
          <Titulo>
            <FiFilter size={18} />
            Filtrar Histórico
          </Titulo>
          <BotaoFechar onClick={aoFechar}>
            <FiX size={20} />
          </BotaoFechar>
        </Topo>

        <Corpo>
          <Label>Tipo de Registro</Label>
          <SeletorAcordeao
            opcoes={tiposFiltrados}
            value={tipo}
            onChange={setTipo}
          />

          <Espaco />

          <Label>Período Personalizado</Label>
          <DataGrid>
            <Campo>
              <span>De:</span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </Campo>
            <Campo>
              <span>Até:</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </Campo>
          </DataGrid>
        </Corpo>

        <Rodape>
          <BotaoSecundario onClick={aoLimpar}>Limpar</BotaoSecundario>
          <BotaoPrincipal onClick={aoFechar}>Aplicar Filtros</BotaoPrincipal>
        </Rodape>
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-end; /* Mobile friendly */
  justify-content: center;
  animation: fadeIn 0.2s ease;
  
  @media (min-width: 600px) {
    align-items: center;
    padding: 20px;
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const Modal = styled.div`
  background: #1c1c1e;
  width: 100%;
  max-width: 500px;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  padding-bottom: env(safe-area-inset-bottom, 24px);
  animation: slideInUp 0.4s cubic-bezier(0, 0.55, 0.45, 1);

  @media (min-width: 600px) {
    border-radius: 20px;
    margin: 20px;
    animation: slideUpDesktop 0.3s ease-out;
  }

  @keyframes slideInUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  @keyframes slideUpDesktop {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const Topo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Titulo = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 20px;
  color: #fff;
`;

const BotaoFechar = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Corpo = styled.div`
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
`;

const Label = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #8e8e93;
  margin-bottom: 8px;
  text-transform: uppercase;
`;

const Espaco = styled.div`height: 24px;`;

const DataGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  span {
    font-size: 12px;
    color: #8e8e93;
  }

  input {
    background: #2c2c2e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    height: 44px;
    padding: 0 12px;
    color: #fff;
    border-radius: 8px;
    outline: none;
    
    &:focus {
      border-color: #4facfe;
    }
  }
`;

const Rodape = styled.div`
  margin-top: 32px;
  display: flex;
  gap: 12px;
`;

const BotaoSecundario = styled.button`
  flex: 1;
  background: transparent;
  color: #eb4d4b;
  border: 1px solid #eb4d4b;
  height: 48px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
`;

const BotaoPrincipal = styled.button`
  flex: 2;
  background: #4facfe;
  color: #fff;
  border: 0;
  height: 48px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
`;
