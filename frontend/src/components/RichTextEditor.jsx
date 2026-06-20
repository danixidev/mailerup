import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Paragraph from '@tiptap/extension-paragraph'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Strikethrough, Heading1, Heading2,
  List, ListOrdered, Quote, Link as LinkIcon, Image as ImageIcon,
  Undo2, Redo2, Code, UserMinus, StretchHorizontal,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Paperclip, X, Loader2, Trash2,
} from 'lucide-react'
import api from '../api'

const SPACED_MARGIN = '24px'

const SpacedParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      spacing: {
        default: null,
        parseHTML: (el) => {
          const m = el.style.marginBottom
          return m || null
        },
        renderHTML: (attrs) =>
          attrs.spacing ? { style: `margin-bottom: ${attrs.spacing}` } : {},
      },
    }
  },
})

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function linkifyFooter(escaped) {
  return escaped.replace(
    /(?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s<]*)?/gi,
    (m) => {
      const href = /^https?:\/\//i.test(m) ? m : 'https://' + m
      return `<a href="${href}" style="color:inherit;text-decoration:none">${m}</a>`
    }
  )
}

export function buildUnsubscribeFooterHtml(footer = {}) {
  const company = escapeHtml(footer.footer_company || footer.company || '')
  const address = escapeHtml(footer.footer_address || footer.address || '')
  const text = escapeHtml(
    footer.footer_unsubscribe_text ||
    footer.unsubscribe_text ||
    'Si ya no quieres recibir nuestros correos, puedes darte de baja en cualquier momento.'
  )
  const label = escapeHtml(footer.footer_button_label || footer.button_label || 'Darse de baja')
  const forward = linkifyFooter(escapeHtml(footer.footer_forward_text ?? footer.forward_text ?? ''))
  const subscribe = linkifyFooter(escapeHtml(footer.footer_subscribe_text ?? footer.subscribe_text ?? ''))

  return (
    '<hr data-mailerup="footer-divider" style="border:none;border-top:1px solid #e2e8f0;margin:36px 0 0" />' +
    '<div data-mailerup="footer" style="text-align:center;color:#94a3b8;font-size:13px;line-height:1.6;padding:16px 8px">' +
      (company ? `<div style="font-weight:600">${company}</div>` : '') +
      (address ? `<div>${address}</div>` : '') +
      (forward ? `<div style="margin-top:10px">▸ ${forward}</div>` : '') +
      (subscribe ? `<div style="margin-top:4px">▸ ${subscribe}</div>` : '') +
      `<div style="margin-top:18px;font-size:11px">${text} ` +
      `<a href="{{unsubscribe_url}}" style="color:inherit;text-decoration:none">${label}</a>.</div>` +
    '</div>'
  )
}

