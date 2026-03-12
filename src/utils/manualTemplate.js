export const INITIAL_MANUAL_DATA = [
    {
        id: 'sec1',
        title: 'Manifesto & Composição',
        type: 'normal',
        pageBreak: false,
        elements: [
            { 
                id: 'e1', 
                type: 'paragraph', 
                value: 'O PontoFlow é um ecossistema integrado projetado para fornecer simetria absoluta entre os dados registrados e a gestão de recursos humanos.',
                style: { weight: '400', size: '16px', color: '#1a1a1a' }
            },
            { 
                id: 'e2', 
                type: 'grid', 
                items: [
                    { title: 'Plataforma Web Master (React.js)', description: 'Controle global de clientes, faturamento e configurações SaaS em tempo real.' },
                    { title: 'Painel do Administrador', description: 'Gestão de funcionários, relatórios e geocercas para controle de jornada rigoroso.' },
                    { title: 'Terminal do Colaborador (PWA)', description: 'Registro de ponto ágil via celular ou tablet com validação automática de GPS.' },
                    { title: 'Segurança Cloud (Firebase)', description: 'Dados criptografados e sincronizados instantaneamente para evitar fraudes.' }
                ] 
            }
        ]
    },
    {
        id: 'sec2',
        title: 'Blueprint de Sucesso (Passo a Passo)',
        type: 'blueprint',
        pageBreak: false,
        elements: [
            { 
                id: 'e3', 
                type: 'steps', 
                items: [
                    { number: '1', title: 'Configuração da Geocerca', description: 'Em "Configurações", defina a localização exata da sua empresa no mapa e o raio permitido (ex: 100m).' },
                    { number: '2', title: 'Cadastro de Funcionários', description: 'Na aba "Funcionários", registre a equipe com matrículas e horários previstos.' },
                    { number: '3', title: 'Onboarding', description: 'Entregue as credenciais aos colaboradores. Eles devem usar o PWA para bater o ponto.' },
                    { number: '4', title: 'Gestão Real-time', description: 'Acompanhe as batidas na "Visão Geral". Use o chat para dúvidas técnicas.' },
                    { number: '5', title: 'Fechamento', description: 'No fim do mês, gere o "Mensal PDF" e exporte para sua folha de pagamento.' }
                ] 
            }
        ]
    },
    {
        id: 'sec3',
        title: 'Detalhamento do Painel Administrativo',
        type: 'normal',
        pageBreak: true,
        elements: [
            { id: 'e4', type: 'paragraph', value: 'Entenda o que cada recurso oferece para sua gestão diária:' },
            { 
                id: 'e5', 
                type: 'cards', 
                items: [
                    { icon: '📊', title: 'Visão Geral (Dashboard)', items: ['Monitoramento Social: Total de ativos, faltas e atrasos do dia.', 'Mapa de Batidas: Visualização de alertas caso alguém bata o ponto fora do raio permitido.', 'Exportação Rápida: Botões dedicados para Relatório Mensal e Planilha CSV.'] },
                    { icon: '👥', title: 'Gestão de Equipe', items: ['Cadastro Individual: Definição de CPF, Nome, Matrícula e Carga Horária Semanal.', 'Status Dinâmico: Bloqueio imediato de acesso para colaboradores desligados.', 'Ajuste de Jornada: Alteração de turnos e permissões especiais por usuário.'] },
                    { icon: '✉️', title: 'Abonos & Justificativas', items: ['Central de Atestados: Recebimento digital de documentos e fotos de atestados médicos.', 'Sistema de Auditoria: Histórico de quem aprovou ou negou cada abono solicitado.'] },
                    { icon: '⚙️', title: 'Parametrização', items: ['Tolerância de Horário: Definição de quantos minutos o colaborador pode atrasar sem gerar alerta.', 'Personalização: Nome da empresa e logotipo para os relatórios PDF.'] }
                ] 
            }
        ]
    },
    {
        id: 'sec4',
        title: 'Conformidade Legal (Portaria 671)',
        type: 'legal',
        pageBreak: true,
        elements: [
            { id: 'e6', type: 'paragraph', value: 'O PontoFlow atende plenamente os requisitos técnicos do Ministério do Trabalho e Previdência:' },
            { id: 'e7', type: 'list', items: ['Inalterabilidade: Os dados das batidas originais são preservados integralmente.', 'Registro de GPS: Coordenadas registradas em cada batida para auditoria física.', 'Comprovante Digital: Acesso imediato do colaborador aos registros efetuados.'] }
        ]
    }
];

