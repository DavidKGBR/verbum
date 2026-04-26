import { useI18n } from "../i18n/i18nContext";
import { getConsent, setConsent } from "../lib/consent";
import { useEffect, useState } from "react";
import SEO from "../components/SEO";
import { ROUTE_META } from "../seoMeta";

/**
 * LGPD/GDPR-compliant privacy notice.
 *
 * Content lives inline per language (same pattern as AboutPage) because
 * privacy notices are prose and don't fit the per-key i18n model well.
 */
export default function PrivacyPage() {
  const { locale } = useI18n();
  const [consent, setConsentLocal] = useState(getConsent());

  useEffect(() => {
    const id = setInterval(() => setConsentLocal(getConsent()), 500);
    return () => clearInterval(id);
  }, []);

  function update(value: "granted" | "denied") {
    setConsent(value);
    setConsentLocal(value);
  }

  const content = locale === "pt" ? PT : locale === "es" ? ES : EN;

  return (
    <article className="max-w-3xl mx-auto px-4 py-10 leading-relaxed text-[var(--color-ink)]">
      <SEO {...ROUTE_META["/privacy"]} canonical="/privacy" />
      <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
      <p className="opacity-60 text-sm mb-8">{content.lastUpdated}</p>

      {content.sections.map((s) => (
        <section key={s.heading} className="mb-8">
          <h2 className="text-xl font-bold text-[var(--color-gold)] mb-2">{s.heading}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="mb-3">{p}</p>
          ))}
        </section>
      ))}

      <section className="mt-12 p-5 rounded border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5">
        <h2 className="text-xl font-bold mb-3">{content.controls.heading}</h2>
        <p className="mb-4 text-sm">{content.controls.body}</p>
        <p className="text-sm mb-3">
          <strong>{content.controls.statusLabel}:</strong>{" "}
          <span className={consent === "granted" ? "text-green-700" : consent === "denied" ? "text-red-700" : "opacity-60"}>
            {consent === "granted"
              ? content.controls.statusGranted
              : consent === "denied"
              ? content.controls.statusDenied
              : content.controls.statusPending}
          </span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => update("denied")}
            className="text-xs px-3 py-2 rounded border border-[var(--color-ink)]/20
                       hover:bg-[var(--color-ink)]/5 transition"
          >
            {content.controls.deny}
          </button>
          <button
            type="button"
            onClick={() => update("granted")}
            className="text-xs px-3 py-2 rounded bg-[var(--color-gold)] text-white
                       hover:opacity-90 transition"
          >
            {content.controls.accept}
          </button>
        </div>
      </section>
    </article>
  );
}

// ─── Tri-lingual content ────────────────────────────────────────────────────

const EN = {
  title: "Privacy",
  lastUpdated: "Last updated: 25 April 2026",
  sections: [
    {
      heading: "What Verbum collects",
      body: [
        "Nothing about you, unless you explicitly allow optional analytics. Verbum has no user accounts, no email collection, no cross-site tracking, and no advertising.",
        "Your bookmarks, notes, reading history, and language preference are stored ONLY in your browser's localStorage. They never leave your device and we have no access to them.",
      ],
    },
    {
      heading: "Optional analytics (Google Analytics 4)",
      body: [
        "If you accept the cookie banner, we load Google Analytics 4 with anonymized IP, no Google Signals, and no ad personalization. We use it solely to know how many people read with Verbum and which pages help them most.",
        "If you decline, GA4 is never loaded. The app works identically.",
      ],
    },
    {
      heading: "Error monitoring (Sentry)",
      body: [
        "When the app crashes, an anonymized stack trace is sent to Sentry so we can fix the bug. We configured it with send_default_pii=false, which means IP addresses, cookies, and user identifiers are NOT captured.",
        "This operates under legitimate interest (keeping the service working) and contains no information about you as a person.",
      ],
    },
    {
      heading: "AI explanations (Google Gemini)",
      body: [
        "When you click \"Explain with AI\" on a verse, that verse text plus a fixed prompt template is sent to Google's Gemini API to generate the explanation. The verse text is the same biblical text already in the public domain — no information about you is added.",
        "Each explanation is cached on our server so the same verse is never re-sent. If you don't click the AI button, no Gemini call happens.",
      ],
    },
    {
      heading: "Your rights (LGPD)",
      body: [
        "Under Brazilian LGPD (Lei Geral de Proteção de Dados), you have the right to know what's collected (above), to revoke consent at any time (controls below), and to request deletion. Since we store nothing identifying about you, deletion = clearing your browser's localStorage for verbum-app-bible.web.app.",
        "Questions: open an issue at github.com/DavidKGBR/verbum.",
      ],
    },
  ],
  controls: {
    heading: "Your analytics choice",
    body: "Change your decision at any time. Takes effect immediately.",
    statusLabel: "Current status",
    statusGranted: "Analytics enabled",
    statusDenied: "Analytics disabled",
    statusPending: "Not decided yet",
    accept: "Enable analytics",
    deny: "Disable analytics",
  },
};

