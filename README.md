# ParkControl — Sistema de Gestión de Parqueadero

Aplicación web para administrar un parqueadero de **motos, bicicletas y patinetas eléctricas**.
Backend en **FastAPI + SQLAlchemy + MySQL** y frontend en **React + TypeScript + Vite**.

---

## 1. Requisitos

| Herramienta | Versión sugerida |
|---|---|
| Python | 3.11 o superior |
| Node.js | 18 o superior |
| MySQL / MariaDB | 8.0 / 10.x |

---

## 2. Puesta en marcha (backend)

### 2.1 Iniciar MySQL

**Con XAMPP (Windows):** abre el *XAMPP Control Panel* y pulsa **Start** en
**MySQL**. Eso es todo: **no necesitas ejecutar nada por consola**.

**Alternativa por consola** (si tienes `mysql` en el PATH o usas la ruta de XAMPP):

```bash
# Windows / XAMPP
C:\xampp\mysql\bin\mysql.exe -u root -p < PARKCONTROL.txt

# Linux / macOS
mysql -u root -p < PARKCONTROL.txt
```

> **La base de datos también se crea sola.** Al arrancar la API, ParkControl
> ejecuta `app/core/inicializacion.py`, que se conecta a MySQL, crea la base
> `parkcontrol` si no existe, crea las 6 tablas, el usuario administrador y las
> tarifas base. El script `PARKCONTROL.txt` solo lo necesitas si quieres armar
> la base a mano.

### 2.2 Instalar dependencias y ejecutar

```bash
# 1) (Recomendado) Crear y activar un entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate       # Linux / macOS

# 2) Instalar dependencias
pip install -r requirements.txt

# 3) Configurar variables de entorno (backend/.env)
#    DATABASE_URL, SECRET_KEY, ADMIN_CORREO, ADMIN_PASSWORD...

# 4) Ejecutar la API DESDE la carpeta backend
cd backend
uvicorn app.main:app --reload
```

Deberías ver en la consola algo como:

```
INFO:  Base de datos 'parkcontrol' verificada.
INFO:  Usuario administrador creado: admin@parkcontrol.com / Admin123*
INFO:  Tarifas base registradas: MOTO, PATINETA, BICICLETA
INFO:  Application startup complete.
```

* Documentación interactiva: <http://127.0.0.1:8000/docs>
* Al arrancar, la API ejecuta `app/core/inicializacion.py`, que:
  1. crea las tablas que falten,
  2. **crea automáticamente el usuario administrador** si no existe,
  3. registra las tarifas base (Moto $50, Patineta $40, Bicicleta $30).

### Usuarios creados automáticamente

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@parkcontrol.com` | `Admin123*` |
| Operador (datos de prueba) | `operador@parkcontrol.com` | `Operador123*` |

> Los valores del administrador se cambian en `backend/.env`
> (`ADMIN_NOMBRE`, `ADMIN_CORREO`, `ADMIN_PASSWORD`).

---

## 3. Puesta en marcha (frontend)

```bash
cd frontend
npm install
npm run dev
```

Abrir <http://localhost:5173>.

> El archivo `frontend/.env` deja `VITE_API_URL` vacío para que Vite haga
> proxy de `/api` hacia `http://127.0.0.1:8000` (configurado en `vite.config.ts`).
> En producción basta con poner la URL pública del backend en `VITE_API_URL`.

### Datos de prueba (opcional)

Con el backend encendido:

```bash
python backend/scripts/datos_prueba.py
```

Crea clientes, vehículos, movimientos, pagos y un usuario operador para que
los reportes y el dashboard tengan información.

---

## 4. Roles y módulos

### Módulo de Administrador
Acceso completo. Al iniciar sesión el sistema lo indica explícitamente en el
encabezado y en el panel:

- Dashboard
- Vehículos
- Clientes
- Movimientos
- Pagos
- **Tarifas**
- **Usuarios**
- **Reportes**

### Módulo de Operador
Solo puede trabajar con: **Vehículos, Clientes, Movimientos y Pagos**.
Los módulos de **Tarifas, Usuarios y Reportes** no aparecen habilitados:
se muestran bloqueados en el menú, sus rutas redirigen al dashboard y el
backend responde **403** si se intenta consumir la API directamente.

La restricción se aplica en tres capas:

| Capa | Archivo |
|---|---|
| Base de datos / API | `backend/app/core/dependencias.py` → `exigir_administrador`, `exigir_permiso` |
| Permisos por rol | `backend/app/core/permisos.py` |
| Rutas y menú del frontend | `frontend/src/App.tsx` → `RutaConModulo` |

---

## 5. Módulos implementados

### Dashboard
Indicadores generales (vehículos estacionados, ingresos del día, clientes,
movimientos del día), actividad reciente, resumen de la sesión y accesos
rápidos según el rol.

### Vehículos
CRUD de vehículos con cliente propietario, tipo (Moto / Bicicleta / Patineta),
búsqueda por código, placa, marca o cliente, filtros por tipo y estado,
permanencia y valor estimado en vivo, activar/desactivar.

### Clientes
Registro y edición, búsqueda por nombre o documento, activar/desactivar,
indicadores de clientes activos e inactivos.

### Movimientos
Registro de **entrada** por código o placa, registro de **salida** con cálculo
automático de minutos y valor según la tarifa vigente, búsqueda, filtros por
estado y acciones por fila.

