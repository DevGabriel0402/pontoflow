import React from "react";
import styled from "styled-components";
import { FiX, FiShare2, FiCopy, FiDownload, FiExternalLink, FiCheck } from "react-icons/fi";
import { toast } from "react-hot-toast";

export default function ModalCompartilharSistema({ aberto, onFechar }) {
  const [copiado, setCopiado] = React.useState(false);
  const siteUrl = "https://clickpontobh.vercel.app";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(siteUrl)}`;

  if (!aberto) return null;

  const handleCopiarLink = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopiado(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopiado(false), 2500);
    } catch (e) {
      toast.error("Erro ao copiar link.");
    }
  };

  const handleBaixarQrCode = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qrcode-pontoflow.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download do QR Code concluído!");
    } catch (e) {
      toast.error("Erro ao baixar QR Code.");
    }
  };

  return (
    <Overlay onClick={onFechar}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Titulo>
            <FiShare2 size={20} color="#4facfe" />
            Compartilhar Sistema
          </Titulo>
          <BtnFechar onClick={onFechar} title="Fechar">
            <FiX size={20} />
          </BtnFechar>
        </Header>

        <Corpo>
          <Subtitulo>
            Escaneie o QR Code abaixo para acessar o sistema ou compartilhe o link com seus funcionários.
          </Subtitulo>

          <QrContainer>
            <QrWrapper>
              <img src={qrCodeUrl} alt="QR Code PontoFlow" width={220} height={220} />
            </QrWrapper>
            <BadgeLink href={siteUrl} target="_blank" rel="noopener noreferrer">
              <span>{siteUrl}</span>
              <FiExternalLink size={14} />
            </BadgeLink>
          </QrContainer>

          <AcoesGrid>
            <BtnAcao onClick={handleCopiarLink} $destaque={copiado}>
              {copiado ? <FiCheck size={16} color="#2ecc71" /> : <FiCopy size={16} />}
              <span>{copiado ? "Copiado!" : "Copiar Link"}</span>
            </BtnAcao>

            <BtnAcao onClick={handleBaixarQrCode}>
              <FiDownload size={16} />
              <span>Baixar QR Code</span>
            </BtnAcao>

            <BtnAcao as="a" href={siteUrl} target="_blank" rel="noopener noreferrer" style={{ gridColumn: "1 / -1" }}>
              <FiExternalLink size={16} />
              <span>Abrir Site</span>
            </BtnAcao>
          </AcoesGrid>
        </Corpo>
      </Modal>
    </Overlay>
  );
}

/* ── Styled Components ─────────────────────────── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(6px);
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Modal = styled.div`
  background: #18191c;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const Titulo = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const BtnFechar = styled.button`
  background: transparent;
  border: none;
  color: #8d8d99;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 8px;
  transition: all 0.2s;
  &:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }
`;

const Corpo = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const Subtitulo = styled.p`
  margin: 0;
  font-size: 13px;
  color: #a0a0b0;
  text-align: center;
  line-height: 1.5;
`;

const QrContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
`;

const QrWrapper = styled.div`
  background: #ffffff;
  padding: 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  img {
    display: block;
    border-radius: 8px;
  }
`;

const BadgeLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 30px;
  background: rgba(79, 172, 254, 0.12);
  border: 1px solid rgba(79, 172, 254, 0.3);
  color: #4facfe;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    background: rgba(79, 172, 254, 0.2);
    border-color: #4facfe;
  }
`;

const AcoesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
`;

const BtnAcao = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  box-sizing: border-box;

  background: ${p => p.$destaque ? "rgba(46, 204, 113, 0.15)" : "rgba(255, 255, 255, 0.06)"};
  border: 1px solid ${p => p.$destaque ? "rgba(46, 204, 113, 0.4)" : "rgba(255, 255, 255, 0.12)"};
  color: ${p => p.$destaque ? "#2ecc71" : "#fff"};

  &:hover {
    background: ${p => p.$destaque ? "rgba(46, 204, 113, 0.25)" : "rgba(255, 255, 255, 0.12)"};
    border-color: ${p => p.$destaque ? "#2ecc71" : "#4facfe"};
    color: ${p => p.$destaque ? "#2ecc71" : "#4facfe"};
  }
`;
