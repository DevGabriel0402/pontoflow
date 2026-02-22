import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiShield } from "react-icons/fi";

export default function PoliticaPrivacidade() {
    const navigate = useNavigate();

    return (
        <Pagina>
            <Topo>
                <BtnVoltar onClick={() => navigate(-1)}>
                    <FiArrowLeft size={18} />
                    Voltar
                </BtnVoltar>
            </Topo>

            <Conteudo>
                <Cabecalho>
                    <FiShield size={36} color="#4facfe" />
                    <h1>Política de Privacidade</h1>
                    <DataAtualizacao>Última atualização: 22 de fevereiro de 2025</DataAtualizacao>
                </Cabecalho>

                <Secao>
                    <h2>1. Quem somos</h2>
                    <p>
                        O <strong>ClickPonto</strong> é um sistema de registro de ponto eletrônico operado como serviço SaaS
                        (Software como Serviço). O serviço é contratado por empresas e entidades (doravante "Empresa") e
                        utilizado pelos colaboradores dessas organizações. Esta política descreve como coletamos, usamos,
                        armazenamos e protegemos seus dados pessoais.
                    </p>
                </Secao>

                <Secao>
                    <h2>2. Dados que coletamos</h2>
                    <p>Ao utilizar o ClickPonto, os seguintes dados podem ser coletados:</p>

                    <TabelaDados>
                        <thead>
                            <tr>
                                <th>Dado</th>
                                <th>Por que coletamos</th>
                                <th>Base legal (LGPD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Nome e e-mail</strong></td>
                                <td>Identificação do usuário no sistema</td>
                                <td>Execução de contrato</td>
                            </tr>
                            <tr>
                                <td><strong>Localização GPS</strong></td>
                                <td>Validação de geofencing — verificar se está no local de trabalho</td>
                                <td>Legítimo interesse / contrato</td>
                            </tr>
                            <tr>
                                <td><strong>Endereço IP</strong></td>
                                <td>Auditoria e segurança dos registros de ponto</td>
                                <td>Legítimo interesse</td>
                            </tr>
                            <tr>
                                <td><strong>Informações do dispositivo</strong></td>
                                <td>User agent, plataforma e idioma para auditoria técnica</td>
                                <td>Legítimo interesse</td>
                            </tr>
                            <tr>
                                <td><strong>Registros de ponto</strong></td>
                                <td>Controle de jornada (entrada, intervalos, saída)</td>
                                <td>Execução de contrato / obrigação legal</td>
                            </tr>
                            <tr>
                                <td><strong>Dados biométricos (Facial ID)*</strong></td>
                                <td>Autenticação facial para confirmação de identidade no registro de ponto</td>
                                <td>Consentimento explícito</td>
                            </tr>
                            <tr>
                                <td><strong>Cookies de sessão</strong></td>
                                <td>Manutenção da sessão autenticada e preferências do usuário</td>
                                <td>Consentimento / legítimo interesse</td>
                            </tr>
                        </tbody>
                    </TabelaDados>
                    <NotaTabela>
                        * O reconhecimento facial, quando habilitado, é processado pelo serviço de terceiros <strong>FaceIO</strong> (faceio.net).
                        Os dados biométricos são armazenados exclusivamente nos servidores do FaceIO, sujeitos à sua própria política de privacidade.
                        O ClickPonto armazena apenas um identificador anônimo (Facial ID) vinculado ao seu perfil.
                        O consentimento é coletado durante o processo de cadastro facial.
                    </NotaTabela>
                </Secao>

                <Secao>
                    <h2>3. Como usamos seus dados</h2>
                    <ul>
                        <li>Registrar e auditar os horários de entrada, intervalos e saída;</li>
                        <li>Validar a localização do colaborador dentro do perímetro autorizado (geofencing);</li>
                        <li>Gerar relatórios de jornada para a empresa contratante;</li>
                        <li>Permitir a exportação de registros em formato PDF;</li>
                        <li>Garantir a segurança do sistema e prevenir fraudes;</li>
                        <li>Enviar notificações sobre atualizações e manutenções do sistema.</li>
                    </ul>
                </Secao>

                <Secao>
                    <h2>4. Armazenamento e segurança</h2>
                    <p>
                        Os dados são armazenados em servidores do <strong>Google Firebase / Firestore</strong>, localizados
                        em data centers com certificação ISO 27001. O acesso é protegido por autenticação Firebase Auth
                        e regras de segurança (Firestore Security Rules) que impedem acesso não autorizado entre empresas.
                    </p>
                    <p>
                        Os dados de uma empresa nunca são acessíveis por colaboradores ou administradores de outra empresa.
                        Apenas administradores da própria empresa e operadores do sistema ClickPonto têm acesso aos registros.
                    </p>
                </Secao>

                <Secao>
                    <h2>5. Compartilhamento de dados</h2>
                    <p>Seus dados podem ser compartilhados com:</p>
                    <ul>
                        <li><strong>Empresa contratante:</strong> seu empregador tem acesso aos registros de ponto para fins de gestão de jornada;</li>
                        <li><strong>Google Firebase:</strong> infraestrutura de armazenamento e autenticação;</li>
                        <li><strong>FaceIO (PixLab):</strong> processamento do reconhecimento facial, quando habilitado;</li>
                        <li><strong>Autoridades públicas:</strong> quando exigido por lei ou ordem judicial.</li>
                    </ul>
                    <p>Não vendemos, alugamos nem compartilhamos seus dados com terceiros para fins publicitários.</p>
                </Secao>

                <Secao>
                    <h2>6. Cookies e tecnologias similares</h2>
                    <p>O ClickPonto utiliza os seguintes tipos de cookies:</p>
                    <ul>
                        <li><strong>Cookies essenciais:</strong> necessários para autenticação e funcionamento básico do sistema (sessão Firebase);</li>
                        <li><strong>Cookies de preferência:</strong> armazenam configurações como tema e consentimento de uso;</li>
                        <li><strong>Armazenamento local (localStorage):</strong> utilizado para fila offline de registros de ponto e preferências da interface.</li>
                    </ul>
                    <p>
                        Ao clicar em "Entendido" no aviso de cookies, você consente com o uso dessas tecnologias.
                        Você pode limpar os dados do navegador a qualquer momento para revogar esse consentimento.
                    </p>
                </Secao>

                <Secao>
                    <h2>7. Seus direitos (LGPD)</h2>
                    <p>Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
                    <ul>
                        <li>Confirmar a existência de tratamento dos seus dados;</li>
                        <li>Acessar os dados que temos sobre você;</li>
                        <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
                        <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
                        <li>Revogar o consentimento para tratamento de dados biométricos;</li>
                        <li>Solicitar a portabilidade dos seus dados;</li>
                        <li>Obter informações sobre entidades com quem compartilhamos seus dados.</li>
                    </ul>
                    <p>
                        Para exercer seus direitos, entre em contato pelo e-mail indicado na seção 9.
                    </p>
                </Secao>

                <Secao>
                    <h2>8. Retenção de dados</h2>
                    <p>
                        Os registros de ponto são mantidos enquanto a empresa contratante mantiver contrato ativo com o ClickPonto.
                        Após o encerramento do contrato, os dados são retidos por até <strong>5 anos</strong> para fins de
                        cumprimento de obrigação legal trabalhista, conforme a CLT, e então eliminados de forma segura.
                    </p>
                    <p>
                        Os dados biométricos (Facial ID) são eliminados imediatamente mediante solicitação do colaborador ou
                        da empresa contratante.
                    </p>
                </Secao>

                <Secao>
                    <h2>9. Contato e Encarregado de Dados (DPO)</h2>
                    <p>
                        Para dúvidas, solicitações ou exercício dos seus direitos, entre em contato:
                    </p>
                    <ContatoCard>
                        <p><strong>ClickPonto</strong></p>
                        <p>E-mail: <a href="mailto:privacidade@clickponto.com.br">privacidade@clickponto.com.br</a></p>
                        <p>Horário de atendimento: Segunda a Sexta, das 9h às 18h</p>
                    </ContatoCard>
                </Secao>

                <Secao>
                    <h2>10. Alterações nesta Política</h2>
                    <p>
                        Esta política pode ser atualizada periodicamente. Quando isso ocorrer, notificaremos os usuários
                        através do painel do sistema e atualizaremos a data no topo desta página.
                        Recomendamos que você revise esta política regularmente.
                    </p>
                </Secao>
            </Conteudo>
        </Pagina>
    );
}

/* ── Styled Components ─────────────────────────────── */

const Pagina = styled.div`
    min-height: 100vh;
    background: #0d0d0f;
    color: #e1e1e6;
    font-family: 'Inter', sans-serif;
`;

const Topo = styled.header`
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    position: sticky;
    top: 0;
    background: #0d0d0f;
    z-index: 10;
`;

const BtnVoltar = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: #e1e1e6;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(255,255,255,0.1);
    }
