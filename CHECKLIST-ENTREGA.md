# 🏁 TopNeum - Checklist Pre-Entrega

## ✅ Completado

### Base de datos y arquitectura
- [x] Refactorización completa de tablas (eliminadas 2 tablas redundantes)
- [x] Tabla `leads` simplificada (8 columnas menos)
- [x] Tabla `turnos` con soporte para envíos
- [x] Tabla `products` con flag `requiere_verificacion`
- [x] Índices optimizados en `lead_tickets`
- [x] Sistema de múltiples consultas y cotizaciones por lead

### APIs completadas
- [x] `POST /api/tickets` - Crear ticket
- [x] `GET /api/tickets` - Listar tickets (con filtros)
- [x] `GET /api/tickets/[id]` - Obtener ticket
- [x] `PATCH /api/tickets/[id]` - Actualizar estado
- [x] `DELETE /api/tickets/[id]` - Eliminar ticket
- [x] Helper cliente `lib/tickets.ts` con funciones wrapper

### UI completada
- [x] Página `/tickets` con dashboard y tabla
- [x] Componente `TicketsTable` con filtros y acciones
- [x] `LeadCard` muestra todas las consultas (no solo última)
- [x] `LeadCard` muestra contador de cotizaciones
- [x] Sidebar actualizado con link a Tickets
- [x] Pedidos lee datos del cliente desde `turnos`

### Documentación generada
- [x] `docs/prompt.md` - Prompt completo del agente IA
- [x] `docs/memoria-chat.md` - Estrategia de memoria conversacional
- [x] `docs/integracion-whatsapp.md` - Comparativa Evolution API vs Oficial
- [x] `docs/testing-e2e.md` - Suite de tests y checklist QA
- [x] `docs/credenciales-testing.md` - Setup de usuarios y ambientes

---

## ⏳ Pendiente (por prioridad)

### 1. Memoria del chat ⚠️ CRÍTICO
**Estado:** Documentado, falta implementar
**Siguiente paso:**
```typescript
// En cada interacción significativa, actualizar:
const resumen = `[${timestamp}] - ${accion}: ${detalles}`
await sql`
  UPDATE leads 
  SET notas = CONCAT(COALESCE(notas, ''), '\n', ${resumen}),
      ultima_interaccion = NOW()
  WHERE id = ${leadId}
`
```

### 2. Testing E2E 🧪
**Estado:** Documentado, falta ejecutar
**Siguiente paso:**
```bash
npm install --save-dev @playwright/test
npx playwright install
npx playwright test tests/e2e/lead-to-pedido.spec.ts
```

**Checklist manual:**
- [ ] Flujo completo: lead → consulta → cotización → turno → pedido
- [ ] Verificar datos en `turnos` aparecen en `pedidos`
- [ ] Múltiples consultas se muestran en kanban
- [ ] Tickets se crean correctamente

### 3. Estética UI 🎨
**Estado:** Funcional, requiere pulido
**Checklist:**
- [ ] Revisar tipografías y tamaños
- [ ] Verificar colores de badges (consistencia)
- [ ] Espaciados en cards (padding/margin)
- [ ] Responsividad mobile (< 768px)
- [ ] Hover states en botones
- [ ] Loading states en formularios

**Archivos a revisar:**
- `components/leads/lead-card.tsx`
- `components/leads/lead-detail-panel.tsx`
- `app/pedidos/[id]/page.tsx`
- `app/tickets/page.tsx`

### 4. Sección de pagos 💳
**Estado:** Básico implementado, falta ampliar
**Falta:**
- [ ] Endpoint `GET /api/pagos?pedido_id=X`
- [ ] UI para subir comprobantes
- [ ] Notificaciones de pago recibido
- [ ] Estados de pago más granulares (sena, saldo)

**Prioridad:** Media (funcional con estado actual)

### 5. Integración WhatsApp 📱
**Estado:** Documentado, no implementado
**Decisión recomendada:** Evolution API para MVP

**Siguiente paso:**
```bash
# Instalar Evolution API
docker run -d --name evolution-api -p 8080:8080 atendai/evolution-api

# Crear instancia
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: tu-key" \
  -d '{"instanceName":"topneum"}'

# Obtener QR
curl http://localhost:8080/instance/qrcode/topneum \
  -H "apikey: tu-key"
```