export const gerarManualHtml = (data) => {
    // Garantir que data seja um array (back compat)
    const sections = Array.isArray(data) ? data : INITIAL_MANUAL_DATA;

    const renderElements = (elements) => {
        return elements.map(el => {
            if (el.type === 'paragraph') {
                const style = `font-weight: ${el.style?.weight || '400'}; font-size: ${el.style?.size || '16px'}; color: ${el.style?.color || 'var(--text)'};`;
                return `<p style="${style}">${el.value}</p>`;
            }
            if (el.type === 'grid') {
                return `
                    <div class="composition-grid">
                        ${el.items.map(item => `
                            <div class="comp-item">
                                <strong>${item.title}</strong>
                                ${item.description}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            if (el.type === 'steps') {
                return el.items.map(step => `
                    <div class="step">
                        <div class="step-number">${step.number}</div>
                        <strong>${step.title}:</strong> ${step.description}
                    </div>
                `).join('');
            }
            if (el.type === 'cards') {
                return el.items.map(card => `
                    <div class="aba-card">
                        <div class="aba-title">${card.icon} ${card.title}</div>
                        <ul>
                            ${card.items.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                `).join('');
            }
            if (el.type === 'list') {
                return `
                    <ul>
                        ${el.items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                `;
            }
            return '';
        }).join('');
    };

    const sectionsHtml = sections.map(sec => {
        let sectionClass = '';
        if (sec.type === 'blueprint') sectionClass = 'blueprint';
        if (sec.type === 'legal') sectionClass = 'legal-notice';
        if (sec.pageBreak) sectionClass += ' page-break';

        return `
            <section class="${sectionClass}">
                <h2>${sec.title}</h2>
                ${renderElements(sec.elements)}
            </section>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Manual do Administrador - PontoFlow</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #2f81f7;
            --secondary: #f1c40f;
            --text: #1a1a1a;
            --text-dim: #555;
            --surface: #f8f9fa;
            --border: #e1e4e8;
            --danger: #eb4d4b;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', sans-serif; 
            color: var(--text); 
            line-height: 1.6; 
            padding: 40px;
            background: #fff;
        }

        .no-print-warning {
            background: #fff3cd;
            color: #856404;
            padding: 15px;
            margin-bottom: 30px;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
        }

        @media print {
            .no-print { display: none; }
            body { padding: 0; }
            .page-break { page-break-before: always; }
            .no-print-warning { display: none; }
        }

        header { 
            text-align: center; 
            margin-bottom: 60px; 
            padding-bottom: 40px;
            border-bottom: 2px solid var(--primary);
        }
        
        h1 { font-family: 'Outfit', sans-serif; font-size: 38px; color: var(--primary); margin-bottom: 10px; }
        .subtitle { font-size: 18px; color: var(--text-dim); font-weight: 600; }

        section { margin-bottom: 40px; }
        h2 { 
            font-family: 'Outfit', sans-serif; 
            font-size: 26px; 
            margin-bottom: 15px; 
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 8px;
        }
        h2::before {
            content: '';
            width: 4px;
            height: 24px;
            background: var(--primary);
            border-radius: 10px;
        }

        h3 { font-size: 18px; margin: 20px 0 10px; color: var(--primary); font-weight: 700; }

        p { margin-bottom: 12px; }

        .blueprint {
            background: var(--surface);
            padding: 25px;
            border-radius: 12px;
            border-left: 5px solid var(--secondary);
            margin: 25px 0;
        }

        .step { margin-bottom: 20px; position: relative; padding-left: 40px; }
        .step-number {
            position: absolute;
            left: 0; top: 0;
            width: 30px;
            height: 30px;
            background: var(--primary);
            color: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 14px;
        }

        .aba-card {
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            background: #fff;
        }
        .aba-title {
            font-weight: 800;
            color: var(--primary);
            font-size: 16px;
            text-transform: uppercase;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        ul { list-style: none; margin-bottom: 15px; }
        ul li { margin-bottom: 8px; padding-left: 20px; position: relative; }
        ul li::before {
            content: '•';
            position: absolute;
            left: 0;
            color: var(--primary);
            font-weight: bold;
        }

        .composition-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .comp-item {
            background: var(--surface);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--border);
        }
        .comp-item strong { color: var(--primary); display: block; margin-bottom: 5px; }

        footer { 
            margin-top: 60px; 
            text-align: center; 
            font-size: 11px; 
            color: var(--text-dim);
            border-top: 1px solid var(--border);
            padding-top: 20px;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 100px;
            background: var(--primary);
            color: #fff;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 10px;
        }

        .legal-notice {
            background: #fdf2f2;
            border: 1px solid var(--danger);
            padding: 20px;
            border-radius: 8px;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="no-print-warning no-print">
        DICA: Para salvar como PDF, selecione "Salvar como PDF" no destino da sua impressora.
    </div>

    <header>
        <div class="badge">Guia Absoluto de Gestão</div>
        <h1>PontoFlow: Inteligência & Simetria</h1>
        <p class="subtitle">Manual Completo de Operação do Administrador</p>
    </header>

    ${sectionsHtml}

    <footer>
        <p>© 2026 PontoFlow - Gestão Inteligente de Jornada</p>
        <p>Documento gerado para uso administrativo exclusivo em: <span id="data-geracao"></span></p>
    </footer>

    <script>
        document.getElementById('data-geracao').textContent = new Date().toLocaleDateString('pt-BR');
        window.onload = function() {
            setTimeout(() => {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>
`;
};
