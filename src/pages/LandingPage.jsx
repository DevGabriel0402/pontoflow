import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiClock, FiMapPin, FiShield, FiFileText, FiSmartphone, FiUsers, FiStar, FiZap, FiActivity, FiArrowUpRight, FiMessageCircle, FiX, FiLayers, FiCpu, FiMonitor, FiChevronDown } from "react-icons/fi";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Cores Oficiais do Sistema (Tema Dark)
const THEME = {
  bg: "#0F1115",
  surface: "#151922",
  surface2: "#10131A",
  accent: "#2F81F7",
  text: "#FFFFFF",
  textDim: "rgba(255,255,255,0.6)",
  border: "rgba(255,255,255,0.08)",
  gradient: "linear-gradient(135deg, #2F81F7 0%, #00f2fe 100%)"
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [showContact, setShowContact] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", plan: "Profissional", msg: "" });
  const [isPlanOpen, setIsPlanOpen] = useState(false);

  const heroRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(".fade-up",
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }
    );

    tl.fromTo(".hero-mockup",
      { opacity: 0, scale: 0.9, y: 40 },
      { opacity: 1, scale: 1, y: 0, duration: 1.2, ease: "power4.out" },
      "-=0.4"
    );

    gsap.fromTo(".uniform-card",
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        stagger: 0.08,
        duration: 0.6,
        scrollTrigger: {
          trigger: cardsRef.current,
          start: "top 85%",
        }
      }
    );
  }, []);

  const handleWhatsApp = (e) => {
    e.preventDefault();
    const text = `Solicitação de Contato - PontoFlow\n\nNome: ${formData.name}\nContato: ${formData.phone}\nE-mail: ${formData.email}\nPlano Desejado: ${formData.plan}\n\nMensagem: ${formData.msg}`;
    window.open(`https://wa.me/5531991660594?text=${encodeURIComponent(text)}`, "_blank");
    setShowContact(false);
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const selectPlan = (plan) => {
    setFormData({ ...formData, plan });
    setIsPlanOpen(false);
  };

  return (
    <Root>
      <Navbar>
        <div className="nav-inner">
          <Logo onClick={() => navigate("/")}>
            <img src="/icons/pwa-192x192.png" alt="Logo" />
            <span>PontoFlow</span>
          </Logo>
          <NavActions>
            <button className="link" onClick={() => scrollTo('features')}>Recursos</button>
            <button className="link" onClick={() => scrollTo('plans')}>Planos</button>
            <button className="main-btn" onClick={() => setShowContact(true)}>Solicitar Teste</button>
          </NavActions>
        </div>
      </Navbar>

      <HeroSection ref={heroRef}>
        <div className="hero-glow" />
        <div className="container">
          <div className="hero-text">
            <Badge className="fade-up">SOLUÇÃO CORPORATIVA DE ALTO NÍVEL</Badge>
            <h1 className="fade-up">Gestão de Jornada com <br /> <span>Simetria Absoluta.</span></h1>
            <p className="fade-up">
              O PontoFlow combina design de elite com precisão técnica. Monitore seu time em tempo real
              através de uma interface moderna, intuitiva e 100% segura.
            </p>
            <div className="btns fade-up">
              <button className="primary" onClick={() => setShowContact(true)}>Começar Teste Gratuito</button>
              <button className="secondary" onClick={() => navigate("/login")}>Entrar no Sistema</button>
            </div>
          </div>

          <div className="hero-mockup">
            <img src="/screenshots/hero_mockup.png" alt="Multi-device Mockup" />
            <div className="mockup-glow" />
          </div>
        </div>
      </HeroSection>

      <FeaturesSection id="features" ref={cardsRef}>
        <HeaderCenter>
          <h2 className="fade-up">Funcionalidades <span>Especializadas.</span></h2>
          <p className="fade-up">Cada módulo foi construído para entregar o máximo de performance e clareza para o seu RH.</p>
        </HeaderCenter>

        <UniformGrid>
          <FeatureCard className="uniform-card">
            <div className="card-icon"><FiMapPin /></div>
            <h3>Geocercas Inteligentes</h3>
            <p>
              Defina perímetros geográficos exatos para cada posto de trabalho. O sistema valida automaticamente
              a posição do colaborador no momento da batida, impedindo marcações fora da sede com precisão métrica.
            </p>
          </FeatureCard>

          <FeatureCard className="uniform-card">
            <div className="card-icon"><FiZap /></div>
            <h3>Sincronismo em Tempo Real</h3>
            <p>
              Esqueça atrasos no processamento. Todas as batidas de ponto realizadas via App Mobile ou Web são
              remetidas instantaneamente ao dashboard administrativo, permitindo controle imediato da operação.
            </p>
          </FeatureCard>

          <FeatureCard className="uniform-card">
            <div className="card-icon"><FiShield /></div>
            <h3>Portaria 671 MTP</h3>
            <p>
              Segurança jurídica absoluta para sua empresa. O PontoFlow opera em total conformidade com a
              legislação vigente, emitindo comprovantes de registro eletrônico e relatórios auditáveis.
            </p>
          </FeatureCard>

          <FeatureCard className="uniform-card">
            <div className="card-icon"><FiMonitor /></div>
            <h3>Dashboard Administrativo</h3>
            <p>
              Visão geral completa da sua força de trabalho. Analise faltas, atrasos e horas extras em um
              painel de controle centralizado com gráficos dinâmicos e chat de suporte prioritário.
            </p>
          </FeatureCard>

          <FeatureCard className="uniform-card">
            <div className="card-icon"><FiFileText /></div>
            <h3>Fechamentos Automatizados</h3>
            <p>
              Gere toda a documentação da folha em segundos. Relatórios detalhados em PDF e CSV com
              cálculos automáticos de banco de horas, adicional noturno e horas suplementares sem erros manuais.
            </p>
          </FeatureCard>

          <FeatureCard className="uniform-card">
            <div className="card-icon"><FiLayers /></div>
            <h3>Gestão de Justificativas</h3>
            <p>
              Fluxo simplificado para abonos e atestados. O colaborador anexa a evidência via app e o gestor
              valida em tempo real, mantendo todo o histórico de alterações centralizado e transparente.
            </p>
          </FeatureCard>
        </UniformGrid>
      </FeaturesSection>

      <PricingSection id="plans">
        <HeaderCenter>
          <h2>Planos para <span>todos os tamanhos.</span></h2>
        </HeaderCenter>
        <div className="pricing-grid">
          <PriceCard>
            <label>INDIVIDUAL</label>
            <h3>R$ 99<span>/mês</span></h3>
            <ul>
              <li><FiCheckCircle /> Até 10 Colaboradores</li>
              <li><FiCheckCircle /> Geofencing Ativo</li>
              <li><FiCheckCircle /> Suporte Via Chat Interno</li>
            </ul>
            <button onClick={() => { setFormData({ ...formData, plan: "Individual" }); setShowContact(true); }}>Assinar agora</button>
          </PriceCard>

          <PriceCard className="featured">
            <div className="pop-badge">RECOMENDADO</div>
            <label>PROFISSIONAL</label>
            <h3>R$ 199<span>/mês</span></h3>
            <ul>
              <li><FiCheckCircle /> Até 50 Colaboradores</li>
              <li><FiCheckCircle /> Banco de Horas Automático</li>
              <li><FiCheckCircle /> Relatórios PDF/CSV</li>
              <li><FiCheckCircle /> Notificações Real-time</li>
            </ul>
            <button onClick={() => { setFormData({ ...formData, plan: "Profissional" }); setShowContact(true); }}>Assinar agora</button>
          </PriceCard>

          <PriceCard>
            <label>CORPORATIVO</label>
            <h3>Custom</h3>
            <ul>
              <li><FiCheckCircle /> Colaboradores Ilimitados</li>
              <li><FiCheckCircle /> Suporte a Integrações</li>
              <li><FiCheckCircle /> Onboarding Dedicado</li>
              <li><FiCheckCircle /> Gerente de Conta</li>
            </ul>
            <button className="border-btn" onClick={() => { setFormData({ ...formData, plan: "Corporativo" }); setShowContact(true); }}>Falar com Vendas</button>
          </PriceCard>
        </div>
      </PricingSection>

      <CTASection>
        <div className="cta-box">
          <h2>Pronto para elevar sua gestão ao <span>próximo nível?</span></h2>
          <button onClick={() => setShowContact(true)}>Solicitar Teste Grátis <FiArrowRight /></button>
          <p>Experimente a ferramenta favorita dos gestores de RH modernos.</p>
        </div>
      </CTASection>

      <Footer>
        <div className="footer-inner">
          <Logo>
            <img src="/icons/pwa-192x192.png" alt="Logo" />
            <span>PontoFlow</span>
          </Logo>
          <div className="footer-info">
            <p>© 2026 PontoFlow. Todos os direitos reservados.</p>
            <span>Feito com paixão pela tecnologia de gestão.</span>
          </div>
        </div>
      </Footer>

      {showContact && (
        <Overlay onClick={() => setShowContact(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <div className="m-header">
              <h3>Solicitar Acesso</h3>
              <button onClick={() => setShowContact(false)}><FiX /></button>
            </div>
            <p>Preencha os dados abaixo e entraremos em contato via WhatsApp.</p>

            <form onSubmit={handleWhatsApp}>
              <div className="row">
                <div className="field">
                  <label>Seu Nome</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Gabriel" />
                </div>
                <div className="field">
                  <label>WhatsApp / Contato</label>
                  <input required type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(31) 9...." />
                </div>
              </div>

              <div className="field">
                <label>E-mail Corporativo</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="seu@email.com" />
              </div>

              <div className="field">
                <label>Plano de Interesse</label>
                <Accordion onClick={() => setIsPlanOpen(!isPlanOpen)}>
                  <div className="display">
                    {formData.plan}
                    <FiChevronDown className={isPlanOpen ? 'open' : ''} />
                  </div>
                  {isPlanOpen && (
                    <div className="drop" onClick={e => e.stopPropagation()}>
                      <div className="opt" onClick={() => selectPlan("Individual")}>Individual (R$ 99/mês)</div>
                      <div className="opt" onClick={() => selectPlan("Profissional")}>Profissional (R$ 199/mês)</div>
                      <div className="opt" onClick={() => selectPlan("Corporativo")}>Corporativo (Custom)</div>
                    </div>
                  )}
                </Accordion>
              </div>

              <div className="field">
                <label>Mensagem ou Dúvida (Opcional)</label>
                <textarea value={formData.msg} onChange={e => setFormData({ ...formData, msg: e.target.value })} placeholder="Conte-nos um pouco sobre sua necessidade..." />
              </div>

              <button type="submit" className="wa-btn"><FiMessageCircle /> Solicitar via WhatsApp</button>
            </form>
          </Modal>
        </Overlay>
      )}
    </Root>
  );
}

const Root = styled.div`
  background: ${THEME.bg};
  color: ${THEME.text};
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
`;

const Navbar = styled.nav`
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
  background: rgba(15, 17, 21, 0.7);
  backdrop-filter: blur(25px);
  border-bottom: 1px solid ${THEME.border};
  padding: 14px 0;

  .nav-inner {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    @media (max-width: 768px) { padding: 0 20px; }
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  img { width: 34px; height: 34px; border-radius: 8px; }
  span { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px; }
`;

const NavActions = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
  .link {
    background: none;
    border: none;
    color: ${THEME.textDim};
    font-weight: 500;
    cursor: pointer;
    transition: 0.2s;
    &:hover { color: #fff; }
  }
  .main-btn {
    background: ${THEME.accent};
    color: #fff;
    border: none;
    padding: 10px 24px;
    border-radius: 99px;
    font-weight: 800;
    cursor: pointer;
    transition: 0.3s;
    &:hover { box-shadow: 0 0 25px rgba(47, 129, 247, 0.45); transform: translateY(-2px); }
  }
  @media (max-width: 768px) { .link { display: none; } }
`;

const HeroSection = styled.header`
  padding: 20px 40px 80px;
  position: relative;
  min-height: 400px;
  display: flex;
  align-items: center;
  
  .hero-glow {
    position: absolute;
    top: -10%;
    left: 40%;
    transform: translateX(-50%);
    width: 1200px;
    height: 1000px;
    background: radial-gradient(circle, rgba(47, 129, 247, 0.08) 0%, transparent 60%);
    pointer-events: none;
  }

  .container {
    max-width: 1140px;
    margin: 0 auto;
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 50px;
    text-align: left;

    @media (max-width: 1000px) {
      flex-direction: column;
      text-align: center;
      gap: 40px;
    }
    @media (max-width: 768px) { gap: 32px; }
  }

  .hero-text {
    flex: 1;
    max-width: 700px;

    @media (max-width: 1000px) {
      max-width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }

  h1 {
    font-family: 'Outfit', sans-serif;
    font-size: 56px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -2px;
    margin: 16px 0 20px;
    span { color: ${THEME.accent}; }
    @media (max-width: 1200px) { font-size: 48px; }
    @media (max-width: 768px) { font-size: 32px; letter-spacing: -1px; }
  }

  p {
    font-size: 17px;
    color: ${THEME.textDim};
    margin-bottom: 44px;
    line-height: 1.7;
    max-width: 520px;
    @media (max-width: 1000px) { margin-left: auto; margin-right: auto; }
  }

  .btns {
    display: flex;
    gap: 20px;
    margin-bottom: 0;
    button {
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      &.primary { 
        background: ${THEME.gradient}; border: none; color: #fff; 
        box-shadow: 0 10px 30px rgba(47, 129, 247, 0.25);
        &:hover { transform: translateY(-4px) scale(1.02); }
      }
      &.secondary { 
        background: rgba(255,255,255,0.03); border: 1px solid ${THEME.border}; color: #fff; 
        &:hover { background: rgba(255,255,255,0.06); }
      }
    }
    @media (max-width: 600px) { flex-direction: column; button { width: 100%; } }
  }

  .hero-mockup {
    flex: 1;
    position: relative;
    img { 
      width: 130%; /* Levemente maior para vazar pro lado e dar profundidade */
      max-width: none;
      transform: translateX(0);
      display: block; 
      border-radius: 12px; 
      filter: drop-shadow(0 40px 100px rgba(0,0,0,0.6)); 
      
      @media (max-width: 1000px) {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
      }
    }
    .mockup-glow {
       position: absolute;
       bottom: 70px;
       left: 60%;
       transform: translateX(-50%);
       width: 100%;
       height: 100px;
       background: radial-gradient(ellipse at center, rgba(47, 129, 247, 0.20) 0%, transparent 70%);
       z-index: -1;
    }
  }
`;

const Badge = styled.span`
  background: rgba(47, 129, 247, 0.1);
  border: 1px solid rgba(47, 129, 247, 0.2);
  color: ${THEME.accent};
  padding: 8px 18px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
`;

const FeaturesSection = styled.section`
  padding: 50px 40px;
  max-width: 1240px;
  margin: 0 auto;
  @media (max-width: 768px) { padding: 50px 20px; }
`;

const HeaderCenter = styled.div`
  text-align: center;
  margin-bottom: 60px;
  h2 { font-family: 'Outfit', sans-serif; font-size: 52px; font-weight: 800; letter-spacing: -2px; span { color: ${THEME.accent}; } @media (max-width: 768px) { font-size: 36px; } }
  p { font-size: 19px; color: ${THEME.textDim}; margin-top: 14px; @media (max-width: 768px) { font-size: 16px; } }
`;

const UniformGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  @media (max-width: 1000px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 650px) { grid-template-columns: 1fr; }
`;

const FeatureCard = styled.div`
  background: ${THEME.surface};
  border: 1px solid ${THEME.border};
  border-radius: 32px;
  padding: 48px;
  transition: all 0.4s;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: rgba(47, 129, 247, 0.35);
    background: rgba(255,255,255,0.01);
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  }

  .card-icon { font-size: 32px; color: ${THEME.accent}; margin-bottom: 24px; }
  h3 { font-size: 24px; font-weight: 800; margin-bottom: 16px; color: #fff; }
  p { font-size: 16px; color: ${THEME.textDim}; line-height: 1.7; }
`;

const PricingSection = styled.section`
  padding: 120px 40px;
  max-width: 1240px;
  margin: 0 auto;
  @media (max-width: 768px) { padding: 80px 20px; }
  .pricing-grid {
    display: flex;
    gap: 32px;
    justify-content: center;
    @media (max-width: 1000px) { flex-direction: column; align-items: center; }
  }
`;


const PriceCard = styled.div`
  background: ${THEME.surface2};
  border: 1px solid ${THEME.border};
  border-radius: 40px;
  padding: 60px 48px;
  flex: 1;
  max-width: 380px;
  width: 100%;
  position: relative;
  transition: 0.3s;
  display: flex;
  flex-direction: column;

  &.featured {
     background: #11141D;
     border: 2px solid ${THEME.accent};
     transform: scale(1.05);
     @media (max-width: 1000px) { transform: none; }
     .pop-badge {
        position: absolute;
        top: -14px;
        left: 50%;
        transform: translateX(-50%);
        background: ${THEME.accent};
        padding: 8px 24px;
        border-radius: 100px;
        font-size: 11px;
        font-weight: 900;
     }
  }

  label { font-size: 13px; font-weight: 800; color: ${THEME.textDim}; letter-spacing: 1px; }
  h3 { font-size: 42px; margin: 12px 0 40px; span { font-size: 16px; color: ${THEME.textDim}; } }

  ul {
    list-style: none;
    padding: 0;
    margin-bottom: 48px;
    flex: 1;
    li { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; color: ${THEME.textDim}; svg { color: ${THEME.accent}; } }
  }

  button {
    width: 100%;
    padding: 18px;
    border-radius: 14px;
    border: none;
    background: #fff;
    color: #111;
    font-weight: 800;
    font-size: 16px;
    cursor: pointer;
    &:hover { opacity: 0.9; }
    &.border-btn { background: transparent; border: 1.5px solid ${THEME.border}; color: #fff; &:hover { background: rgba(255,255,255,0.05); } }
  }
`;

const CTASection = styled.section`
  padding: 120px 40px;
  @media (max-width: 768px) { padding: 60px 20px; }
  .cta-box {
    max-width: 1100px;
    margin: 0 auto;
    background: ${THEME.surface};
    border: 1px solid ${THEME.border};
    border-radius: 54px;
    padding: 100px 40px;
    text-align: center;
    @media (max-width: 768px) { padding: 60px 24px; border-radius: 32px; }
    h2 { font-family: 'Outfit', sans-serif; font-size: 56px; font-weight: 800; letter-spacing: -2px; margin-bottom: 40px; span { color: ${THEME.accent}; } @media (max-width: 768px) { font-size: 32px; } }
    button {
       padding: 24px 64px;
       background: ${THEME.gradient};
       border: none;
       border-radius: 100px;
       color: #fff;
       font-size: 20px;
       font-weight: 800;
       cursor: pointer;
       transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
       @media (max-width: 768px) { padding: 18px 48px; font-size: 17px; width: 100%; }
       &:hover { transform: scale(1.08); box-shadow: 0 0 40px rgba(47, 129, 247, 0.4); }
    }
    p { margin-top: 28px; color: ${THEME.textDim}; font-size: 18px; @media (max-width: 768px) { font-size: 15px; } }
  }
`;


const Footer = styled.footer`
  padding: 80px 40px;
  border-top: 1px solid ${THEME.border};
  .footer-inner {
    max-width: 1240px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    @media (max-width: 768px) { flex-direction: column; gap: 40px; }
  }
  .footer-info {
    text-align: right;
    p { font-weight: 700; margin-bottom: 6px; }
    span { color: ${THEME.textDim}; font-size: 14px; }
    @media (max-width: 768px) { text-align: center; }
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(15px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Modal = styled.div`
  background: ${THEME.surface};
  border: 1px solid ${THEME.border};
  width: 100%;
  max-width: 460px; /* Reduzido de 500 para 460 */
  border-radius: 32px;
  padding: 40px; /* Reduzido de 56 para 40 */
  box-shadow: 0 50px 100px rgba(0,0,0,0.8);
  max-height: 90vh;
  overflow-y: auto;
  
  .m-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    h3 { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; }
    button { background: rgba(255,255,255,0.05); border: none; padding: 10px; border-radius: 50%; color: #fff; cursor: pointer; }
  }

  p { color: ${THEME.textDim}; margin-bottom: 32px; line-height: 1.4; font-size: 15px; }

  form {
    display: flex;
    flex-direction: column;
    gap: 18px; /* Reduzido de 22 para 18 */

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      @media (max-width: 600px) { grid-template-columns: 1fr; }
    }

    .field {
       display: flex;
       flex-direction: column;
       gap: 8px;
       label { font-size: 12px; font-weight: 800; color: ${THEME.textDim}; text-transform: uppercase; letter-spacing: 0.5px; }
       input, textarea {
          background: rgba(0,0,0,0.3);
          border: 1px solid ${THEME.border};
          padding: 14px;
          border-radius: 10px;
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          &:focus { outline: none; border-color: ${THEME.accent}; background: rgba(47,129,247,0.05); }
       }
       textarea { height: 90px; resize: none; }
    }
    .wa-btn {
       background: #25D366;
       color: #fff;
       padding: 16px;
       border-radius: 12px;
       border: none;
       font-weight: 900;
       font-size: 17px;
       display: flex;
       align-items: center;
       justify-content: center;
       gap: 10px;
       cursor: pointer;
       transition: 0.3s;
       margin-top: 8px;
       &:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(37, 211, 102, 0.4); }
    }
  }
`;

const Accordion = styled.div`
  background: rgba(0,0,0,0.3);
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  cursor: pointer;
  position: relative;
  
  .display {
    padding: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: #fff;
    svg { transition: transform 0.3s; &.open { transform: rotate(180deg); } }
  }

  .drop {
    position: absolute;
    top: 105%;
    left: 0;
    width: 100%;
    background: #1a1e26;
    border: 1px solid ${THEME.border};
    border-radius: 10px;
    z-index: 10;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);

    .opt {
      padding: 12px 14px;
      font-size: 13px;
      color: ${THEME.textDim};
      transition: all 0.2s;
      &:hover { background: ${THEME.accent}; color: #fff; }
    }
  }
`;
