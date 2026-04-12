# 🎨 UX Plan — De Dashboard para Ferramenta de Estudo Bíblico
## Bible Data Pipeline — Sprint de UX/Polish

> **Contexto:** O backend está sólido (62K+ versos, 10 traduções, 344K cross-refs,
> NLP sentiment, Gemini AI). O frontend tem 4 páginas funcionais. Agora precisamos
> transformar isso de "dashboard de dados" em "ferramenta que as pessoas querem usar
> pra estudar a Bíblia."

---

## 🔍 Diagnóstico do Estado Atual

### O que funciona ✅
- Home com KPIs e tabela de traduções
- Reader com modo Single e Parallel (NVI vs KJV)
- Arc Diagram com 344K cross-refs e filtros
- Search com highlight de keywords e sentimento

### O que falta ❌
1. **Cross-refs não são clicáveis** — o arc diagram é visual mas não leva a nada
2. **Reader sem a estética medieval** — o protótipo 3D com page-flip não foi integrado
3. **Sem navegação contextual** — clicar num verso não abre nada (explicação AI, cross-refs)
4. **Sem persistência** — sem bookmarks, sem histórico, sem "onde parei"
5. **Home é informativa mas não funcional** — não convida a explorar
6. **Search results são dead-ends** — clicar num resultado deveria abrir o Reader naquele verso
7. **Falta responsividade** — layout fixo, não funciona bem em mobile
8. **Falta onboarding** — usuário novo não sabe por onde começar

---

## 🏗️ Plano de Implementação (4 Fases)

### FASE 1: Navegação Conectada (Prioridade Máxima)
> "Tudo conecta com tudo. Cada elemento é um portal."

#### 1.1 — Cross-refs clicáveis no Arc Diagram
```
Comportamento atual: Hover mostra tooltip "GEN → JHN: 5 refs"
Comportamento novo:
- Click no arco → abre painel lateral com lista de cross-refs detalhadas
- Cada cross-ref na lista é um link → abre Reader naquele verso
- Click no livro (barra inferior) → filtra arcos + mostra lista de cross-refs do livro
```

**Componente:** `ArcDetailPanel.tsx`
```typescript
interface ArcDetailPanelProps {
  sourceBook: string;
  targetBook: string;
  crossRefs: Array<{
    source_verse_id: string;   // "GEN.1.1"
    target_verse_id: string;   // "JHN.1.1"
    source_text: string;       // Preview do verso
    target_text: string;
    votes: number;
  }>;
  onNavigate: (verseId: string) => void; // → Router push para /reader
}
```

**API endpoint necessário:**
```
GET /api/v1/crossrefs/between?source_book=GEN&target_book=JHN&limit=50
→ Retorna lista de cross-refs detalhadas entre dois livros
```

#### 1.2 — Search results navegáveis
```
Comportamento atual: Results mostram verso + sentiment badge
Comportamento novo:
- Click no card do resultado → navega para /reader?book=MAT&chapter=1&verse=16&translation=kjv
- Reader abre no capítulo certo e faz scroll até o verso clicado
- Verso clicado fica highlighted por 3 segundos (pulse animation)
```

**Mudanças:**
- `SearchPage.tsx`: Adicionar `onClick` → `navigate(`/reader?book=${bookId}&chapter=${ch}&verse=${v}&translation=${tr}`)`
- `BibleReader.tsx`: Ler query params, fazer scroll automático para o verso com `useRef` + `scrollIntoView()`
- `ReaderPage.tsx`: Parse query params com `useSearchParams()`

#### 1.3 — Verso clicável no Reader
```
Comportamento atual: Versos são texto estático
Comportamento novo:
- Click no número do verso → abre VerseActionBar inline (abaixo do verso)
  - 🔗 Cross-references (X refs) → expande lista de cross-refs
  - 🤖 AI Explain → chama Gemini, mostra explicação
  - 🔖 Bookmark → salva em localStorage
  - 📋 Copy → copia verso para clipboard
  - 🔀 Compare → mostra mesmo verso em outras traduções (mini parallel)
- Click em cross-ref na lista → navega para esse verso no Reader
```

