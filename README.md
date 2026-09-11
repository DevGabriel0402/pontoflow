# PontoFlow

Sistema de ponto eletrônico para uma instituição, com React, Vercel e Firebase no plano gratuito Spark.

## Arquitetura

- A aplicação React e as APIs ficam hospedadas na Vercel.
- Firebase Authentication mantém o cadastro e o login dos usuários.
- Firestore mantém pontos, jornadas, justificativas, banco de horas e configurações.
- O modo offline e as atualizações em tempo real continuam sendo feitos pelo SDK do Firebase no navegador.
- Operações privilegiadas usam as rotas em `api/` com Firebase Admin, sem Cloud Functions.
- A Vercel executa uma rotina diária para avisos de pontos ausentes.
- Avisos de atraso são verificados enquanto o colaborador estiver com o sistema aberto.

## Desenvolvimento local

Requisitos: Node.js 20 ou superior e um projeto Firebase.

```bash
npm install
```

Copie `.env.example` para `.env` e preencha as variáveis. Depois execute:

```bash
npm run dev
```

O comando acima inicia somente o frontend. Para testar também as rotas de `api/`, use a CLI da Vercel:

```bash
npx vercel dev
```

## Configuração na Vercel

Conecte o repositório à Vercel e cadastre todas as variáveis de `.env.example` em **Settings > Environment Variables**.

As variáveis `VITE_*` são públicas e vêm das configurações do aplicativo web no Firebase. Para as variáveis privadas:

1. No Firebase/Google Cloud, crie uma conta de serviço com acesso ao Firebase Authentication e Firestore.
2. Informe `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` na Vercel. A chave privada deve permanecer somente na Vercel.
3. Gere uma sequência longa e aleatória para `CRON_SECRET`.
4. Faça um novo deploy depois de salvar as variáveis.

Também é possível fornecer a credencial inteira em `FIREBASE_SERVICE_ACCOUNT_JSON` no lugar das três variáveis separadas.

## Firebase gratuito

No Firebase, habilite:

- Authentication com Email/Senha;
- Firestore;
- os domínios usados pela Vercel em **Authentication > Settings > Authorized domains**.

Publique apenas regras e índices. O `firebase.json` não contém mais Cloud Functions:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Backup

O administrador encontra **Backup dos Dados** na tela de configurações. O download gera um arquivo JSON da instituição. A restauração aceita apenas um backup da mesma instituição, mescla os registros e não apaga dados atuais.

Guarde esse arquivo fora da Vercel e do Firebase. No plano gratuito, o download manual é a forma mais simples de manter uma cópia independente.

## Deploy

O `vercel.json` já contém a configuração da aplicação, das APIs e da rotina diária. O deploy pode ser feito automaticamente pelo GitHub ou manualmente:

```bash
npx vercel --prod
```
