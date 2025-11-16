export type TicketPayload = {
  lead_id: string
  tipo: string
  descripcion: string
  prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
  asignado_a?: string | null
}

export type Ticket = {
  id: string
  lead_id: string
  tipo: string
  descripcion: string
  prioridad: string
  asignado_a: string | null
  estado: string
  created_at: string
}

export async function createTicket(payload: TicketPayload) {
  const res = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Error creando ticket')
  return res.json()
}

export async function getTickets(filters?: { estado?: string; prioridad?: string }) {
  const params = new URLSearchParams()
  if (filters?.estado) params.append('estado', filters.estado)
  if (filters?.prioridad) params.append('prioridad', filters.prioridad)
  
  const url = `/api/tickets${params.toString() ? `?${params.toString()}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error fetching tickets')
  return res.json()
}

export async function getTicket(id: string) {
  const res = await fetch(`/api/tickets/${id}`)
  if (!res.ok) throw new Error('Error fetching ticket')
  return res.json()
}

export async function updateTicket(id: string, updates: any) {
  const res = await fetch(`/api/tickets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Error updating ticket')
  return res.json()
}

export async function deleteTicket(id: string) {
  const res = await fetch(`/api/tickets/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Error deleting ticket')
  return res.json()
}
