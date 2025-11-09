import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET - Obtener slots disponibles para una fecha y tipo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha")
    const tipo = searchParams.get("tipo")

    if (!fecha || !tipo) {
      return NextResponse.json(
        { error: "Se requiere fecha y tipo" },
        { status: 400 }
      )
    }

    // Obtener día de la semana (1=Lunes, 7=Domingo)
    const fechaObj = new Date(fecha + 'T00:00:00')
    let diaSemana = fechaObj.getDay()
    // Convertir domingo (0) a 7, y el resto dejar igual
    if (diaSemana === 0) diaSemana = 7

    // Obtener configuración de horarios para ese día y tipo
    const horarios = await sql`
      SELECT * FROM horarios_disponibles
      WHERE dia_semana = ${diaSemana}
        AND tipo = ${tipo}
        AND activo = true
      ORDER BY hora_inicio
    `

    if (horarios.length === 0) {
      return NextResponse.json([])
    }

    // Generar slots para cada bloque horario
    const slots = []
    for (const horario of horarios) {
      const inicio = horario.hora_inicio
      const fin = horario.hora_fin
      const duracion = horario.duracion_slot
      const capacidad = horario.capacidad

      // Convertir TIME a minutos
      const [inicioH, inicioM] = inicio.split(':').map(Number)
      const [finH, finM] = fin.split(':').map(Number)
      
      let minutosActuales = inicioH * 60 + inicioM
      const minutosFin = finH * 60 + finM

      while (minutosActuales + duracion <= minutosFin) {
        const horaSlot = Math.floor(minutosActuales / 60).toString().padStart(2, '0')
        const minSlot = (minutosActuales % 60).toString().padStart(2, '0')
        const horaFinSlot = Math.floor((minutosActuales + duracion) / 60).toString().padStart(2, '0')
        const minFinSlot = ((minutosActuales + duracion) % 60).toString().padStart(2, '0')

        const horaInicioSlot = `${horaSlot}:${minSlot}:00`
        const horaFinSlotStr = `${horaFinSlot}:${minFinSlot}:00`

        // Verificar cuántos turnos hay en este slot
        const turnosEnSlot = await sql`
          SELECT COUNT(*) as count
          FROM turnos
          WHERE fecha = ${fecha}
            AND tipo = ${tipo}
            AND hora_inicio = ${horaInicioSlot}
            AND estado != 'cancelado'
        `

        const ocupados = parseInt(turnosEnSlot[0].count)
        const disponible = ocupados < capacidad

        slots.push({
          hora_inicio: horaInicioSlot,
          hora_fin: horaFinSlotStr,
          disponible,
          ocupados,
          capacidad,
          display: `${horaSlot}:${minSlot}`
        })

        minutosActuales += duracion
      }
    }

    return NextResponse.json(slots)
  } catch (error: any) {
    console.error("Error fetching slots:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
