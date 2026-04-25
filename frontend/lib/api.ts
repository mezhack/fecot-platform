/**
 * Cliente HTTP da API FECOT.
 * Centraliza a URL base, token JWT, tipos TS e tratamento de erros.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002"

const TOKEN_KEY = "fecot_token"
const USER_KEY = "fecot_user"

// ================================================================
// Tipos
// ================================================================

export type AthleteRole = "athlete" | "teacher" | "academy_manager" | "admin"
export type AthleteSex = "male" | "female"
export type GraduationRequestStatus = "pending" | "approved" | "rejected"

export interface Athlete {
  id: number
  name: string
  email: string | null
  cpf: string | null
  phone: string | null
  birth_date: string | null
  weight_kg: number | null
  sex: AthleteSex | null
  graduation: string
  role: AthleteRole
  active: boolean
  avatar_url: string | null
  home_academy_id: number | null
  professor_id: number | null
  created_at: string
  updated_at: string
  // Derivados
  age: number | null
  home_academy_name: string | null
  professor_name: string | null
  is_dan_rank: boolean
  can_be_professor: boolean
  teaching_at_academy_ids: number[]
}

export interface Academy {
  id: number
  name: string
  cnpj: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  email: string | null
  active: boolean
  manager_id: number
  created_at: string
  updated_at: string
  // Derivados
  manager_name: string | null
  manager_contact: string | null
  students_count: number
  teachers_count: number
  teacher_ids: number[]
}

export interface GraduationRequest {
  id: number
  athlete_id: number
  from_graduation: string
  to_graduation: string
  requested_by_id: number
  reviewed_by_id: number | null
  status: GraduationRequestStatus
  reason: string | null
  review_notes: string | null
  created_at: string
  reviewed_at: string | null
  athlete_name: string | null
  requested_by_name: string | null
  reviewed_by_name: string | null
}

export interface TokenResponse {
  access_token: string
  token_type: string
  athlete: Athlete
}

export class ApiError extends Error {
  status: number
  data: unknown
  constructor(status: number, message: string, data: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

// ================================================================
// Token / user storage
// ================================================================

export const tokenStorage = {
  get(): string | null {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(TOKEN_KEY)
  },
  set(token: string) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(TOKEN_KEY, token)
  },
  clear() {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
  },
}

export const userStorage = {
  get(): Athlete | null {
    if (typeof window === "undefined") return null
    const raw = window.localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as Athlete
    } catch {
      return null
    }
  },
  set(user: Athlete) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
}

// ================================================================
// Request helper
// ================================================================

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  }
  if (auth) {
    const token = tokenStorage.get()
    if (token) finalHeaders.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
  })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const d = data as { detail?: string } | null
    const msg = d?.detail ?? res.statusText ?? "Erro na requisição"
    throw new ApiError(res.status, msg, data)
  }
  return data as T
}

// ================================================================
// Endpoints
// ================================================================

export const api = {
  // ---------- Auth ----------
  login: (identifier: string, password: string) =>
    request<TokenResponse>("/api/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ identifier, password }),
    }),

  me: () => request<Athlete>("/api/me"),

  /**
   * Auto-edição de dados pessoais. Só aceita: name, email, phone,
   * birth_date, weight_kg, sex, avatar_url. Campos federativos (role,
   * graduation, academia, professor, cpf) NÃO são aceitos aqui.
   */
  updateMe: (data: {
    name?: string
    email?: string | null
    phone?: string | null
    birth_date?: string | null
    weight_kg?: number | null
    sex?: AthleteSex | null
    avatar_url?: string | null
  }) =>
    request<Athlete>("/api/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updatePassword: (currentPassword: string, newPassword: string) =>
    request<void>("/api/update_password", {
      method: "PATCH",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    }),

  /**
   * Upload do próprio avatar. Espera um File válido.
   * Aceita JPEG, PNG, WebP até 5 MB. Servidor redimensiona e converte pra WebP.
   */
  uploadMyAvatar: async (file: File): Promise<Athlete> => {
    const fd = new FormData()
    fd.append("file", file)
    const token = tokenStorage.get()
    const res = await fetch(`${API_URL}/api/me/avatar`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    })
    if (!res.ok) {
      let detail = "Erro ao enviar avatar"
      try {
        const data = await res.json()
        detail = data.detail ?? detail
      } catch {
        /* body vazio */
      }
      throw new ApiError(res.status, detail, null)
    }
    return (await res.json()) as Athlete
  },

  deleteMyAvatar: () =>
    request<Athlete>("/api/me/avatar", { method: "DELETE" }),

  /**
   * Upload administrativo — admin/teacher responsável pode mudar foto de outro.
   */
  uploadAthleteAvatar: async (athleteId: number, file: File): Promise<Athlete> => {
    const fd = new FormData()
    fd.append("file", file)
    const token = tokenStorage.get()
    const res = await fetch(`${API_URL}/api/athletes/${athleteId}/avatar`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    })
    if (!res.ok) {
      let detail = "Erro ao enviar avatar"
      try {
        const data = await res.json()
        detail = data.detail ?? detail
      } catch {}
      throw new ApiError(res.status, detail, null)
    }
    return (await res.json()) as Athlete
  },

  deleteAthleteAvatar: (athleteId: number) =>
    request<Athlete>(`/api/athletes/${athleteId}/avatar`, { method: "DELETE" }),

  // ---------- Athletes ----------
  listAthletes: (params?: {
    home_academy_id?: number
    role?: AthleteRole
    active?: boolean
    search?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.home_academy_id !== undefined) q.set("home_academy_id", String(params.home_academy_id))
    if (params?.role) q.set("role", params.role)
    if (params?.active !== undefined) q.set("active", String(params.active))
    if (params?.search) q.set("search", params.search)
    const qs = q.toString()
    return request<Athlete[]>(`/api/athletes${qs ? "?" + qs : ""}`)
  },

  getAthlete: (id: number) => request<Athlete>(`/api/athletes/${id}`),

  createAthlete: (data: Partial<Athlete> & { password?: string }) =>
    request<Athlete>("/api/athletes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAthlete: (id: number, data: Partial<Athlete> & { password?: string }) =>
    request<Athlete>(`/api/athletes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteAthlete: (id: number) =>
    request<void>(`/api/athletes/${id}`, { method: "DELETE" }),

  // ---------- Academies ----------
  listAcademies: (params?: { active?: boolean; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.active !== undefined) q.set("active", String(params.active))
    if (params?.search) q.set("search", params.search)
    const qs = q.toString()
    return request<Academy[]>(`/api/academies${qs ? "?" + qs : ""}`)
  },

  // Público — sem auth — para o mapa na home
  publicMapAcademies: () =>
    request<Academy[]>("/api/academies/public/map", { auth: false }),

  getAcademy: (id: number) => request<Academy>(`/api/academies/${id}`),

  createAcademy: (data: Partial<Academy> & { manager_id: number }) =>
    request<Academy>("/api/academies", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAcademy: (id: number, data: Partial<Academy>) =>
    request<Academy>(`/api/academies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteAcademy: (id: number) =>
    request<void>(`/api/academies/${id}`, { method: "DELETE" }),

  addTeacherToAcademy: (academyId: number, athleteId: number) =>
    request<Academy>(`/api/academies/${academyId}/teachers`, {
      method: "POST",
      body: JSON.stringify({ athlete_id: athleteId }),
    }),

  removeTeacherFromAcademy: (academyId: number, athleteId: number) =>
    request<void>(`/api/academies/${academyId}/teachers/${athleteId}`, {
      method: "DELETE",
    }),

  // ---------- Graduation Requests ----------
  listGraduationRequests: (params?: {
    status?: GraduationRequestStatus
    athlete_id?: number
  }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set("status", params.status)
    if (params?.athlete_id !== undefined) q.set("athlete_id", String(params.athlete_id))
    const qs = q.toString()
    return request<GraduationRequest[]>(`/api/graduation_requests${qs ? "?" + qs : ""}`)
  },

  getGraduationRequest: (id: number) =>
    request<GraduationRequest>(`/api/graduation_requests/${id}`),

  createGraduationRequest: (data: {
    athlete_id: number
    to_graduation: string
    reason?: string
  }) =>
    request<GraduationRequest>("/api/graduation_requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  approveGraduationRequest: (id: number, reviewNotes?: string) =>
    request<GraduationRequest>(`/api/graduation_requests/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ review_notes: reviewNotes ?? null }),
    }),

  rejectGraduationRequest: (id: number, reviewNotes?: string) =>
    request<GraduationRequest>(`/api/graduation_requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ review_notes: reviewNotes ?? null }),
    }),

  // ---------- Health ----------
  health: () =>
    request<{ status: string; database: string }>("/api/health", { auth: false }),
}

// ================================================================
// Helpers de apresentação
// ================================================================

export const ROLE_LABEL: Record<AthleteRole, string> = {
  athlete: "Atleta",
  teacher: "Professor",
  academy_manager: "Gestor de Academia",
  admin: "Administrador",
}

export const SEX_LABEL: Record<AthleteSex, string> = {
  male: "Masculino",
  female: "Feminino",
}

export const STATUS_LABEL: Record<GraduationRequestStatus, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
}

/**
 * Converte um `avatar_url` (path relativo do backend tipo `/uploads/avatars/xxx.webp`)
 * pra URL absoluta usável em <img>. Deixa passar URLs externas (http/https) inalteradas.
 */
export function resolveAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl
  }
  return `${API_URL}${avatarUrl}`
}
