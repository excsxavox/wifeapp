# WifeApp

App móvil para **controlar el gasto**: presupuesto por categoría, registro con motivo y, en Android, un **portero** que aparece al abrir apps de banca, comida, movilidad u otras que el usuario registre.

| | |
|---|---|
| **Stack** | Expo SDK 58 · React Native · Expo Router · SQLite local |
| **Package Android** | `com.wifeapp.control` |
| **Slug EAS** | `wifeapp` |

---

## Qué resuelve

1. Definir un **presupuesto mensual** por categoría.
2. **Registrar** para qué se gasta (motivo + monto).
3. En Android: al abrir una app vigilada, **WifeApp interrumpe** y pregunta qué va a hacer el usuario.
4. Si la categoría ya está agotada, exige un **código de emergencia**.
5. Ver **métricas KDA** del período (aciertos / deslices / apoyos).
6. Crear **metas de ahorro** (ej. Viaje) y ver su progreso en el inicio.

---

## Plataformas

| Capacidad | Android | iPhone / web |
|---|---|---|
| Presupuesto, registro, historial, KDA | Sí | Sí |
| Listar apps instaladas | Sí | No (catálogo de ejemplo en web) |
| Detectar apertura de apps (portero) | Sí (Accesibilidad) | No |
| Pedir motivo/monto antes de entrar | Sí | Simulación manual |
| Código de emergencia | Sí | Sí (al registrar) |

> El portero **no funciona en Expo Go**. Requiere APK / development build.

---

## Flujo del usuario

### Configuración obligatoria (onboarding)

1. **Accesibilidad** (obligatorio en Android) — para detectar apps.
2. **Elegir apps instaladas** (obligatorio) — clasificarlas: Banca, Comida, Movilidad, Entretenimiento, Otros.
3. **Código de emergencia** (opcional).

Sin Accesibilidad + al menos una app vigilada, el portero no actúa.

### Portero (Android) — burbuja flotante

El portero ya no abre una pantalla completa. Tu compañero/a (esposa o esposo,
según Ajustes) aparece como una **burbuja pequeña con globo de diálogo** encima
de la app, que puedes seguir usando debajo.

```
Usuario abre app vigilada (ej. Pichincha)
        ↓
Burbuja: «¿Vas a gastar en Pichincha?» + categorías
   · «Voy a gastar» → al salir pregunta el monto
   · «Solo mirar»  → al salir NO pregunta nada
   · ✕ / ignorarla → se encoge a un avatar; al salir igual pregunta
        ↓
Al cerrar o cambiar de app (si no eligió «Solo mirar»)
        ↓
Burbuja: «¿Cuánto fue y de qué fue?» (monto + motivo)
   · Guardar → se importa al abrir WifeApp
     (si supera el presupuesto queda pendiente hasta confirmarlo con PIN)
   · «No gasté nada»
   · ✕ → queda PENDIENTE: la burbuja vuelve a recordarlo cada ~20 min
     y aparece en el Resumen como «gastos por confirmar»
```

Si vuelves a la misma app en menos de 3 minutos (p. ej. para copiar un código),
la visita continúa sin volver a preguntar.

---

## Pantallas

| Ruta | Descripción |
|---|---|
| `/onboarding` | Configuración inicial obligatoria |
| `/` (Resumen) | Gastado vs presupuesto + meta de ahorro + aviso si falta Accesibilidad |
| `/metricas` | KDA, barras por categoría y gasto diario |
| `/metas` | Crear / aportar a metas de ahorro (progreso en Inicio) |
| `/registrar` | Alta manual de gasto |
| `/presupuesto` | Editar límites por categoría |
| `/historial` | Movimientos del período |
| `/ajustes` | PIN, moneda, permisos del portero |
| `/apps-vigiladas` | Apps vigiladas + lista de instaladas del celular |
| `/gate` | Confirmar un gasto pendiente (desde el Resumen) |

---

## Categorías por defecto