function Btn({ active, onClick, title, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent ${
        active ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

function ResourcePanel({ editor, onClose }) {
  const [resources, setResources] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef()

  useEffect(() => {
    api.get('/campaigns/resources/').then(r => setResources(r.data.results ?? r.data)).catch(() => {})
  }, [])

  function insertLink(resource) {
    editor.chain().focus().insertContent(
      `<a href="${resource.url}">${resource.original_name}</a>`
    ).run()
    onClose()
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await api.post('/campaigns/resources/', fd)
      const newResource = r.data
      setResources(prev => [newResource, ...prev])
      editor.chain().focus().insertContent(
        `<a href="${newResource.url}">${newResource.original_name}</a>`
      ).run()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al subir el archivo.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function deleteResource(resource, e) {
    e.stopPropagation()
    if (!confirm(`¿Eliminar "${resource.original_name}"?`)) return
    try {
      await api.delete(`/campaigns/resources/${resource.id}/`)
      setResources(prev => prev.filter(r => r.id !== resource.id))
    } catch {
      alert('No se pudo eliminar el recurso.')
    }
  }

  function fmt(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return (
    <div className="border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
          Recursos adjuntos
        </span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
          <X className="h-4 w-4" />
        </button>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="w-full mb-3 flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary-300 dark:border-primary-700 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50"
      >
        {uploading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo…</>
          : <><Paperclip className="h-4 w-4" /> Subir archivo e insertar enlace</>}
      </button>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {resources.length > 0 && (
        <ul className="space-y-0.5 max-h-44 overflow-y-auto">
          {resources.map(r => (
            <li key={r.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-white dark:hover:bg-slate-700 group">
              <button
                type="button"
                onClick={() => insertLink(r)}
                className="flex-1 flex items-center gap-2 text-left min-w-0"
                title="Insertar enlace en el editor"
              >
                <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                <span className="truncate text-sm text-gray-700 dark:text-slate-200">{r.original_name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">{fmt(r.file_size)}</span>
              </button>
              <button
                type="button"
                onClick={(e) => deleteResource(r, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0"
                title="Eliminar recurso"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {resources.length === 0 && !uploading && (
        <p className="text-xs text-gray-400 text-center py-2">Aún no has subido ningún recurso.</p>
      )}
    </div>
  )
}

export default function RichTextEditor({ value, onChange, footer }) {
  const [spaced, setSpaced] = useState(false)
  const [showResources, setShowResources] = useState(false)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ paragraph: false }),
      SpacedParagraph,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      TextAlign.configure({ types: ['paragraph', 'heading'] }),
    ],
    content: value || '<p>Escribe el contenido de tu correo aquí…</p>',
    onUpdate({ editor }) {
      onChange?.(editor.getHTML())
      setSpaced(detectSpacing(editor))
    },
  })

  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false)
      setSpaced(detectSpacing(editor))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (!editor) return null

  function detectSpacing(ed) {
    let found = false
    ed.state.doc.descendants((node) => {
      if (node.type.name === 'paragraph' && node.attrs.spacing) found = true
    })
    return found
  }

  function toggleSpacing() {
    const target = spaced ? null : SPACED_MARGIN
    const { tr, doc } = editor.state
    let changed = false
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, spacing: target })
        changed = true
      }
    })
    if (changed) {
      editor.view.dispatch(tr)
      setSpaced(!spaced)
    }
  }

  function setLink() {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL del enlace', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
  function addImage() {
    const url = window.prompt('URL de la imagen')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }
  function insertUnsubscribeFooter() {
    if (!footer || (!footer.footer_company && !footer.footer_address && !footer.footer_unsubscribe_text)) {
      if (!confirm(
        'No tienes configurado el pie de correo en Ajustes. Se insertará el pie por defecto. ¿Continuar?'
      )) return
    }
    const html = buildUnsubscribeFooterHtml(footer || {})
    editor.chain().focus().insertContent(html).run()
  }

  return (
    <div className="border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 dark:border-slate-600 p-1 bg-gray-50 dark:bg-slate-800">
        <Btn title="Negrita" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </Btn>
        <Btn title="Cursiva" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </Btn>
        <Btn title="Tachado" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </Btn>
        <Btn title="Código" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-4 w-4" />
        </Btn>
        <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
        <Btn title="Título 1" active={editor.isActive('heading', { level: 1 })}
             onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-4 w-4" />
        </Btn>
        <Btn title="Título 2" active={editor.isActive('heading', { level: 2 })}
             onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </Btn>
        <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
        <Btn title="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </Btn>
        <Btn title="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </Btn>
        <Btn title="Cita" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </Btn>
        <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
        <Btn title="Alinear a la izquierda" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="h-4 w-4" />
        </Btn>
        <Btn title="Centrar" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="h-4 w-4" />
        </Btn>
        <Btn title="Alinear a la derecha" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="h-4 w-4" />
        </Btn>
        <Btn title="Justificar" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify className="h-4 w-4" />
        </Btn>
        <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
        <Btn title="Insertar enlace" active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon className="h-4 w-4" />
        </Btn>
        <Btn title="Insertar imagen" onClick={addImage}>
          <ImageIcon className="h-4 w-4" />
        </Btn>
        <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
        <Btn title="Deshacer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 className="h-4 w-4" />
        </Btn>
        <Btn title="Rehacer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 className="h-4 w-4" />
        </Btn>
        <div className="flex-1" />
        <Btn
          title={spaced
            ? 'Quitar el espaciado amplio entre párrafos'
            : 'Aplicar espaciado amplio entre párrafos (más fácil de leer)'}
          active={spaced}
          onClick={toggleSpacing}
        >
          <StretchHorizontal className="h-4 w-4" />
        </Btn>
        <button
          type="button"
          onClick={() => setShowResources(v => !v)}
          title="Adjuntar archivo y generar enlace de descarga para el correo"
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
            showResources
              ? 'border-primary-400 dark:border-primary-500 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
              : 'border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50'
          }`}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Adjuntar recurso
        </button>
        <button
          type="button"
          onClick={insertUnsubscribeFooter}
          title="Inserta el pie con tu empresa, dirección y un botón de baja que se completará automáticamente al enviar"
          className="inline-flex items-center gap-1.5 rounded-md border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 px-2.5 py-1 text-xs font-medium text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50"
        >
          <UserMinus className="h-3.5 w-3.5" />
          Insertar pie con baja
        </button>
      </div>
      {showResources && (
        <ResourcePanel editor={editor} onClose={() => setShowResources(false)} />
      )}
      <EditorContent editor={editor} className="tiptap prose max-w-none" />
    </div>
  )
}