**Archivos a crear:**
- `lib/whatsapp.ts` (helpers)
- `app/api/webhooks/whatsapp/route.ts` (recibir mensajes)

### 6. Credenciales y seguridad 🔒
**Estado:** Documentado, falta ejecutar
**Checklist:**
- [ ] Cambiar passwords de usuarios de prueba
- [ ] Generar JWT_SECRET y NEXTAUTH_SECRET seguros
- [ ] Configurar variables de entorno en Vercel
- [ ] Crear usuario `admin@topneum.com` en producción
- [ ] Desactivar usuario `test@topneum.com` en prod

**Script:**
```sql
UPDATE users 
SET password = crypt('NuevoPasswordSeguro2025!', gen_salt('bf'))
WHERE email = 'admin@topneum.com';
```

### 7. Integración nn8n 🤖
**Estado:** Prompt listo, falta workflow
**Componentes necesarios:**
1. Webhook node (recibir mensajes WhatsApp)
2. HTTP Request node (buscar/crear lead)
3. OpenAI node (procesar con GPT-4 + prompt)
4. Function node (decidir qué tool usar)
5. HTTP Request node (ejecutar tool: consulta/cotización/turno/ticket)
6. HTTP Request node (enviar respuesta por WhatsApp)

**Variables de entorno nn8n:**
```
API_BASE_URL=https://app.topneum.com
EVOLUTION_API_URL=http://evolution:8080
EVOLUTION_API_KEY=tu-key
```

---

## 📊 Métricas de éxito

### Performance
- [ ] Tiempo de carga página leads: < 2s
- [ ] Tiempo de respuesta API tickets: < 500ms
- [ ] Tiempo respuesta agente IA: < 5s

### Conversión
- [ ] % leads que crean consulta: > 70%
- [ ] % consultas que generan cotización: > 80%
- [ ] % cotizaciones que convierten en pedido: > 40%
- [ ] % tickets resueltos automáticamente: > 60%

### Calidad
- [ ] 0 errores de compilación TypeScript
- [ ] 0 referencias a columnas eliminadas
- [ ] Tests E2E pasando al 100%
- [ ] Coverage de código: > 70%

---

## 🚀 Plan de lanzamiento

### Semana 1: Testing interno
- [ ] Ejecutar tests E2E completos
- [ ] Probar flujos manuales con usuarios reales
- [ ] Corregir bugs críticos
- [ ] Pulir UI

### Semana 2: Integración WhatsApp
- [ ] Instalar Evolution API en staging
- [ ] Crear workflow nn8n básico
- [ ] Probar conversaciones con agente IA
- [ ] Ajustar prompt según feedback

### Semana 3: Beta privada
- [ ] Onboarding de 2-3 vendedores
- [ ] Monitorear métricas en tiempo real
- [ ] Recolectar feedback
- [ ] Iterar rápidamente

### Semana 4: Lanzamiento
- [ ] Migrar a API Oficial de WhatsApp (si aplica)
- [ ] Cambiar credenciales a producción
- [ ] Deploy en Vercel/hosting final
- [ ] Activar monitoreo (Sentry, LogRocket)

---

## 📞 Contactos y recursos

### Documentación
- [Prompt del agente](docs/prompt.md)
- [Memoria del chat](docs/memoria-chat.md)
- [Integración WhatsApp](docs/integracion-whatsapp.md)
- [Testing E2E](docs/testing-e2e.md)
- [Credenciales](docs/credenciales-testing.md)

### APIs clave
- `/api/tickets` - Gestión de tickets
- `/api/leads` - Leads y consultas
- `/api/turnos` - Agendamiento
- `/api/pedidos` - Pedidos y pagos

### Herramientas externas
- Evolution API: https://doc.evolution-api.com/
- nn8n: https://docs.n8n.io/
- Neon DB: https://neon.tech/
- Vercel: https://vercel.com/

---

## ✅ Última actualización: 2025-11-16

**Estado general:** 80% completo
**Bloqueadores:** Ninguno
**Siguiente milestone:** Testing E2E + Integración WhatsApp

**Equipo:**
- Backend/DB: ✅ Completo
- Frontend/UI: 🟡 90% (falta pulido)
- Integración: 🔴 Pendiente
- Testing: 🔴 Pendiente
- Documentación: ✅ Completa
