import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  BarChart3,
  CarFront,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  ParkingCircle,
  ShieldCheck,
  Tags,
  Users,
  X,
} from "lucide-react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Vehiculos from "./pages/Vehiculos";
import Clientes from "./pages/Clientes";
import Movimientos from "./pages/Movimientos";
import Pagos from "./pages/Pagos";
import Tarifas from "./pages/Tarifas";
import Usuarios from "./pages/Usuarios";
import Reportes from "./pages/Reportes";

import { ProveedorSesion, useSesion } from "./contexto/SesionContext";
import { tieneToken } from "./services/autenticacion";
import "./index.css";

interface OpcionMenu {
  nombre: string;
  ruta: string;
  modulo: string;
  Icono: typeof LayoutDashboard;
  soloAdmin?: boolean;
}

const opcionesMenu: OpcionMenu[] = [
  { nombre: "Dashboard", ruta: "/dashboard", modulo: "dashboard", Icono: LayoutDashboard },
  { nombre: "Vehículos", ruta: "/vehiculos", modulo: "vehiculos", Icono: CarFront },
  { nombre: "Clientes", ruta: "/clientes", modulo: "clientes", Icono: Users },
  { nombre: "Movimientos", ruta: "/movimientos", modulo: "movimientos", Icono: ClipboardList },
  { nombre: "Pagos", ruta: "/pagos", modulo: "pagos", Icono: CreditCard },
  { nombre: "Tarifas", ruta: "/tarifas", modulo: "tarifas", Icono: Tags, soloAdmin: true },
  { nombre: "Usuarios", ruta: "/usuarios", modulo: "usuarios", Icono: ShieldCheck, soloAdmin: true },
  { nombre: "Reportes", ruta: "/reportes", modulo: "reportes", Icono: BarChart3, soloAdmin: true },
];

const NOMBRE_MODULO: Record<string, string> = {
  dashboard: "Dashboard",
  vehiculos: "Vehículos",
  clientes: "Clientes",
  movimientos: "Movimientos",
  pagos: "Pagos",
  tarifas: "Tarifas",
  usuarios: "Usuarios",
  reportes: "Reportes",
};

/* =========================================================
   PANTALLA DE CARGA
========================================================= */

function PantallaCargando() {
  return (
    <div className="pc-pantalla-carga">
      <span className="pc-spinner pc-spinner-grande" />
      <p>Validando sesión en ParkControl…</p>
    </div>
  );
}

/* =========================================================
   PROTECCIÓN DE RUTAS
========================================================= */

function RutaProtegida() {
  const { usuario, cargando } = useSesion();

  if (cargando && !usuario) return <PantallaCargando />;

  if (!tieneToken() || !usuario) return <Navigate to="/" replace />;

  return <Outlet />;
}

