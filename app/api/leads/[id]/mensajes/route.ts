import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * GET /api/leads/[id]/mensajes
 * Obtiene los mensajes formateados del lead desde lead_mensajes
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const mensajes = await sql`
      SELECT 
        id,
        tipo,
        mensaje,
        metadata,
        created_at
      FROM lead_mensajes
      WHERE lead_id = ${id}::integer
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return NextResponse.json({ mensajes });
  } catch (error) {
    console.error("[mensajes] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener mensajes" },
      { status: 500 }
    );
  }
}
        lc.cantidad,
        lc.created_at,
        lc.tipo_vehiculo
      FROM lead_consultas lc
      WHERE lc.lead_id = ${lead.id}
      ORDER BY lc.created_at DESC
      LIMIT 5
    `;

    for (const consulta of consultasResult.rows) {
      // Buscar productos que coincidan
      const productosResult = await sql`
        SELECT 
          p.id,
          p.medida,
          p.marca,
          p.modelo,
          tp_caba.precio_final_contado as precio_contado_caba,
          tp_caba.precio_final_3cuotas as precio_3cuotas_caba,
          tp_interior.precio_final_contado as precio_contado_interior,
          tp_interior.precio_final_3cuotas as precio_3cuotas_interior
        FROM productos p
        LEFT JOIN tarifas_precios tp_caba 
          ON tp_caba.producto_id = p.id AND tp_caba.region = 'CABA'
        LEFT JOIN tarifas_precios tp_interior 
          ON tp_interior.producto_id = p.id AND tp_interior.region = 'INTERIOR'
        WHERE p.medida = ${consulta.medida_neumatico}
          ${consulta.marca_preferida ? sql`AND LOWER(p.marca) = LOWER(${consulta.marca_preferida})` : sql``}
        ORDER BY p.marca, p.modelo
        LIMIT 3
      `;

      if (productosResult.rows.length > 0) {
        const region = lead.estado === 'CABA' ? 'CABA' : 'INTERIOR';
        const productos = productosResult.rows.map((p: any) => ({
          marca: p.marca,
          modelo: p.modelo,
          precio_contado: region === 'CABA' ? p.precio_contado_caba : p.precio_contado_interior,
          precio_3cuotas: region === 'CABA' ? p.precio_3cuotas_caba : p.precio_3cuotas_interior,
        }));

        const mensaje = formatearMensajeBusqueda(
          consulta.medida_neumatico,
          consulta.marca_preferida,
          productos,
          region
        );

        mensajes.push({
          tipo: 'busqueda_productos',
          timestamp: consulta.created_at,
          mensaje,
          datos: {
            medida: consulta.medida_neumatico,
            marca: consulta.marca_preferida,
            cantidad: consulta.cantidad,
            productos_encontrados: productos.length
          }
        });
      }
    }

    // 2. Mensajes de pedidos
    const pedidosResult = await sql`
      SELECT 
        lp.id,
        lp.total,
        lp.forma_pago,
        lp.estado_pago,
        lp.created_at,
        -- Items del pedido
        (
          SELECT json_agg(
            json_build_object(
              'producto_sku', pi.producto_sku,
              'cantidad', pi.cantidad,
              'precio_unitario', pi.precio_unitario,
              'subtotal', pi.subtotal,
              'producto_descripcion', p.marca || ' ' || p.modelo || ' ' || p.medida
            )
          )
          FROM pedido_items pi
          LEFT JOIN productos p ON p.id::text = pi.producto_sku
          WHERE pi.pedido_id = lp.id
        ) as items
      FROM lead_pedidos lp
      WHERE lp.lead_id = ${lead.id}
      ORDER BY lp.created_at DESC
      LIMIT 3
    `;

    for (const pedido of pedidosResult.rows) {
      const items = pedido.items || [];
      const mensaje = formatearMensajePedido(
        items,
        pedido.total,
        pedido.forma_pago
      );

      mensajes.push({
        tipo: 'pedido_creado',
        timestamp: pedido.created_at,
        mensaje,
        datos: {
          pedido_id: pedido.id,
          total: pedido.total,
          forma_pago: pedido.forma_pago,
          estado_pago: pedido.estado_pago,
          items_count: items.length
        }
      });
    }

    // 3. Mensaje de ticket si existe
    const ticketResult = await sql`
      SELECT 
        lt.id,
        lt.tipo_consulta,
        lt.descripcion,
        lt.estado,
        lt.created_at
      FROM lead_tickets lt
      WHERE lt.lead_id = ${lead.id}
      ORDER BY lt.created_at DESC
      LIMIT 1
    `;

    if (ticketResult.rows.length > 0) {
      const ticket = ticketResult.rows[0];
      mensajes.push({
        tipo: 'ticket_creado',
        timestamp: ticket.created_at,
        mensaje: `✅ Ticket creado: ${ticket.tipo_consulta.toUpperCase()}\n\n${ticket.descripcion}\n\n🎫 ID: ${ticket.id}\n📊 Estado: ${ticket.estado}`,
        datos: {
          ticket_id: ticket.id,
          tipo: ticket.tipo_consulta,
          estado: ticket.estado
        }
      });
    }

    // Ordenar por timestamp descendente
    mensajes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ mensajes });

  } catch (error) {
    console.error("Error fetching mensajes:", error);
    return NextResponse.json(
      { error: "Error al obtener mensajes" },
      { status: 500 }
    );
  }
}