- Comida  
- Banca  
- Movilidad  
- Entretenimiento  
- Otros  

## Métricas KDA

| Letra | Significado |
|---|---|
| **K** | Aciertos — gastos dentro de presupuesto |
| **D** | Deslices — gastos con código de emergencia |
| **A** | Apoyos — categorías bajo control + días sin emergencias |

**Ratio** = `(K + A) / D` → rangos Hierro → Diamante.

---

## Estructura del repo

```
wifeapp/
├── app/                      # Expo Router (pantallas)
│   ├── (tabs)/               # Resumen, KDA, Registrar, Presupuesto, Historial, Ajustes
│   ├── onboarding.tsx
│   ├── gate.tsx
│   └── apps-vigiladas.tsx
├── src/
│   ├── db/                   # SQLite (schema, queries, types)
│   ├── domain/               # presupuesto, KDA, PIN, catálogo, notificaciones
│   ├── context/              # BudgetProvider
│   ├── components/
│   └── theme/
├── modules/app-gate/         # Módulo nativo Android
│   └── android/...           # AccessibilityService, GateOverlay (burbuja), GateStore
├── plugins/withAppGate.js    # Permisos overlay + QUERY_ALL_PACKAGES
├── eas.json
├── app.json
└── metro.config.js           # wasm + headers COOP/COEP (web/SQLite)
```

### Datos locales (SQLite)

- `categories` — límites mensuales  
- `expenses` — gastos (`manual` | `gate` | `emergency`)  
- `watched_apps` — apps vigiladas + categoría/tipo  
- `settings` — moneda, día de reset, setup completo  

El PIN de emergencia se guarda hasheado (SecureStore en nativo / localStorage en web).

---

## Requisitos

- Node 20+  
- Cuenta Expo (para EAS Build)  
- Android 10+ recomendado para el portero  

---

## Comandos

### Desarrollo

```bash
npm install
npx expo start
```

Web (SQLite necesita Metro con `.wasm` y headers COOP/COEP — ya en `metro.config.js`):

```bash
npx expo start --web
```

### APK para instalar con QR (recomendado)

```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```

El perfil `preview` genera **APK** (`eas.json` → `android.buildType: apk`).

Cuando termine:

```bash
npx eas-cli build:list -p android
```

Abre el build → botón **Install** (QR) o descarga el `.apk`.

**Antes de reinstalar:** desinstala la WifeApp anterior del celular.

### Build local (opcional)

```bash
npx expo prebuild --platform android
npx expo run:android
```

---

## Activar el portero en el teléfono

1. Instalar el APK.  
2. Abrir WifeApp → completar onboarding.  
3. **Ajustes del celular → Accesibilidad → WifeApp → Activar.**  
4. (Recomendado) permitir “mostrar sobre otras apps”.  
5. En onboarding / Apps vigiladas, marcar p. ej. **Pichincha Banca Móvil** (`com.yellowpepper.pichincha`) como **Banca**.  
6. Abrir esa app → debe aparecer la burbuja de tu compañero/a.

Si no aparece: **Ajustes → Apps vigiladas → Última app detectada** para ver el package real y agregarlo.

---

## Permisos Android

| Permiso | Para qué |
|---|---|
| Accesibilidad | Detectar qué app está en primer plano |
| `SYSTEM_ALERT_WINDOW` | Ayudar a traer WifeApp al frente |
| `QUERY_ALL_PACKAGES` / queries launcher | Listar apps instaladas para que el usuario elija |

---

## Notas importantes

- El portero es **genérico**: cualquier app instalada que el usuario registre puede interactuar con WifeApp.  
- Package real de Pichincha (Play Store Ecuador): `com.yellowpepper.pichincha`.  
- iOS no permite interceptar otras apps; ahí solo hay registro + avisos.  
- Los cambios de código **no llegan solos** a un APK ya instalado: hay que **volver a compilar** con EAS.

---

## Licencia

Proyecto privado (`private: true` en `package.json`).