function RutaConModulo({ modulo }: { modulo: string }) {
  const { usuario, cargando, puedeVer } = useSesion();

  if (cargando && !usuario) return <PantallaCargando />;

  if (!puedeVer(modulo)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/* =========================================================
   DISPOSICIÓN PRINCIPAL (SIDEBAR + CONTENIDO)
========================================================= */

function DisposicionPanel() {
  const { usuario, esAdministrador, salir } = useSesion();
  const [menuMovil, setMenuMovil] = useState(false);
  const ubicacion = useLocation();
  const navegar = useNavigate();

  useEffect(() => {
    setMenuMovil(false);
  }, [ubicacion.pathname]);

  const visibles = opcionesMenu.filter((opcion) =>
    usuario ? usuario.modulos.includes(opcion.modulo) : false
  );

  const moduloActual =
    opcionesMenu.find((opcion) =>
      ubicacion.pathname.startsWith(opcion.ruta)
    )?.modulo ?? "dashboard";

  const restringidos = opcionesMenu.filter(
    (opcion) => usuario && !usuario.modulos.includes(opcion.modulo)
  );

  return (
    <div className="pc-layout">
      {menuMovil && (
        <button
          className="pc-fondo-movil"
          aria-label="Cerrar menú"
          onClick={() => setMenuMovil(false)}
        />
      )}

      <aside className={`pc-sidebar ${menuMovil ? "pc-sidebar-abierto" : ""}`}>
        <div className="pc-marca">
          <span className="pc-marca-icono">
            <ParkingCircle size={29} />
          </span>

          <span>
            Park<span>Control</span>
          </span>

          <button
            className="pc-cerrar-menu"
            onClick={() => setMenuMovil(false)}
            aria-label="Cerrar menú"
          >
            <X size={22} />
          </button>
        </div>

        <div
          className={`pc-identidad-rol ${
            esAdministrador ? "pc-identidad-admin" : "pc-identidad-operador"
          }`}
        >
          <span className="pc-identidad-avatar">
            {usuario?.nombre?.charAt(0).toUpperCase() ?? "P"}
          </span>

          <div>
            <strong>{usuario?.nombre ?? "Usuario"}</strong>
            <span>{usuario?.modulo ?? "Módulo"}</span>
          </div>
        </div>

        <p className="pc-menu-titulo">MENÚ PRINCIPAL</p>

        <nav className="pc-nav">
          {visibles.map(({ nombre, ruta, Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              end
              className={({ isActive }) =>
                `pc-nav-enlace ${isActive ? "pc-nav-activo" : ""}`
              }
              onClick={() => setMenuMovil(false)}
            >
              <Icono size={19} />
              <span>{nombre}</span>
            </NavLink>
          ))}
        </nav>

        {restringidos.length > 0 && (
          <div className="pc-nav-restringido">
            <p>
              <Lock size={11} />
              Bloqueado para tu rol
            </p>

            {restringidos.map(({ nombre, Icono }) => (
              <span key={nombre} className="pc-nav-bloqueado">
                <Icono size={16} />
                {nombre}
              </span>
            ))}
          </div>
        )}

        <div className="pc-sidebar-pie">
          <div className="pc-seguridad">
            <ShieldCheck size={20} />

            <div>
              <strong>Acceso seguro</strong>
              <span>
                {esAdministrador ? "Rol administrador" : "Rol operador"}
              </span>
            </div>
          </div>

          <button className="pc-boton-salir" onClick={salir}>
            <LogOut size={19} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="pc-contenido">
        <button
          className="pc-menu-movil"
          onClick={() => setMenuMovil(true)}
          aria-label="Abrir menú"
        >
          <Menu size={23} />
        </button>

        <div
          className={`pc-banner-modulo ${
            esAdministrador ? "pc-banner-admin" : "pc-banner-operador"
          }`}
        >
          <span className="pc-banner-icono">
            <ShieldCheck size={17} />
          </span>

          <div>
            <strong>
              {esAdministrador
                ? "Estás en el Módulo de Administrador"
                : "Estás en el Módulo de Operador"}
            </strong>

            <span>
              {esAdministrador
                ? "Acceso completo: vehículos, clientes, movimientos, pagos, tarifas, usuarios y reportes."
                : "Acceso a vehículos, clientes, movimientos y pagos. Tarifas, usuarios y reportes están reservados para el administrador."}
            </span>
          </div>

          <button
            type="button"
            className="pc-banner-ir"
            onClick={() => navegar(`/${moduloActual}`)}
          >
            {NOMBRE_MODULO[moduloActual] ?? "Panel"}
          </button>
        </div>

        <Outlet />
      </main>
    </div>
  );
}

/* =========================================================
   APLICACIÓN
========================================================= */

function Rutas() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<RutaProtegida />}>
        <Route element={<DisposicionPanel />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route element={<RutaConModulo modulo="vehiculos" />}>
            <Route path="/vehiculos" element={<Vehiculos />} />
          </Route>

          <Route element={<RutaConModulo modulo="clientes" />}>
            <Route path="/clientes" element={<Clientes />} />
          </Route>

          <Route element={<RutaConModulo modulo="movimientos" />}>
            <Route path="/movimientos" element={<Movimientos />} />
          </Route>

          <Route element={<RutaConModulo modulo="pagos" />}>
            <Route path="/pagos" element={<Pagos />} />
          </Route>

          <Route element={<RutaConModulo modulo="tarifas" />}>
            <Route path="/tarifas" element={<Tarifas />} />
          </Route>

          <Route element={<RutaConModulo modulo="usuarios" />}>
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>

          <Route element={<RutaConModulo modulo="reportes" />}>
            <Route path="/reportes" element={<Reportes />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ProveedorSesion>
        <Rutas />
      </ProveedorSesion>
    </BrowserRouter>
  );
}