**Componente:** `VerseActions.tsx`
```typescript
interface VerseActionsProps {
  verseId: string;         // "GEN.1.1"
  text: string;
  translation: string;
  onNavigate: (verseId: string) => void;
}
// Estado: collapsed | cross-refs | ai-explain | compare
```

**API endpoints necessários:**
```
GET /api/v1/crossrefs/GEN.1.1       → cross-refs desse verso
POST /api/v1/ai/explain              → explicação Gemini (já existe)
GET /api/v1/verses/GEN.1.1?translations=kjv,nvi,rvr → mesmo verso em múltiplas traduções
```

---

### FASE 2: Estética e Imersão
> "Parecer uma Bíblia, não um dashboard."

#### 2.1 — Integrar o tema medieval no Reader
O protótipo `BibleReader.jsx` que fizemos tem:
- Fundo escuro com glow ambient
- Páginas com textura de pergaminho
- Bordas ornamentais SVG nos cantos
- Drop caps na primeira letra
- Tipografia Playfair Display + Cormorant Garamond
- Numeração dourada

**Não é pra substituir o Reader atual, mas adicionar um modo "Immersive":**
```
ReaderPage.tsx:
  [Single] [Parallel] [Immersive]  ← novo toggle

  Immersive mode:
  - Fundo escuro (var(--bg-void): #0d0a07)
  - Texto em Cormorant Garamond com cor parchment
  - Drop cap na primeira letra do capítulo
  - Ornate corners SVG
  - Navegação: click nas "páginas" ou setas
  - Paginação: ~15 versos por "página" (não scroll infinito)
  - Ambient glow sutil
```

**Componentes a criar:**
```
frontend/src/components/ImmersiveReader/
├── ImmersiveReader.tsx     # Container com fundo escuro
├── BookPage.tsx            # Uma "página" do livro (15 versos)
├── OrnateCorner.tsx        # SVG ornamental (reutilizar do protótipo)
├── DropCap.tsx             # Letra capitular
└── PageNavigation.tsx      # Arrows + keyboard + swipe
```

**CSS vars a adicionar (medieval-theme):**
```css
:root {
  --font-display: 'Playfair Display', serif;
  --font-body: 'Cormorant Garamond', serif;
  --color-parchment: #F5F0E8;
  --color-ink: #2C1810;
  --color-gold: #C4A265;
  --color-gold-dark: #8B7355;
  --bg-void: #0d0a07;
  --bg-ambient: #1a1410;
}
```

#### 2.2 — Micro-interações
```
- Hover em verso → sutil highlight com borda dourada esquerda (2px solid var(--color-gold))
- Click em verso → expand suave (height transition 200ms)
- Troca de capítulo → fade transition (opacity 0→1, 300ms)
- Bookmark toggle → coração/estrela com scale animation
- Search result hover → card lift (translateY -2px, shadow)
- Arc diagram hover em livro → outros livros fade com transition 200ms
```

#### 2.3 — Typography upgrade
```
Google Fonts a importar:
- Playfair Display (display, títulos)
- Cormorant Garamond (body, versos)
- EB Garamond (alternativa para versos)

Aplicação:
- Títulos de páginas: Playfair Display 600
- Texto dos versos: Cormorant Garamond 400, 16px, line-height 1.75
- Números dos versos: Cormorant Garamond 600, gold
- UI elements (botões, selects): manter sans-serif atual
- Immersive mode: tudo em serif
```

---

### FASE 3: Features de Estudo
> "Transformar leitura passiva em estudo ativo."

#### 3.1 — Painel de AI Insights (Gemini)
```
Quando o usuário clica "🤖 AI Explain" em um verso:
- Expande um painel elegante abaixo do verso
- Mostra: Explicação · Contexto Histórico · Palavras-chave · Aplicação
- Loading state: skeleton com shimmer animation
- Cache: se já explicou esse verso antes, mostra do cache instantaneamente
- Botão "Explain in Portuguese" / "Explain in English"
```

