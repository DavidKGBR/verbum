# 🚀 VERBUM v1 — Plano de Lançamento

> **Status:** Construção essencialmente completa (35/38 tarefas do `VERBUM_PLAN.md`).
> **Falta:** sair do localhost para o mundo — **mas só depois da REVISION atingir 100% de cobertura** (ver `VERBUM_REVISION_PLAN.md` + `feedback_complete_coverage.md`).
> **Janela:** Janela pré-launch ampliada em 15 abr 2026 após decisão de **cobertura 100%** (sem top-N em R3, R3.6, R7). Janela revisada: ~13-15 meses de labeling + sessões base. Custo $0 (Claude MAX). Qualidade > pressa.
> **Stack de deploy:** Firebase Hosting (frontend) + Cloud Run (backend) + BigQuery (dataset público).
> **URL inicial:** `https://verbum-app-bible.web.app` (subdomínio default — o Firebase atribui sempre `<projectId>.web.app`). Na sessão #6, tentar reservar `verbum.web.app` como custom Firebase subdomain — se disponível, vira a URL pública principal e o `verbum-app-bible.web.app` continua redirecionando.
> **Analytics:** GA4 via Firebase — gratuito, ilimitado, integração nativa.
>
> **Progresso pré-launch até 15 abr 2026:**
> - ✅ **Sessão 1** — Áudio hebraico Chirp3-HD (8674 MP3, 0 falhas; 100% Strong's HE — precedente pra cobertura 100%)
> - Em paralelo: `VERBUM_REVISION_PLAN.md` → R1 ✅, R2 ✅, R3.a ✅ (primeira passagem), R3.b-e em fila (~9.300 entradas de lookup restantes)

---

## Definição operacional de "v1 lançada"

Os três critérios — todos juntos:

1. **Acessível:** Verbum em URL pública e estável, com HTTPS, sem login.
2. **Apresentável:** README de produto, OG image, screenshots, footer com créditos. Quem chega pela primeira vez entende em 30 segundos.
3. **Visto:** ≥ 100 visitantes únicos vindos de pelo menos 3 canais diferentes (HN + Reddit + um terceiro). Não vale tráfego direto vindo de você mesmo.

Quando os três estiverem checados, a v1 está lançada e a próxima conversa passa a ser sobre v1.5/v2.

---

## O que NÃO entra na v1 (backlog explícito)

Para evitar escopo elástico — qualquer item abaixo é tentação, e a regra é simples: **não entra**.

| Item | Por quê fica fora |
|---|---|
| **PWA + DuckDB-WASM + OPFS** (Frente 1 do Sonnet) | Refactor arquitetural de 4-6 semanas. v2. |
| **Busca semântica VSS/HNSW** (Frente 2) | Pipeline de embeddings + endpoint novo. v2. |
| **Sync CRDT/WebRTC** (Frente 3) | Solução para problema que ninguém ainda relatou. v2. |
| **Spaced Repetition (SM-2)** (Frente 4) | Feature nova. v2. |
| **RAG teológico grounded** (Frente 5) | Substitui `/ai/explain` atual; este já funciona. v2. |
| ~~**Áudio Chirp3-HD para 100% das 14.178 entradas Strong's**~~ | ✅ **Entregue na Sessão 1 (15 abr 2026).** 8674 HE + 5504 GR = 14178 MP3 local. Publicação via GCS/CDN → backlog v1.5 (hoje servidos do disco de build pra simplicidade). |
| **Camada acadêmica de áudio (Foreman/Kantor)** | Já marcado como backlog no plano original. Não entra. |
| **Cursos guiados (Frente 6 que sugeri no opus)** | Conceito interessante, sem dados estruturados ainda. v2.5. |
| **Mobile native app (React Native/Capacitor)** | Web responsive cobre mobile no v1. |
| **Multi-tenant / contas / login** | Anti-missão. Nunca. |

Esse parágrafo existe pra ser citado quando bater a tentação. Se algo desta lista for entrar, vira uma decisão consciente — não acidente.

---

## Sequência de sessões

Cada sessão tem **um objetivo, uma entrega, e um critério de done**. Encerra quando o critério é atendido. Não tenta puxar a próxima na mesma sessão.

### Sessão 1 — Fechar áudio hebraico

> Status: ✅ **Concluído** (15 abril 2026)

**Entrega:** TTS Chirp3-HD para todas as palavras hebraicas top N (paridade com cobertura grega).

**Resultado:**
- `data/audio/hebrew/` — **8674 arquivos MP3** (100% das entradas Strong's HE)
  - 8674 gerados · 0 pulados · 0 falhas · 0 GCS (local-only por ora)
- `data/audio/greek/` — 5504 arquivos (baseline GR já tinha paridade desde Fase 5)
- Cobertura HE 100% atingiu e superou o critério "≈ GR"; mais 3170 arquivos que o léxico grego, refletindo que o TAHOT HE tem mais entradas que o TAGNT GR
- Botão de áudio funcional no Reader interlinear confirmado em palavras HE testadas (Gen 1:1, Deut 6:4)

**Próxima:** Sessão 2 (README de produto + assets de marca) começa após fechamento do `VERBUM_REVISION_PLAN.md`.

---

### Sessão 2 — README de produto + assets de marca

**Entrega:** Repo apresentável para qualquer visitante (não só dev).

**Tarefas:**
- Reescrever README com: hero (logo + tagline + 1 GIF), "What you get" (tabela), "Try it" (link pro deploy quando subir), Quick Start (a parte atual), Architecture, Credits, License
- Tagline final (sugestão): *"Open-source Bible study with the depth of Logos. Free. In your browser."*
- Substituir tagline atual ("YouVersion para quem quer estudar de verdade") pela equivalente PT na seção PT do README
- 5-7 screenshots novos: Home, Reader (single + interlinear), Word Study, Semantic Graph, Map, Special Passage Pai Nosso, Genealogy
- 1 GIF curto (~3-5s) de transição entre 3 features visuais
- OG image 1200x630 com logo + tagline
- Favicons multi-tamanho (16, 32, 180, 192, 512) — usar Real Favicon Generator
- Atualizar `<meta>` tags em `frontend/index.html` (description, og:title, og:image, twitter:card)

**Critério de done:**
- Abrir README no GitHub e o produto fica óbvio em 10 segundos
- Compartilhar URL do repo em qualquer rede social mostra OG image bonita
- Favicons aparecem em todos os tamanhos esperados

---

### Sessão 3 — GCP backend (Cloud Run + Secret Manager)

**Entrega:** Backend FastAPI rodando em URL Cloud Run pública.

**Tarefas:**
- `Dockerfile` para o backend (multi-stage: Python 3.12-slim, deps via `pip install -e .`, copy do `data/analytics/bible_v2.duckdb`)
- Decisão sobre DuckDB: incluir o `.duckdb` (260 MB) na imagem é viável (Cloud Run permite imagens grandes), e elimina necessidade de volume. Custo: build mais lento, deploy mais lento. **Escolha recomendada para v1: DuckDB embarcado na imagem.** Migração pra GCS+download-on-startup vira tarefa de v1.5 se ficar lento.
- Secret Manager: criar `GEMINI_API_KEY`, `ABIBLIA_DIGITAL_TOKEN`
- Service account `verbum-api-runtime` com `roles/secretmanager.secretAccessor`
- Cloud Run service `verbum-api` em região `us-central1` (mais barata, latência aceitável pra LATAM)
- `--allow-unauthenticated` (API é pública)
- `--memory 1Gi --cpu 1` (ajustar depois com base em métricas)
- Testar `/health` e `/api/v1/books` na URL Cloud Run
- Terraform inicial em `infra/terraform/` (state em bucket GCS) — ou shell scripts em `infra/scripts/` se Terraform parecer overhead pra v1. **Recomendo scripts shell agora, Terraform na v1.5** quando houver mais de um service.

**Critério de done:**
- `curl https://verbum-api-xxxxx-uc.a.run.app/health` retorna 200
- `curl https://verbum-api-xxxxx-uc.a.run.app/api/v1/books?translation_id=kjv` retorna lista de 66 livros
- Logs do Cloud Run mostram requests sem erros

---

### Sessão 4 — Fase 8: GCS + BigQuery Public Dataset

**Entrega:** Tarefa #19 do `VERBUM_PLAN.md`. Dataset público no BigQuery + Parquet exports no GCS.

**Tarefas:**
- Bucket GCS `verbum-public-data` (region `US`, multi-region)
- Export do DuckDB para Parquet particionado por `translation_id` quando aplicável:
  - `verses.parquet`
  - `cross_references.parquet`
  - `strongs_lexicon.parquet`
  - `original_texts.parquet`
  - `interlinear.parquet`
  - `topics.parquet`, `people.parquet`, `places.parquet`
- Subir Parquet → GCS via `gsutil cp`
- BigQuery dataset `verbum_public` (location `US`)
- Para cada Parquet: criar external table apontando pro GCS
- IAM: `allUsers` com role `roles/bigquery.dataViewer` no dataset
- README do dataset em `data/PUBLIC_DATASET.md` com schema + atribuições + license
- Validar com `bq query "SELECT count(*) FROM verbum_public.verses"`

**Critério de done:**
- Qualquer um (sem precisar de conta paga) consegue rodar `SELECT * FROM verbum_public.verses LIMIT 10` no BigQuery
- README do dataset descreve cada tabela
- Script `scripts/sync_to_gcs.py` reproduzível para próximas atualizações

---

### Sessão 5 — HuggingFace bonus datasets

**Entrega:** Os 3 datasets curatoriais únicos do Verbum, indexados no HuggingFace Hub.

**Tarefas:**
- Criar org `verbum-bible` no HuggingFace
- Dataset `verbum-bible/semantic-genealogy`:
  - Source: `data/static/semantic_genealogy.json`
  - README com 10 conceitos descritos, licença CC BY-SA 4.0, citação BibTeX
- Dataset `verbum-bible/chiasm-annotations`:
  - Source: export do DuckDB de `chiasm_structures` ou similar
  - README com método de derivação (Macula-Hebrew CC BY 4.0)
- Dataset `verbum-bible/special-passages-multilang`:
  - Source: 10 passagens com camadas Aramaico/Hebraico/Grego/PT/EN + áudio URLs
  - README com escopo + atribuição de fontes de áudio
- Cada dataset usa schema HuggingFace (`dataset_info.json`)

**Critério de done:**
- Os 3 datasets aparecem em `huggingface.co/verbum-bible`
- README de cada um carrega corretamente
- Pelo menos um teste manual: `from datasets import load_dataset; load_dataset("verbum-bible/semantic-genealogy")`

---

### Sessão 6 — Firebase Hosting + Analytics

**Entrega:** Frontend deployado em `verbum-app-bible.web.app` (default) e idealmente também em `verbum.web.app` (custom Firebase subdomain), integrado com backend Cloud Run via rewrites, GA4 ativo.

**Nota sobre URLs:** o Firebase atribui automaticamente `<projectId>.web.app` e `<projectId>.firebaseapp.com`. Para usar `verbum.web.app` (mais curto), é preciso adicionar como **custom Firebase subdomain** no console (Hosting → Add custom domain → digitar `verbum.web.app`). Se estiver disponível (provavelmente está, pois subdomínios `.web.app` não são reservados como `.com` populares), o Firebase faz o setup automático sem precisar de DNS externo. Se já estiver tomado por outro projeto, fica em `verbum-app-bible.web.app` mesmo até a sessão #10 (custom domain pago).

**Tarefas:**
- `npm install -g firebase-tools` + `firebase login`
- `firebase init hosting` no repo (selecionar projeto `verbum-app-bible`, public dir `frontend/dist`, configurar como SPA: sim)
- `firebase.json` com rewrites:
  ```json
  {
    "hosting": {
      "public": "frontend/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        { "source": "/api/**", "run": { "serviceId": "verbum-api", "region": "us-central1" } },
        { "source": "/audio/**", "run": { "serviceId": "verbum-api", "region": "us-central1" } },
        { "source": "**", "destination": "/index.html" }
      ],
      "headers": [
        { "source": "**/*.@(js|css|woff2|jpg|png|svg)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
      ]
    }
  }
  ```
- Habilitar Firebase Analytics no console → copiar `measurementId`
- Adicionar GA4 ao `frontend/index.html` (carregamento condicional após consent)
- `npm run build && firebase deploy --only hosting`
- Testar preview channel antes: `firebase hosting:channel:deploy preview`

**Critério de done:**
- `https://verbum-app-bible.web.app` carrega Home corretamente
- Se `verbum.web.app` foi reservado: também carrega
- `/api/v1/books` (do mesmo domínio) responde via rewrite Cloud Run, sem CORS
- GA4 Realtime no Firebase Console mostra sua visita
- Lighthouse score ≥ 90 em Performance no mobile

---

### Sessão 7 — Polish pré-launch

**Entrega:** Produto não quebra na primeira interação real.

**Tarefas:**
- Error Boundary React global em `frontend/src/main.tsx` com fallback "Algo deu errado · Recarregar"
- Loading states: revisar páginas que ainda mostram tela em branco antes do fetch (especialmente Map, Timeline, SemanticGraph)
- Footer com créditos completos: STEPBible (CC BY 4.0), OpenBible.info (CC BY 4.0), Theographic (CC BY-SA 4.0), openscriptures/strongs, SBLGNT (Logos), Easton's PD, Smith's PD, Nave's PD, Macula-Hebrew (CC BY 4.0), Chirp3-HD (Google Cloud TTS) + link MIT license
- Privacy policy em `/privacy` (página estática) — template adaptado, LGPD-compliant, mencionar GA4 + Sentry + cookies
- Cookie banner LGPD: Vanilla JS leve, opt-in para analytics, opt-in para Gemini AI features
- 404 page customizada (`/404` em React Router) com sugestão "Try the Reader" + link Home
- Footer link "Report a bug" → GitHub Issues template ou form Tally
- Smoke test E2E manual em **mobile real** (não DevTools): abrir 5 páginas core, criar uma nota, mudar idioma

**Critério de done:**
- Forçar erro em uma página (e.g. desligar backend) → Error Boundary aparece, não tela branca
- Lighthouse Accessibility ≥ 90 nas páginas principais
- Privacy policy + cookie banner aprovados visualmente (não bug, não invasivos)
- 404 customizada existe e tem afordância

---

### Sessão 8 — Observabilidade

**Entrega:** Sinal pós-launch para você ver o que acontece em produção.

**Tarefas:**
- Sentry free tier: criar projeto, integrar `@sentry/react` no frontend e `sentry-sdk[fastapi]` no backend
- Configurar PII redaction (não logar email, IP, nada de usuário)
- Healthcheck `/health` no FastAPI já existe — confirmar que retorna `{status: ok, db_verses_count: N, version: "v1.0.0"}`
- Cloud Run uptime check (gratuito até 3 endpoints)
- Email notification configurado: Sentry → email quando >10 errors em 1 hora
- GA4 conversões customizadas: "viewed_3_pages", "returned_in_7_days" (aproximação manual, GA4 free)

**Critério de done:**
- Forçar um erro no frontend → Sentry recebe e te notifica em <5min
- Cloud Run uptime check rodando em /health
- Sua sessão de smoke test aparece no GA4 Realtime e no Sentry sem erros

---

### Sessão 9 — CI/CD GitHub Actions

**Entrega:** Push em main = deploy automático.

**Tarefas:**
- `.github/workflows/ci.yml`: lint (`ruff`), typecheck (`mypy` + `tsc`), tests (`pytest -m "not slow and not integration"`)
- `.github/workflows/deploy.yml`: rodar em push para `main`:
  - Build frontend: `cd frontend && npm ci && npm run build`
  - Deploy frontend: `firebase deploy --only hosting --token $FIREBASE_TOKEN`
  - Build & push Docker image: `gcloud builds submit --tag gcr.io/verbum-app-bible/verbum-api`
  - Deploy backend: `gcloud run deploy verbum-api --image ...`
- Auth: Workload Identity Federation (sem JSON key no repo)
- Badges no README: CI passing, deploy status

**Critério de done:**
- Commit dummy em main → CI roda → se passa, deploy roda → produção atualiza
- Logs do Action mostram cada step
- Falhar test propositalmente bloqueia o deploy

---

### Sessão 10 — (Opcional) Custom domain

**Entrega:** `verbum.app` (ou fallback) apontando pro Firebase Hosting.

**Tarefas:**
- Verificar disponibilidade em Namecheap / Cloudflare Registrar:
  - 1ª escolha: `verbum.app`
  - 2ª: `verbum.bible`
  - 3ª: `verbum.dev` ou `getverbum.com`
- Registrar (~$15/yr)
- Firebase Console → Hosting → Add custom domain → seguir DNS instructions
- Aguardar SSL provision (~24h)
- Atualizar README, OG image, posts de launch para usar URL final
- Subdomínio `.web.app` continua funcionando como redirect

**Critério de done:**
- `https://verbum.app` carrega o produto com cadeado verde
- Redirects de `www` e `.web.app` funcionam
- GA4 não duplica events nas duas URLs (configurar referrer exclusion)

---

### Sessão 11 — Launch week

**Entrega:** O Verbum existe no mundo, com primeiros 100+ visitantes únicos reais.

**Coordenação por dia:**

| Dia | Canal | Ângulo do post |
|---|---|---|
| Segunda | r/Bible (380K) | "Built a free open-source Bible study tool with interlinear Greek/Hebrew, Strong's, cross-refs. No accounts, no ads. Link in comments." |
| Segunda | r/cristianismo PT-BR | Versão em PT enfatizando "primeiro estudo bíblico profundo gratuito em português" |
| Terça | r/BiblicalLanguages (8K) | Foco em Word Study + STEPBible semantic tags + interlinear Hebrew morphology |
| Quarta | r/DataIsBeautiful | Screenshot do Arc Diagram (344K cross-refs em uma tela de canvas) |
| Quinta 8h ET | HackerNews | "Show HN: Verbum — open-source Bible study with interlinear and 344K cross-references" |
| Quinta | FaithTech Slack | Tour curto + link, no canal #show-and-tell |
| Sexta | LinkedIn (David) | Texto longo "Por que construímos isso" + screenshots |
| Sexta | Twitter/X thread | 7 tweets, 1 por feature visual, terminando em URL |
| Sábado | Comunidades de seminário PT-BR (Telegram, Discord) | Mensagem direta, não promo |
| Domingo | Bíblia + IA + open-source: post no dev.to ou Medium em PT e EN | Conteúdo perene |

**Durante a semana:**
- Responder TODOS os comentários nas primeiras 48h por canal
- Triar bugs reportados, criar issues, priorizar fixes para semana seguinte
- Capturar quotes positivos para um TESTIMONIALS.md eventual
- Anotar todas as objections/dúvidas — input pra v1.5

**Critério de done:**
- ≥ 100 visitantes únicos no GA4 vindos de pelo menos 3 canais distintos
- ≥ 1 issue genuíno no GitHub aberto por usuário externo
- Sentry estável (sem error spike crítico não fixado)
- README atualizado com 1 quote positivo se houver

---

## Custos previstos da v1

Por mês, no estado de "lançado mas com tração baixa" (~1.000 visitas/mês):

| Item | Custo |
|---|---|
| Firebase Hosting (Spark plan) | $0 |
| Cloud Run (request-based) | ~$0–5 |
| BigQuery storage (~260 MB) | ~$0.01 |
| BigQuery queries | $0 (sem queries pesadas planejadas) |
| GCS storage (Parquet exports + audio) | ~$2–5 |
| Secret Manager | $0 (até 6 secrets ativos grátis) |
| Cloud Logging | $0 (até 50 GB/mês grátis) |
| Cloud Build (CI) | $0 (120 min/dia grátis) |
| Sentry free tier | $0 |
| GA4 | $0 |
| HuggingFace | $0 |
| Domínio (`verbum.app`) | ~$1.25/mês ($15/yr) |
| **Total estimado** | **~$3–11/mês** |

Custo de uma única sessão Gemini (`/ai/explain`) já está coberto pelo `gemini_client.py` com cache em disco — limite de gasto setado em `.env`.

Se escalar (>50K visitas/mês), o gasto sobe principalmente em Cloud Run + Cloud Egress. Bom problema pra ter.

---

## Pós-launch — métricas a observar nas primeiras 4 semanas

Não vale a pena planejar antes; depende do sinal real. Mas garanta que você consegue ler:

| Métrica | Onde | Significado |
|---|---|---|
| **Visitantes únicos / dia** | GA4 | Tração de cabeça |
| **Páginas por sessão** | GA4 | Engagement profundo |
| **Retorno em 7 dias** | GA4 | Sticky / não foi só curiosidade |
| **Bounce rate por página** | GA4 | Onde o produto perde gente |
| **Top 10 páginas mais vistas** | GA4 | Quais features importam |
| **Erros JS (frontend)** | Sentry | Bugs em produção |
| **Erros 5xx (backend)** | Sentry + Cloud Run logs | API instabilidade |
| **Latência p50/p95 do backend** | Cloud Run metrics | UX percebida |
| **GitHub issues abertas por externos** | GitHub | Comunidade nascendo |
| **GitHub stars** | GitHub | Sinal de validação social |
| **Buscas no GA4 site search** (se ativarmos) | GA4 | Que tipo de versículo as pessoas procuram → input pra Frente 2 (VSS) eventual |

**Cadência de revisão:** abrir essas métricas 1× por semana nos primeiros 2 meses. Anotar em `VERBUM_PLAN.md` Session Log. Decidir trade-offs de v1.5 com base nelas, não em palpite.

---

## v2 — só depois de v1 lançada e estabilizada

Resumo do que recomendo na ordem (justificativa nos relatórios estratégicos no `verbum_strategic_opportunities_*.md`):

1. **Frente 2 — Busca semântica VSS** (resolve a queixa #1 que vai aparecer)
2. **Frente 4 — Spaced Repetition** (quick win, dados já existem)
3. **Frente 5 — RAG teológico grounded** (substitui Gemini puro, melhora qualidade)
4. **Frente 1 — PWA + DuckDB-WASM + OPFS** (refactor arquitetural; só com sinal de uso offline real)
5. **Frente 3 — CRDT/WebRTC sync** (último; depende da Frente 1)
6. **Frente 6 — Educação como feature** (cursos guiados; nova proposta)

Mas tudo isso é v2. **Vire essa página depois do launch.**

---

## Referências cruzadas

- `VERBUM_PLAN.md` — plano mestre completo, status histórico de 38 tarefas
- `verbum_strategic_opportunities_claude_sonnet.md` — análise técnica das 5 frentes v2
- `verbum_strategic_opportunities_gemini.md` — análise estratégica das 5 frentes v2
- `verbum_strategic_opportunities_claude_opus.md` — análise crítica e contraposição (closing v1 first)
- `CLAUDE.md` — instruções de codebase para sessões futuras
- `frontend/src/i18n/STYLE_GUIDE.md` — guia de estilo i18n (632 chaves EN/PT/ES)

---

## Conclusão

A v1 do Verbum não é "vamos construir até estar pronto". A v1 está construída. **A v1 é abrir a porta.**

11 sessões — boa parte delas curtas — separam o estado atual de um produto vivo em URL pública, com analytics, com observabilidade, e com primeiros usuários reais.

Quando os três critérios da definição operacional (acessível, apresentável, visto) estiverem checados, o `VERBUM_V1_LAUNCH_PLAN.md` está cumprido e este arquivo vira histórico — junto do `VERBUM_PLAN.md`.

> *"Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho."* — Salmo 119:105

A lâmpada está acesa. Falta tirar do localhost.

---

*Plano final consolidado · Abril 2026 · Claude Opus 4.6 (Anthropic) + David*
