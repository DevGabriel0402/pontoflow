import React from "react";
import styled from "styled-components";
import { FiShield } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function CookieConsent() {
  const [visivel, setVisivel] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Pequeno delay para não "pular" na tela ao carregar
      const t = setTimeout(() => setVisivel(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const aceitar = () => {
    localStorage.setItem("cookie-consent", "aceito");
    setVisivel(false);
  };

  const recusar = () => {
    localStorage.setItem("cookie-consent", "recusado");
    setVisivel(false);
  };

  if (!visivel) return null;

  return (
    <Container>
      <Content>
        <IconLeft>
          <FiShield size={22} color="#4facfe" />
        </IconLeft>

        <Texto>
          Utilizamos <strong>cookies</strong>, <strong>localização GPS</strong> e outras tecnologias para
          registrar o seu ponto de forma segura. Ao continuar, você concorda com nossa{" "}
          <LinkPolitica onClick={() => navigate("/politica-privacidade")}>
            Política de Privacidade
          </LinkPolitica>
          .
        </Texto>

        <Acoes>
          <BotaoSecundario onClick={recusar}>Recusar</BotaoSecundario>
          <BotaoPrimario onClick={aceitar}>Aceitar</BotaoPrimario>
        </Acoes>
      </Content>
    </Container>
  );
}

const Container = styled.div`
  position: fixed;
  bottom: 24px;
  left: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  justify-content: center;
  animation: slideUp 0.4s ease-out;

  @keyframes slideUp {
    from { transform: translateY(100px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const Content = styled.div`
  background: #1c1c1e;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 16px 20px;
  max-width: 580px;
  width: 100%;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 600px) {
    flex-direction: column;
    text-align: center;
    gap: 14px;
  }
`;

const IconLeft = styled.div`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(79,172,254,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Texto = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #8e8e93;
  flex: 1;

  strong { color: #c7c7cc; }
`;

const LinkPolitica = styled.button`
  background: none;
  border: none;
  color: #4facfe;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  font-family: inherit;
`;

const Acoes = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

const BotaoPrimario = styled.button`
  background: #4facfe;
  color: #fff;
  border: 0;
  padding: 9px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: filter 0.2s;

  &:hover { filter: brightness(1.1); }
`;

const BotaoSecundario = styled.button`
  background: transparent;
  color: #8e8e93;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.05);
    color: #fff;
  }
`;

