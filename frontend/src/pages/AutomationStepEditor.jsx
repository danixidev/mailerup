import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Zap } from 'lucide-react'
import api from '../api'
import RichTextEditor from '../components/RichTextEditor.jsx'

export default function AutomationStepEditor() {
  const { automationId, stepId } = useParams()
  const isEdit = !!stepId
  const nav = useNavigate()

  const [automation, setAutomation] = useState(null)
  const [me, setMe] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const STEP_BLANK = '<p>Escribe el contenido del correo aquí…</p>'
  const [form, setForm] = useState({
    subject: '',
    html_content: STEP_BLANK,
    delay_amount: 0,
    delay_unit: 'days',
    from_name: '',
    from_email: '',
  })

  useEffect(() => {
    // Cargar datos del usuario para el editor
    api.get('/auth/me/').then((r) => setMe(r.data)).catch(() => {})
    // Cargar nombre de la automatización para el breadcrumb
    api.get(`/automations/${automationId}/`).then((r) => setAutomation(r.data)).catch(() => {})
    // Si es edición, cargar datos del paso
    if (isEdit) {
      api.get(`/automations/${automationId}/steps/`).then((r) => {
        const steps = r.data.results || r.data
        const step = steps.find((s) => String(s.id) === String(stepId))
        if (!step) {
          setError('Paso no encontrado.')
          return
        }
        setForm({
          subject: step.subject || '',
          html_content: step.html_content || '<p></p>',
          delay_amount: step.delay_amount ?? 0,
          delay_unit: step.delay_unit || 'days',
          from_name: step.from_name || '',
          from_email: step.from_email || '',
        })
      }).catch(() => setError('No se pudo cargar el paso.'))
    }
  }, [automationId, stepId])

  const unitLabel = { minutes: 'minuto(s)', hours: 'hora(s)', days: 'día(s)' }[form.delay_unit] || 'día(s)'
  const delayLabel =
    form.delay_amount === 0
      ? 'Se enviará inmediatamente tras la suscripción.'
      : `Se enviará ${form.delay_amount} ${unitLabel} después de la suscripción.`

  async function handleSave() {
    if (!form.subject.trim()) {
      setError('El asunto es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await api.patch(`/automations/${automationId}/steps/${stepId}/`, form)
      } else {
        await api.post(`/automations/${automationId}/steps/`, form)
      }
      nav(`/automations`, { state: { openAutomation: automationId } })
    } catch (err) {
      setError(
        err.response?.data
          ? JSON.stringify(err.response.data)
          : 'Error al guardar el paso.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          to="/automations"
          className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Automatizaciones
        </Link>
        {automation && (
          <span className="text-sm text-gray-400 dark:text-slate-500"> / {automation.name}</span>
        )}
        <h1 className="text-2xl font-semibold mt-1">
          {isEdit ? 'Editar paso' : 'Nuevo paso'}
        </h1>
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3"
        >
          {error}
        </p>
      )}

      {/* Configuración del paso */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold">Configuración del envío</h2>

        <div>
          <label htmlFor="step-subject" className="label">
            Asunto del correo *
          </label>
          <input
            id="step-subject"
            className="input"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Retraso de envío</label>
          <div className="flex gap-2 items-center">
            <input
              className="input w-24"
              type="number"
              min={0}
              aria-label="Cantidad de retraso"
              value={form.delay_amount}
              onChange={(e) =>
                setForm({ ...form, delay_amount: parseInt(e.target.value, 10) || 0 })
              }
            />
            <select
              className="input w-32"
              aria-label="Unidad de retraso"
              value={form.delay_unit}
              onChange={(e) => setForm({ ...form, delay_unit: e.target.value })}
            >
              <option value="minutes">Minutos</option>
              <option value="hours">Horas</option>
              <option value="days">Días</option>
            </select>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{delayLabel}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="step-from-name" className="label">
              Nombre del remitente
            </label>
            <input
              id="step-from-name"
              className="input"
              placeholder="Deja vacío para usar el de Ajustes"
              value={form.from_name}
              onChange={(e) => setForm({ ...form, from_name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="step-from-email" className="label">
              Email del remitente
            </label>
            <input
              id="step-from-email"
              className="input"
              type="email"
              placeholder="Deja vacío para usar el de Ajustes"
              value={form.from_email}
              onChange={(e) => setForm({ ...form, from_email: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Editor de contenido */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold">Contenido del correo</h2>
        <RichTextEditor
          value={form.html_content}
          onChange={(html) => setForm({ ...form, html_content: html })}
          footer={me}
        />
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Puedes usar <code>{'{{first_name}}'}</code>,{' '}
          <code>{'{{last_name}}'}</code>, <code>{'{{email}}'}</code> como
          variables.
        </p>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between">
        <Link to="/automations" className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Cancelar
        </Link>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          <Zap className="h-4 w-4" />
          {saving
            ? 'Guardando…'
            : isEdit
            ? 'Guardar cambios'
            : 'Añadir a la automatización'}
        </button>
      </div>
    </div>
  )
}
