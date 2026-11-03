// Cliente HTTP de la API. El proxy de Vite reenvía /api al backend en el puerto 8000.
const TOKEN_KEY = 'enlace.admin.token'

export function getToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function setToken(token) {
  try { sessionStorage.setItem(TOKEN_KEY, token) } catch { /* sin almacenamiento: la sesión dura lo que la pestaña */ }
}
export function clearToken() {
  try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* nada que limpiar */ }
}

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

const FIELD = { nombre: 'Nombre', email: 'Correo', mensaje: 'Mensaje', text: 'Mensaje', password: 'Contraseña', area_id: 'Área', cargo: 'Cargo', descripcion: 'Descripción' }

function friendly(detail) {
  if (typeof detail === 'string') return detail
  if (!Array.isArray(detail)) return null
  return detail.map((item) => {
    const field = FIELD[item.loc?.[item.loc.length - 1]] || 'Dato'
    if (item.msg?.startsWith('Value error, ')) return item.msg.slice(13)
    if (item.type === 'string_too_long') return `${field}: el texto es demasiado largo.`
    if (item.type === 'string_too_short' || item.type === 'missing') return `${field}: completa este campo.`
    return `${field}: valor no válido.`
  }).join(' ')
}

export async function request(path, { method = 'GET', body, params } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const query = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString() : ''
  let response
  try {
    response = await fetch(`/api${path}${query}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError('No se pudo conectar con la API. Comprueba que esté iniciada en el puerto 8000.', 0)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && token) {
      clearToken()
      window.dispatchEvent(new Event('auth:expired'))
    }
    const message = friendly(data.detail) || (response.status >= 500
      ? 'El servicio no está disponible en este momento.'
      : 'Revisa los datos e inténtalo de nuevo.')
    throw new ApiError(message, response.status)
  }
  return data
}

export const notifyChange = () => window.dispatchEvent(new Event('notificaciones:cambio'))