`;

const Conteudo = styled.main`
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 24px 80px;
`;

const Cabecalho = styled.div`
    text-align: center;
    margin-bottom: 48px;

    h1 {
        font-size: 28px;
        font-weight: 800;
        margin: 16px 0 8px;
        color: #fff;
    }
`;

const DataAtualizacao = styled.p`
    font-size: 13px;
    color: #8d8d99;
`;

const Secao = styled.section`
    margin-bottom: 40px;

    h2 {
        font-size: 18px;
        font-weight: 700;
        color: #fff;
        margin: 0 0 16px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    p {
        font-size: 14px;
        line-height: 1.8;
        color: #b0b0ba;
        margin: 0 0 12px;
    }

    ul {
        padding-left: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;

        li {
            font-size: 14px;
            line-height: 1.7;
            color: #b0b0ba;
        }
    }
`;

const TabelaDados = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin: 16px 0 12px;

    th {
        background: rgba(255,255,255,0.05);
        color: #8d8d99;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        padding: 10px 14px;
        text-align: left;
        border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    td {
        padding: 12px 14px;
        border-bottom: 1px solid rgba(255,255,255,0.04);
        color: #b0b0ba;
        vertical-align: top;
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.02); }

    @media (max-width: 600px) {
        display: block;
        overflow-x: auto;
    }
`;

const NotaTabela = styled.p`
    font-size: 12px !important;
    color: #8d8d99 !important;
    background: rgba(79,172,254,0.06);
    border: 1px solid rgba(79,172,254,0.15);
    border-radius: 8px;
    padding: 12px 14px;
    line-height: 1.6 !important;
`;

const ContatoCard = styled.div`
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 20px;
    margin-top: 12px;

    p {
        margin: 4px 0 !important;
    }

    a {
        color: #4facfe;
        text-decoration: none;
        &:hover { text-decoration: underline; }
    }
`;
