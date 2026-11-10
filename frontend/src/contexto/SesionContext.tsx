import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useNavigate } from "react-router-dom";

import { CLAVE_USUARIO } from "../services/api";
import {
  cerrarSesion as limpiarSesion,
  obtenerSesion,
  tieneToken,
  usuarioGuardado,
  type UsuarioSesion,
} from "../services/autenticacion";

interface ValorSesion {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  error: string;
  esAdministrador: boolean;
  puedeVer: (modulo: string) => boolean;
  recargar: () => Promise<void>;
  establecerSesion: (usuario: UsuarioSesion) => void;
  salir: () => void;
}

const SesionContext = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const navegar = useNavigate();

  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() =>
    usuarioGuardado()
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    if (!tieneToken()) {
      setUsuario(null);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError("");

    try {
      const sesion = await obtenerSesion();
      setUsuario(sesion);
    } catch {
      // Si falla la validación del token, se limpia la sesión local.
      limpiarSesion();
      setUsuario(null);
      setError("Tu sesión expiró. Inicia sesión nuevamente.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Guarda en el contexto el usuario que acaba de iniciar sesión.
   * Es indispensable: sin esto el contexto se queda con usuario = null
   * y las rutas protegidas devuelven al login aunque el token exista.
   */
  const establecerSesion = useCallback((nuevo: UsuarioSesion) => {
    sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(nuevo));
    setUsuario(nuevo);
    setCargando(false);
    setError("");
  }, []);

  const salir = useCallback(() => {
    limpiarSesion();
    setUsuario(null);
    navegar("/", { replace: true });
  }, [navegar]);

  const valor = useMemo<ValorSesion>(
    () => ({
      usuario,
      cargando,
      error,
      esAdministrador: usuario?.rol === "ADMIN",
      puedeVer: (modulo: string) => Boolean(usuario?.modulos.includes(modulo)),
      recargar: cargar,
      establecerSesion,
      salir,
    }),
    [usuario, cargando, error, cargar, establecerSesion, salir]
  );

  return (
    <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
  );
}

export function useSesion(): ValorSesion {
  const contexto = useContext(SesionContext);

  if (!contexto) {
    throw new Error("useSesion debe usarse dentro de <ProveedorSesion>");
  }

  return contexto;
}