### Pagos
Lista de movimientos finalizados **pendientes de cobro**, registro de pago con
método (Efectivo, Tarjeta, Transferencia) validando que el valor coincida con
el total calculado, e historial con búsqueda y filtros.

### Tarifas (solo administrador)
Configuración del **valor por minuto** para Moto, Bicicleta y Patineta, con
valor por hora calculado, activar/desactivar y aviso cuando falta una tarifa.

### Usuarios (solo administrador)
Creación y edición de cuentas con rol ADMIN u OPERADOR, cambio de contraseña,
activar/desactivar (no permite desactivar la propia cuenta ni quedarse sin
administradores activos).

### Reportes (solo administrador)
- **Periodos:** hoy, ayer, semanal, quincenal, mensual y rango personalizado.
- **Búsqueda y filtros:** por placa, código, cliente o documento; tipo de
  vehículo y estado del movimiento.
- **Pestañas:** movimientos, ingresos y salidas, clientes.
- **Comparativo** con el periodo anterior (variación de recaudo).
- Gráfico de recaudo diario y distribución por tipo de vehículo y método de pago.
- **Exportación a CSV** (se abre en Excel).

---

## 6. Endpoints principales

| Método | Ruta | Rol |
|---|---|---|
| POST | `/api/auth/login` | público |
| GET | `/api/auth/me` | autenticado |
| GET | `/api/dashboard/resumen` | autenticado |
| GET | `/api/dashboard/contexto` | autenticado |
| GET | `/api/dashboard/actividad` | autenticado |
| GET/POST/PUT/PATCH | `/api/vehiculos…` | autenticado |
| GET/POST/PUT/PATCH | `/api/clientes…` | autenticado |
| GET/POST/PATCH | `/api/movimientos…` | autenticado |
| GET/POST | `/api/pagos…` | autenticado |
| GET/POST/PUT/PATCH | `/api/tarifas…` | **ADMIN** |
| GET/POST/PATCH | `/api/usuarios…` | **ADMIN** |
| GET | `/api/reportes/periodo` | **ADMIN** |
| GET | `/api/reportes/consolidado` | **ADMIN** |
| GET | `/api/reportes/movimientos` | **ADMIN** |
| GET | `/api/reportes/ingresos` | **ADMIN** |
| GET | `/api/reportes/clientes` | **ADMIN** |
| GET | `/api/reportes/anual` | **ADMIN** |

Documentación completa en `/docs` (Swagger UI).

---

## 7. Estructura del proyecto

```
parkcontrol/
├── PARKCONTROL.txt            # Script SQL (base de datos y tablas)
├── requirements.txt
├── hacer.txt                  # Requerimientos del instructor
├── backend/
│   ├── .env
│   ├── scripts/
│   │   └── datos_prueba.py
│   └── app/
│       ├── main.py
│       ├── api/v1/endpoints/  # auth, dashboard, vehiculos, clientes,
│       │                      # movimientos, pagos, tarifas, usuarios, reportes
│       ├── core/              # config, seguridad, dependencias,
│       │                      # permisos, inicializacion
│       ├── database/          # base, connection
│       ├── models/            # usuarios, clientes, vehiculos, tarifas,
│       │                      # movimientos, pagos
│       ├── repositories/
│       ├── schemas/
│       ├── services/          # lógica de negocio + reportes
│       └── tests/
└── frontend/
    ├── vite.config.ts         # proxy /api → FastAPI
    └── src/
        ├── App.tsx            # rutas protegidas por rol y layout
        ├── contexto/          # SesionContext (usuario, módulo, permisos)
        ├── componentes/       # EncabezadoModulo, Indicadores, IconosTipo
        ├── pages/             # Login, Dashboard, Vehiculos, Clientes,
        │                      # Movimientos, Pagos, Tarifas, Usuarios, Reportes
        ├── services/          # api, autenticacion, dashboard, parqueaderoApi
        └── index.css
```

---

## 8. Problemas frecuentes

**`RuntimeError: Form data requires "python-multipart"`**
→ `pip install python-multipart` (ya está en `requirements.txt`).

**`"mysql" no se reconoce como un comando interno o externo`** (Windows)
→ No necesitas el comando `mysql`: basta con iniciar MySQL desde el panel de
XAMPP y arrancar la API, que crea la base de datos sola. Si quieres usarlo,
llámalo por su ruta completa:
`C:\xampp\mysql\bin\mysql.exe -u root -p < PARKCONTROL.txt`

**`ERROR: Invalid requirement` en `requirements.txt`**
→ Ya corregido en el repositorio. Si lo tenías descargado, vuelve a bajar el
archivo `requirements.txt` (o `git pull`).

**`Can't connect to MySQL server`**
→ Verifica que MySQL esté iniciado (XAMPP → Start MySQL) y que `DATABASE_URL`
en `backend/.env` tenga el usuario y la contraseña correctos. Por defecto en
XAMPP es `mysql+pymysql://root:@localhost:3306/parkcontrol` (sin contraseña).

**`AttributeError: database_url`**
→ Ya corregido: la configuración ahora carga el `.env` con ruta absoluta
(`app/core/config.py`).

**El frontend muestra "No fue posible conectar con FastAPI"**
→ Revisa que la API esté en el puerto 8000 y que `vite.config.ts` apunte a
esa dirección.