/**
 * Formatear mensaje de búsqueda de productos
 */
function formatearMensajeBusqueda(
  medida: string,
  marca: string | null,
  productos: Array<{
    marca: string;
    modelo: string;
    precio_contado: number;
    precio_3cuotas: number;
  }>,
  region: string
): string {
  const marcaTexto = marca ? ` marca ${marca}` : '';
  let mensaje = `🔍 Búsqueda: ${medida}${marcaTexto}\n📍 Región: ${region}\n\n`;

  if (productos.length === 0) {
    mensaje += `❌ No encontramos productos disponibles con esa medida.\n\n`;
    mensaje += `💡 Te podemos ofrecer alternativas similares. ¿Querés que te muestre otras medidas compatibles?`;
    return mensaje;
  }

  mensaje += `✅ Encontramos ${productos.length} ${productos.length === 1 ? 'opción' : 'opciones'}:\n\n`;

  productos.forEach((p, idx) => {
    mensaje += `${idx + 1}️⃣ **${p.marca} ${p.modelo}**\n`;
    mensaje += `   💰 Contado: $${p.precio_contado.toLocaleString('es-AR')}\n`;
    mensaje += `   💳 3 Cuotas: $${p.precio_3cuotas.toLocaleString('es-AR')}\n\n`;
  });

  mensaje += `¿Te interesa alguna de estas opciones? 😊`;

  return mensaje;
}

/**
 * Formatear mensaje de pedido creado
 */
function formatearMensajePedido(
  items: Array<{
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    producto_descripcion: string;
  }>,
  total: number,
  forma_pago: string
): string {
  let mensaje = `✅ ¡Perfecto! Tu pedido fue registrado:\n\n`;
  
  mensaje += `📦 **DETALLE DEL PEDIDO:**\n`;
  items.forEach((item, idx) => {
    mensaje += `${idx + 1}. ${item.producto_descripcion}\n`;
    mensaje += `   Cantidad: ${item.cantidad} unidades\n`;
    mensaje += `   Precio c/u: $${item.precio_unitario.toLocaleString('es-AR')}\n`;
    mensaje += `   Subtotal: $${item.subtotal.toLocaleString('es-AR')}\n\n`;
  });

  mensaje += `💰 **TOTAL: $${total.toLocaleString('es-AR')}**\n`;
  mensaje += `💳 Forma de pago: ${forma_pago}\n\n`;
  
  mensaje += `📞 Un asesor se va a comunicar pronto para confirmar tu pedido y coordinar el pago.\n\n`;
  mensaje += `¿Necesitás algo más? 😊`;

  return mensaje;
}