**Componente:** `AIExplanationPanel.tsx`
```typescript
interface AIExplanation {
  explanation: string;
  context: string;
  key_words: Array<{ word: string; meaning: string; original: string }>;
  application: string;
}

// States: idle | loading | loaded | error
```

#### 3.2 — Bookmarks e Histórico (localStorage)
```
- Bookmark um verso → salva em localStorage como array de verse_ids
- Página /bookmarks → lista de versos salvos com preview do texto
- "Continue Reading" na Home → último livro/capítulo/verso visitado
- Reading history: últimos 20 capítulos visitados
```

**Hook:** `useBookmarks.ts`
```typescript
function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const toggle = (verseId: string) => { ... };
  const isBookmarked = (verseId: string) => boolean;
  return { bookmarks, toggle, isBookmarked };
}
```

**Hook:** `useReadingHistory.ts`
```typescript
function useReadingHistory() {
  const [history, setHistory] = useState<ReadingEntry[]>([]);
  const record = (book: string, chapter: number, translation: string) => { ... };
  const getLastRead = () => ReadingEntry | null;
  return { history, record, getLastRead };
}
```

#### 3.3 — Mini cross-ref preview
```
No Reader, ao lado do número do verso, mostrar um indicador discreto:
- Se o verso tem cross-refs: pequeno ícone 🔗 com count
- Hover no ícone → tooltip com top 3 cross-refs
- Click → expande lista completa com links navegáveis
```

---

### FASE 4: Home Redesign + Onboarding
> "A Home deve ser um convite, não um relatório."

#### 4.1 — Hero section
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│          🕊️                                                     │
│          THE BIBLE                                              │
│          Data Pipeline                                          │
│                                                                 │
│          "In the beginning was the Word"  — John 1:1            │
│                                                                 │
│          [Start Reading]    [Explore Cross-References]           │
│                                                                 │
│    62,206 verses · 10 translations · 344,754 cross-references   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.2 — Quick actions
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 📖 Continue  │ │ 🔍 Search    │ │ 🔗 Cross-Refs│ │ 🎲 Random    │
│  Reading     │ │              │ │  Arc Diagram │ │  Verse       │
│              │ │              │ │              │ │              │
│ Genesis 2    │ │ Find any     │ │ 344K refs    │ │ Discover     │
│ (last read)  │ │ verse        │ │ visualized   │ │ something    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

#### 4.3 — "Verse of the day" (random)
```
API: GET /api/v1/verses/random?translation=kjv
- Mostra um verso aleatório bonito na Home
- Click → abre no Reader
- Refresh button → novo verso
```

#### 4.4 — Translation comparison preview
```
Na Home, mostrar um verso famoso em múltiplas traduções:
"For God so loved the world..." (John 3:16)
  KJV: "For God so loved the world..."
  NVI: "Porque Deus tanto amou o mundo..."
  RVR: "Porque de tal manera amó Dios al mundo..."
[Compare all translations →]
```

---

## 📐 Wireframes de Interação

### Verso com ações expandidas (Reader)
```
  ┌─────────────────────────────────────────────────────────────┐
  │ 3  And God said, Let there be light: and there was light.   │
  └─────────────────────────────────────────────────────────────┘
       ↓ click no "3"
  ┌─────────────────────────────────────────────────────────────┐
  │ 3  And God said, Let there be light: and there was light.   │
  │                                                             │
  │  ┌──────┐ ┌──────────┐ ┌────────┐ ┌──────┐ ┌───────┐     │
  │  │🔗 12 │ │🤖 Explain│ │🔖 Save │ │📋 Copy│ │🔀 Comp│     │
  │  └──────┘ └──────────┘ └────────┘ └──────┘ └───────┘     │
  │                                                             │
  │  ┌─ Cross-references (12) ──────────────────────────────┐  │
  │  │ • Isaiah 45:7 — I form the light, and create dark... │  │
  │  │ • 2 Cor 4:6 — For God, who commanded the light...    │  │
  │  │ • John 1:5 — And the light shineth in darkness...    │  │
  │  │ [Show all 12 →]                                       │  │
  │  └──────────────────────────────────────────────────────┘  │
  └─────────────────────────────────────────────────────────────┘
```

