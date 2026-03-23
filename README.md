# Crypto Real-Time Dashboard

Dashboard em tempo real construído com `Next.js`, `Redux Toolkit` e `shadcn/ui`, consumindo streaming da Binance no cliente e metadados da CoinGecko por meio de uma API Route proxy.

## Visão Geral

O projeto foi estruturado para mostrar domínio de fluxo de dados em tempo real, separação entre dados estáticos e dinâmicos e cuidados com comportamento em ambiente serverless.

Principais capacidades atuais:

- streaming em tempo real via Binance WebSocket com conexão direta no cliente
- normalização de preços no Redux
- throttling por variação mínima de preço + flush em lote
- reconexão automática com backoff exponencial
- rota proxy para metadados da CoinGecko
- dashboard com busca, cards principais, tabela ordenável e feedback visual de preço
- `Error Boundary` com reset controlado da conexão

## Stack

- `Next.js 16`
- `React 19`
- `Redux Toolkit`
- `React Redux`
- `Tailwind CSS v4`
- `shadcn/ui`

## Arquitetura

### Frontend em tempo real

- O WebSocket da Binance é aberto no cliente.
- O middleware Redux intercepta ações de conexão e gerencia:
  - abertura e fechamento do socket
  - parse do payload da Binance
  - conversão de strings numéricas para `number`
  - buffering de atualizações
  - throttling por variação percentual mínima
  - reconexão automática

### Metadados e proxy

- Os metadados das moedas são buscados pela API Route interna.
- Isso evita expor chave de API no cliente e ajuda a controlar cache.

### UI principal

- Header com status da conexão e busca
- Cards dos principais ativos
- Tabela ordenável em tempo real
- Skeleton no carregamento inicial
- Error Boundary com fallback recuperável

## Variáveis de Ambiente

Crie um arquivo `.env.local` com base em [.env.example](./.env.example).

Variáveis disponíveis:

- `COINGECKO_API_KEY`
  - opcional
  - usada na rota proxy para autenticar na CoinGecko Pro API
  - se ausente, a aplicação tenta usar a API pública

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

## Verificações

```bash
npm run typecheck
npm run lint
npm run build
```

## Deploy na Vercel

### 1. Variáveis

Adicione na Vercel, se necessário:

- `COINGECKO_API_KEY`

### 2. Observações importantes

- A conexão é feita diretamente no navegador.
- A rota `/api/proxy/coingecko` roda no ambiente serverless da Vercel.
- O proxy já responde com cache HTTP via `s-maxage` e `stale-while-revalidate`.

### 3. Build

```bash
npm run build
```

## Desafios Técnicos Superados

### 1. Evitar vazamento de conexões WebSocket

O projeto fecha socket e timers ao desmontar a tela e também ao reiniciar a conexão.

### 2. Evitar hidratação incorreta com dados em tempo real

O dashboard em si é client-side e a lógica do socket é protegida contra execução no servidor.

### 3. Reduzir re-renderizações desnecessárias

As mensagens da Binance não são despachadas uma a uma sem critério. O projeto aplica:

- filtro por variação mínima de preço
- buffer temporal
- dispatch em lote

### 4. Separar contrato externo de estado interno

Os payloads da Binance e da CoinGecko foram isolados em camadas de integração, enquanto os slices mantêm o estado normalizado do app.