const PT = {
  title: "Privacidade",
  lastUpdated: "Última atualização: 25 de abril de 2026",
  sections: [
    {
      heading: "O que o Verbum coleta",
      body: [
        "Nada sobre você, a menos que você ative explicitamente análise de uso opcional. O Verbum não tem cadastro, não coleta email, não rastreia entre sites e não tem publicidade.",
        "Seus favoritos, notas, histórico de leitura e preferência de idioma ficam armazenados APENAS no localStorage do seu navegador. Nunca saem do seu aparelho e não temos acesso a eles.",
      ],
    },
    {
      heading: "Análise opcional (Google Analytics 4)",
      body: [
        "Se você aceitar o banner de cookies, carregamos o GA4 com IP anonimizado, sem Google Signals e sem personalização de anúncios. Usamos exclusivamente para saber quantas pessoas leem o Verbum e quais páginas ajudam mais.",
        "Se você recusar, o GA4 nunca é carregado. O app funciona exatamente igual.",
      ],
    },
    {
      heading: "Monitoramento de erros (Sentry)",
      body: [
        "Quando o app quebra, um stack trace anonimizado é enviado ao Sentry para podermos consertar o bug. Configuramos com send_default_pii=false, ou seja, endereços IP, cookies e identificadores do usuário NÃO são capturados.",
        "Isso opera sob legítimo interesse (manter o serviço funcionando) e não contém informação sobre você como pessoa.",
      ],
    },
    {
      heading: "Explicações por IA (Google Gemini)",
      body: [
        "Quando você clica em \"Explicar com IA\" num verso, o texto desse verso mais um template fixo de prompt é enviado à API do Gemini do Google para gerar a explicação. O texto do verso é o mesmo texto bíblico já em domínio público — nenhuma informação sobre você é adicionada.",
        "Cada explicação é cacheada em nosso servidor, então o mesmo verso nunca é reenviado. Se você não clicar no botão de IA, nenhuma chamada ao Gemini acontece.",
      ],
    },
    {
      heading: "Seus direitos (LGPD)",
      body: [
        "Sob a LGPD (Lei Geral de Proteção de Dados), você tem direito a saber o que é coletado (acima), de revogar o consentimento a qualquer momento (controles abaixo) e de solicitar exclusão. Como não armazenamos nada que identifique você, exclusão = limpar o localStorage do seu navegador para verbum-app-bible.web.app.",
        "Dúvidas: abra uma issue em github.com/DavidKGBR/verbum.",
      ],
    },
  ],
  controls: {
    heading: "Sua escolha sobre análise",
    body: "Pode mudar sua decisão a qualquer momento. Efeito imediato.",
    statusLabel: "Estado atual",
    statusGranted: "Análise ativada",
    statusDenied: "Análise desativada",
    statusPending: "Ainda não decidiu",
    accept: "Ativar análise",
    deny: "Desativar análise",
  },
};

const ES = {
  title: "Privacidad",
  lastUpdated: "Última actualización: 25 de abril de 2026",
  sections: [
    {
      heading: "Qué recolecta Verbum",
      body: [
        "Nada sobre ti, a menos que actives explícitamente el análisis de uso opcional. Verbum no tiene cuentas de usuario, no recolecta correos, no rastrea entre sitios y no tiene publicidad.",
        "Tus favoritos, notas, historial de lectura y preferencia de idioma se almacenan SOLO en el localStorage de tu navegador. Nunca salen de tu dispositivo y no tenemos acceso a ellos.",
      ],
    },
    {
      heading: "Análisis opcional (Google Analytics 4)",
      body: [
        "Si aceptas el banner de cookies, cargamos GA4 con IP anonimizado, sin Google Signals y sin personalización de anuncios. Lo usamos solo para saber cuántas personas leen con Verbum y qué páginas las ayudan más.",
        "Si rechazas, GA4 nunca se carga. La app funciona igual.",
      ],
    },
    {
      heading: "Monitoreo de errores (Sentry)",
      body: [
        "Cuando la app falla, un stack trace anonimizado se envía a Sentry para que podamos corregir el bug. Lo configuramos con send_default_pii=false, lo que significa que las direcciones IP, cookies e identificadores de usuario NO son capturados.",
        "Esto opera bajo interés legítimo (mantener el servicio funcionando) y no contiene información sobre ti como persona.",
      ],
    },
    {
      heading: "Explicaciones por IA (Google Gemini)",
      body: [
        "Cuando haces clic en \"Explicar con IA\" en un verso, el texto de ese verso más una plantilla fija de prompt se envía a la API de Gemini de Google para generar la explicación. El texto del verso es el mismo texto bíblico ya en dominio público — no se añade información sobre ti.",
        "Cada explicación se cachea en nuestro servidor, así que el mismo verso nunca se reenvía. Si no haces clic en el botón de IA, no ocurre ninguna llamada a Gemini.",
      ],
    },
    {
      heading: "Tus derechos",
      body: [
        "Tienes derecho a saber qué se recolecta (arriba), a revocar el consentimiento en cualquier momento (controles abajo) y a solicitar eliminación. Como no almacenamos nada que te identifique, eliminación = limpiar el localStorage de tu navegador para verbum-app-bible.web.app.",
        "Preguntas: abre un issue en github.com/DavidKGBR/verbum.",
      ],
    },
  ],
  controls: {
    heading: "Tu elección sobre análisis",
    body: "Puedes cambiar tu decisión en cualquier momento. Efecto inmediato.",
    statusLabel: "Estado actual",
    statusGranted: "Análisis activado",
    statusDenied: "Análisis desactivado",
    statusPending: "Aún no decidido",
    accept: "Activar análisis",
    deny: "Desactivar análisis",
  },
};