### Arc Diagram com painel lateral
```
  ┌──────────────────────────────────────────┐┌──────────────────┐
  │                                          ││ GEN → PSA        │
  │        Arc Diagram SVG                   ││ 47 connections   │
  │     (arcos + livros + filtros)           ││                  │
  │                                          ││ • Gen 1:1 → Ps.. │
  │     [click em arco GEN→PSA]              ││ • Gen 1:26 → Ps..│
  │            ↓                             ││ • Gen 2:7 → Ps.. │
  │     highlight do arco                    ││ • Gen 3:15 → Ps..│
  │                                          ││                  │
  │                                          ││ [Open in Reader] │
  └──────────────────────────────────────────┘└──────────────────┘
```

---

## 🎯 Prioridade de Execução

| Ordem | Task | Impacto UX | Complexidade |
|-------|------|-----------|-------------|
| 1 | Search results → navegam pro Reader | 🔥🔥🔥 | Baixa |
| 2 | Click em verso → VerseActions bar | 🔥🔥🔥 | Média |
| 3 | Cross-refs clicáveis (verso) | 🔥🔥🔥 | Média |
| 4 | Arc diagram → painel lateral | 🔥🔥🔥 | Média-Alta |
| 5 | Bookmarks + Continue Reading | 🔥🔥 | Baixa |
| 6 | Typography upgrade (Google Fonts) | 🔥🔥 | Baixa |
| 7 | Immersive Reader mode | 🔥🔥🔥 | Alta |
| 8 | AI Explanation panel | 🔥🔥 | Média |
| 9 | Home redesign (hero + quick actions) | 🔥🔥 | Média |
| 10 | Micro-interações e polish | 🔥 | Baixa |

---

## 📋 Tarefas para o Claude Code

### Ultraplan prompt sugerido:
```
/ultraplan Implement UX improvements from UX_PLAN.md.
Start with Phase 1 (Connected Navigation):
1. Search results click → navigate to Reader at that verse
2. VerseActions component (click verse number → action bar)
3. Cross-refs list per verse (clickable, navigates to Reader)
4. Arc diagram click → side panel with detailed cross-refs

Then Phase 2 (Aesthetics):
5. Import Google Fonts (Playfair Display + Cormorant Garamond)
6. Apply serif typography to Reader verses
7. Add hover/click micro-interactions

See UX_PLAN.md for full wireframes and component specs.
```

---

## 🔗 API Endpoints Necessários (novos)

```yaml
# Cross-refs entre dois livros (para Arc Diagram panel)
GET /api/v1/crossrefs/between
    ?source_book=GEN&target_book=PSA&limit=50
    → { crossrefs: [{ source_verse_id, target_verse_id, source_text, target_text, votes }] }

# Cross-refs de um verso específico (para VerseActions)
GET /api/v1/crossrefs/{verse_id}
    → { verse_id, total: 12, crossrefs: [{ target_verse_id, target_text, target_book_name }] }

# Verso em múltiplas traduções (para Compare)
GET /api/v1/verses/{verse_id}/translations
    ?translations=kjv,nvi,rvr
    → { verse_id, translations: { kjv: "...", nvi: "...", rvr: "..." } }

# Verso aleatório (para Home)
GET /api/v1/verses/random
    ?translation=kjv
    → { verse_id, reference, text, book_name, chapter, verse }
```

---

*"O dado sem interface é conhecimento preso. A interface sem dado é beleza vazia.*
*Juntos, são uma ferramenta que transforma como as pessoas se conectam com o texto."*
