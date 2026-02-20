import React from "react";
import styled from "styled-components";
import { FiInfo } from "react-icons/fi";

export default function CookieConsent() {
    const [visivel, setVisivel] = React.useState(false);

    React.useEffect(() => {
        const consent = localStorage.getItem("cookie-consent");
        if (!consent) {
            setVisivel(true);
        }
    }, []);

    const aceitar = () => {
        localStorage.setItem("cookie-consent", "true");
        setVisivel(false);
    };

    if (!visivel) return null;

    return (
        <Container>
            <Content>
                <FiInfo size={24} color="#4facfe" />
                <Texto>
                    Utilizamos cookies e outras tecnologias para melhorar sua experiência no PontoFlow.
                    Ao continuar navegando, você concorda com nossa política de dados.
                </Texto>
                <Botao onClick={aceitar}>Entendido</Botao>
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 600px) {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
`;

const Texto = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: #8e8e93;
  flex: 1;
`;

const Botao = styled.button`
  background: #4facfe;
  color: #fff;
  border: 0;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    filter: brightness(1.1);
  }
`;
