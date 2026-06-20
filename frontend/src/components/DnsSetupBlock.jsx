import { useState } from 'react'
import { Copy, ExternalLink, Check, Globe } from 'lucide-react'

function CopyBtn({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault()
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          const ta = document.createElement('textarea')
          ta.value = text; document.body.appendChild(ta); ta.select()
          document.execCommand('copy'); ta.remove()
        }
        setDone(true)
        setTimeout(() => setDone(false), 1500)
      }}
      title="Copiar"
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
    >
      {done ? <Check className="h-3 w-3 text-green-600 dark:text-green-400" /> : <Copy className="h-3 w-3" />}
      {done ? 'Copiado' : 'Copiar'}
    </button>
  )
}

function Record({ type, host, value, ttl = 3600 }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2 dark:border-slate-700 dark:bg-slate-900">
      <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1 text-xs">
        <div className="text-gray-500 dark:text-slate-400">Tipo</div>
        <div className="font-mono font-semibold text-gray-900 dark:text-slate-100">{type}</div>
        <div className="text-gray-500 dark:text-slate-400">Host / Nombre</div>
        <div className="font-mono break-all text-gray-900 dark:text-slate-100">{host}</div>
        <div className="text-gray-500 dark:text-slate-400">Valor</div>
        <div className="font-mono break-all text-gray-900 dark:text-slate-100 select-all">{value}</div>
        <div className="text-gray-500 dark:text-slate-400">TTL</div>
        <div className="font-mono text-gray-900 dark:text-slate-100">{ttl}</div>
      </div>
      <div className="flex justify-end">
        <CopyBtn text={value} />
      </div>
    </div>
  )
}

export default function DnsSetupBlock({ provider, fromEmail, smtpUser }) {
  const [overrideDomain, setOverrideDomain] = useState('')

  if (!provider?.dns) return null

  const autoDomain =
    (fromEmail || '').split('@')[1]?.toLowerCase().trim() ||
    (smtpUser || '').split('@')[1]?.toLowerCase().trim() ||
    ''
  const domain = (overrideDomain || autoDomain || 'tudominio.com').trim()

  const dns = provider.dns
  const spfValue = dns.spf_record.replace(/\{domain\}/g, domain)
  const dmarcValue = dns.dmarc_record.replace(/\{domain\}/g, domain)
  const dkimNote = dns.dkim_note.replace(/\{domain\}/g, domain)
  const spfNote = (dns.spf_note || '').replace(/\{domain\}/g, domain)

  return (
    <div className="border-t border-gray-100 dark:border-slate-700 pt-4 space-y-4">
      <div className="flex items-start gap-2">
        <Globe className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">
            Registros DNS recomendados para {provider.label}
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Publica estos registros en la zona DNS de tu dominio para que tus correos no acaben en spam.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 dark:text-slate-400">Dominio:</label>
        <input
          className="input max-w-xs"
          value={overrideDomain}
          onChange={(e) => setOverrideDomain(e.target.value)}
          placeholder={autoDomain || 'tudominio.com'}
        />
        {!overrideDomain && autoDomain && (
          <span className="text-xs text-gray-400 dark:text-slate-500">(detectado del remitente)</span>
        )}
      </div>

      <details open className="space-y-2">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100">
          1. SPF — autoriza al proveedor a enviar en nombre del dominio
        </summary>
        <div className="mt-2 ml-1 space-y-2">
          <Record type="TXT" host="@" value={spfValue} />
          {spfNote && <p className="text-xs text-gray-500 dark:text-slate-400">{spfNote}</p>}
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-800">
            ⚠ Si ya tienes un TXT con <code className="font-mono">v=spf1</code> en @, NO añadas otro:
            edita el existente y mete los includes nuevos en la misma línea. Sólo se permite un SPF por dominio.
          </p>
        </div>
      </details>

      <details className="space-y-2">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100">
          2. DKIM — firma criptográfica de tus correos
        </summary>
        <div className="mt-2 ml-1 space-y-2">
          <p className="text-sm text-gray-600 dark:text-slate-300">{dkimNote}</p>
          {dns.guide_url && (
            <a
              href={dns.guide_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Guía oficial de {provider.label}
            </a>
          )}
        </div>
      </details>

      <details className="space-y-2">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100">
          3. DMARC — política y reporting
        </summary>
        <div className="mt-2 ml-1 space-y-2">
          <Record type="TXT" host="_dmarc" value={dmarcValue} />
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Empieza con <code className="font-mono">p=none</code> (sólo monitorización). Cuando confirmes que
            SPF + DKIM funcionan, sube a <code className="font-mono">p=quarantine</code> y finalmente <code className="font-mono">p=reject</code>.
          </p>
        </div>
      </details>

      <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-3 space-y-1 dark:text-slate-400 dark:bg-slate-900 dark:border-slate-700">
        <p><strong>Cómo comprobar que están publicados</strong> (desde terminal o desde mxtoolbox.com):</p>
        <ul className="list-disc list-inside ml-1 space-y-0.5 font-mono">
          <li>dig TXT {domain} +short</li>
          <li>dig TXT _dmarc.{domain} +short</li>
        </ul>
        <p className="font-sans">
          Tras publicar, la propagación tarda entre minutos y unas horas.
        </p>
      </div>
    </div>
  )
}
