# Betty Dental - Instalación Local

Sistema completo corriendo en una sola PC. Backend + Frontend en el puerto 3001.

## Requisitos

- **Node.js 20+** → https://nodejs.org/
- Windows 10/11

Nada más. SQLite es serverless, no necesita instalación aparte.

## Instalación (primera vez)

```powershell
# 1. Clonar el repo
git clone https://github.com/raymiflp/Sabonesa-Dental-Clinic-Y-Spa.git
cd Sabonesa-Dental-Clinic-Y-Spa

# 2. Instalar auto-start (una sola vez)
.\backend\install-autostart.ps1

# 3. Arrancar el server
.\backend\start-local.ps1
```

El script hace todo automáticamente:
- Instala dependencias (backend + frontend)
- Genera Prisma Client
- Crea la base de datos SQLite
- Sembla datos iniciales (pacientes, procedimientos, usuarios)
- Build del frontend React
- Arranca el server en el puerto 3001

## Acceso

Abre en cualquier navegador dentro de la misma red WiFi:

```
http://localhost:3001
```

Desde otra PC en la misma WiFi:

```
http://192.168.x.x:3001
```

(La IP se muestra al arrancar el server)

## Credenciales por defecto

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@betty.com | admin123 |
| Doctor | doctor@betty.com | doctor123 |
| Asistente | asistente@betty.com | asistente123 |

## Comandos

| Acción | Comando |
|--------|---------|
| Arrancar server | `.\backend\start-local.ps1` |
| Detener server | `.\backend\stop-local.ps1` |
| Instalar auto-start | `.\backend\install-autostart.ps1` |
| Quitar auto-start | `.\backend\uninstall-autostart.ps1` |

## Auto-start

Al ejecutar `install-autostart.ps1`, se crea una tarea de Windows que arranca el server automáticamente al hacer login. No necesitas abrir nada manualmente.

## Qué incluye

- **Backend**: Express.js + Prisma + SQLite
- **Frontend**: React 19 + Vite + Tailwind v4 + shadcn/ui
- **Funciones**: Pacientes, historial clínico, agenda, procedimientos, presupuestos, inventario, WhatsApp, recordatorios
- **20 pacientes demo** con historial, citas y créditos
- **80 procedimientos** dentales en 9 categorías
- **50+ insumos** inventariados

## Logs

El server escribe logs en `backend/server.log`. Si hay errores, revisa ese archivo.

## Solución de problemas

**No arranca**: Verifica que Node.js esté instalado (`node --version` debe mostrar v20+)

**Puerto ocupado**: Detén procesos Node con `.\backend\stop-local.ps1` vuelve a arrancar

**Error de base de datos**: Elimina `backend/prisma/dev.db` y vuelve a arrancar (se recrea con datos demo)
