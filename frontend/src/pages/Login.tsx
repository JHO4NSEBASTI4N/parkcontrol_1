import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ParkingCircle,
  ShieldCheck,
} from "lucide-react";

import { useSesion } from "../contexto/SesionContext";
import { iniciarSesion } from "../services/autenticacion";

export default function Login() {
  const navegar = useNavigate();
  const { usuario, establecerSesion } = useSesion();

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function manejarIngreso(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");

    if (!correo.trim() || !contrasena) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    setCargando(true);

    try {
      const respuesta = await iniciarSesion(correo.trim(), contrasena);

      // Se actualiza el contexto ANTES de navegar: si no, las rutas
      // protegidas ven usuario = null y devuelven al login.
      establecerSesion(respuesta.usuario);

      navegar("/dashboard", { replace: true });
    } catch (errorApi: unknown) {
      const conRespuesta =
        typeof errorApi === "object" &&
        errorApi !== null &&
        "response" in errorApi;

      const detalle =
        conRespuesta &&
        typeof (errorApi as { response?: { data?: { detail?: unknown } } })
          .response?.data?.detail === "string"
          ? String(
              (errorApi as { response: { data: { detail: string } } }).response
                .data.detail
            )
          : "";

      setError(
        conRespuesta
          ? detalle ||
              "Correo o contraseña incorrectos, o cuenta desactivada."
          : "No fue posible conectar con el servidor. Verifica que FastAPI esté funcionando y que la API esté en el puerto 8000."
      );
    } finally {
      setCargando(false);
    }
  }

  // Si ya existe una sesión activa, ir directo al panel.
  if (usuario) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="login-pagina">
      <section className="login-presentacion">
        <div className="marca">
          <span className="marca-icono">
            <ParkingCircle size={30} />
          </span>
          <span>
            Park<span className="marca-azul">Control</span>
          </span>
        </div>

        <div className="presentacion-contenido">
          <span className="etiqueta">GESTIÓN INTELIGENTE</span>
          <h1>
            Tu parqueadero,
            <br />
            bajo control.
          </h1>
          <p>
            Administra vehículos, clientes, tarifas y pagos desde una sola
            plataforma.
          </p>
        </div>

        <div className="presentacion-figura" aria-hidden="true">
          <div className="figura-circulo circulo-uno" />
          <div className="figura-circulo circulo-dos" />
          <ParkingCircle className="figura-carro" size={150} strokeWidth={1} />
          <div className="figura-linea" />
        </div>

        <p className="presentacion-pie">Control eficiente. Operación segura.</p>
      </section>

      <section className="login-formulario-contenedor">
        <div className="login-formulario">
          <div className="login-icono-movil">
            <ParkingCircle size={32} />
          </div>

          <span className="bienvenida">BIENVENIDO DE NUEVO</span>
          <h2>Iniciar sesión</h2>
          <p className="subtitulo">
            Ingresa tus credenciales para acceder al sistema.
          </p>

          <form onSubmit={manejarIngreso}>
            <label htmlFor="correo">Correo electrónico</label>
            <div className="campo">
              <Mail size={19} />
              <input
                id="correo"
                type="email"
                placeholder="usuario@ejemplo.com"
                autoComplete="username"
                value={correo}
                onChange={(evento) => setCorreo(evento.target.value)}
                required
              />
            </div>

            <label htmlFor="contrasena">Contraseña</label>
            <div className="campo">
              <LockKeyhole size={19} />
              <input
                id="contrasena"
                type={mostrarContrasena ? "text" : "password"}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                value={contrasena}
                onChange={(evento) => setContrasena(evento.target.value)}
                required
              />
              <button
                className="boton-ver"
                type="button"
                aria-label={
                  mostrarContrasena
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                onClick={() => setMostrarContrasena(!mostrarContrasena)}
              >
                {mostrarContrasena ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {error && (
              <div className="mensaje-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="boton-ingresar"
              type="submit"
              disabled={cargando}
            >
              {cargando ? "Validando acceso..." : "Ingresar al sistema"}
            </button>
          </form>

          <p className="login-seguridad">
            <ShieldCheck size={17} />
            Acceso protegido para usuarios autorizados
          </p>
        </div>
      </section>
    </main>
  );
}
