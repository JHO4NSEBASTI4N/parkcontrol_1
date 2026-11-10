import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  CircleCheck,
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";

import EncabezadoModulo from "../componentes/EncabezadoModulo";
import {
  Aviso,
  BarraListado,
  EtiquetaEstado,
  FilaIndicadores,
  Indicador,
  TablaCargando,
  TablaVacia,
} from "../componentes/Indicadores";
import { useSesion } from "../contexto/SesionContext";
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  crearUsuario,
  listarUsuarios,
} from "../services/parqueaderoApi";
import {
  formatoFecha,
  mensajeError,
  type Usuario,
} from "../services/parqueadero";

type FiltroRol = "TODOS" | "ADMIN" | "OPERADOR";

interface FormularioUsuario {
  nombre: string;
  correo: string;
  rol: "ADMIN" | "OPERADOR";
  password: string;
  confirmar: string;
}

const formularioInicial: FormularioUsuario = {
  nombre: "",
  correo: "",
  rol: "OPERADOR",
  password: "",
  confirmar: "",
};

export default function Usuarios() {
  const { usuario: sesion } = useSesion();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<FiltroRol>("TODOS");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioUsuario>(formularioInicial);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      setUsuarios(await listarUsuarios());
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resumen = useMemo(
    () => ({
      total: usuarios.length,
      admins: usuarios.filter((item) => item.rol === "ADMIN").length,
      operadores: usuarios.filter((item) => item.rol === "OPERADOR").length,
      activos: usuarios.filter((item) => item.estado).length,
      inactivos: usuarios.filter((item) => !item.estado).length,
    }),
    [usuarios]
  );

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const coincideTexto =
        !termino ||
        [usuario.nombre, usuario.correo, usuario.rol, String(usuario.id)].some(
          (valor) => valor.toLowerCase().includes(termino)
        );

      const coincideRol = filtroRol === "TODOS" || usuario.rol === filtroRol;

      return coincideTexto && coincideRol;
    });
  }, [usuarios, busqueda, filtroRol]);

  function abrirRegistro() {
    setError("");
    setMensaje("");
    setUsuarioEditar(null);
    setFormulario(formularioInicial);
    setModalAbierto(true);
  }

  function abrirEdicion(usuario: Usuario) {
    setError("");
    setMensaje("");
    setUsuarioEditar(usuario);
    setFormulario({
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      password: "",
      confirmar: "",
    });
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;
    setModalAbierto(false);
    setUsuarioEditar(null);
    setFormulario(formularioInicial);
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");

    if (!formulario.nombre.trim() || !formulario.correo.trim()) {
      setError("El nombre y el correo son obligatorios.");
      return;
    }

    if (!usuarioEditar && formulario.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (formulario.password && formulario.password !== formulario.confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);

    try {
      if (usuarioEditar) {
        await actualizarUsuario(usuarioEditar.id, {
          nombre: formulario.nombre.trim(),
          correo: formulario.correo.trim(),
          rol: formulario.rol,
          ...(formulario.password ? { password: formulario.password } : {}),
        });

        setMensaje(`Usuario ${formulario.nombre} actualizado correctamente.`);
      } else {
        await crearUsuario({
          nombre: formulario.nombre.trim(),
          correo: formulario.correo.trim(),
          rol: formulario.rol,
          password: formulario.password,
        });

        setMensaje(
          `Usuario ${formulario.nombre} creado con rol ${formulario.rol}.`
        );
      }

      setModalAbierto(false);
      setUsuarioEditar(null);
      setFormulario(formularioInicial);

      await cargar();
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(usuario: Usuario) {
    const accion = usuario.estado ? "desactivar" : "activar";

    if (
      !window.confirm(
        `¿Deseas ${accion} la cuenta de ${usuario.nombre} (${usuario.rol})?`
      )
    ) {
      return;
    }

    setError("");
    setMensaje("");

    try {
      await cambiarEstadoUsuario(usuario.id, !usuario.estado);
      setMensaje(
        `La cuenta de ${usuario.nombre} fue ${
          usuario.estado ? "desactivada" : "activada"
        }.`
      );
      await cargar();
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    }
  }

  return (
    <section className="pc-modulo pc-vehiculos">
      <EncabezadoModulo
        seccion="Seguridad"
        titulo="Gestión de usuarios"
        descripcion="Administra las cuentas de administrador y operador del sistema."
        accion={
          <button
            className="pc-accion-principal pc-boton-registrar"
            onClick={abrirRegistro}
          >
            <Plus size={19} />
            <span>Registrar usuario</span>
          </button>
        }
      />

      {error && <Aviso tipo="error" mensaje={error} onCerrar={() => setError("")} />}
      {mensaje && (
        <Aviso tipo="exito" mensaje={mensaje} onCerrar={() => setMensaje("")} />
      )}

      <FilaIndicadores>
        <Indicador
          etiqueta="Total de usuarios"
          valor={resumen.total}
          descripcion="Cuentas registradas"
          icono={Users}
          cargando={cargando}
        />

        <Indicador
          etiqueta="Administradores"
          valor={resumen.admins}
          descripcion="Acceso completo al sistema"
          icono={ShieldCheck}
          tono="morado"
          cargando={cargando}
        />

        <Indicador
          etiqueta="Operadores"
          valor={resumen.operadores}
          descripcion="Acceso operativo limitado"
          icono={Wrench}
          tono="ambar"
          cargando={cargando}
        />

        <Indicador
          etiqueta="Cuentas activas"
          valor={resumen.activos}
          descripcion={`${resumen.inactivos} desactivadas`}
          icono={CircleCheck}
          tono="verde"
          cargando={cargando}
        />
      </FilaIndicadores>

      <div className="pc-alerta-info">
        <ShieldCheck size={18} />
        <p>
          <strong>Roles del sistema:</strong> el administrador gestiona todos los
          módulos (tarifas, usuarios y reportes incluidos). El operador solo
          accede a vehículos, clientes, movimientos y pagos.
        </p>
      </div>

      <section className="pc-vehiculos-listado">
        <BarraListado
          Icono={Users}
          titulo="Listado de usuarios"
          descripcion="Consulta y administra las cuentas de acceso."
        >
          <label className="pc-busqueda-vehiculos">
            <Search size={16} />
            <input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar nombre o correo…"
            />
            {busqueda && (
              <button
                type="button"
                className="pc-limpiar-busqueda"
                onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </label>

          <label className="pc-filtro-estado">
            <SlidersHorizontal size={15} />
            <select
              value={filtroRol}
              onChange={(evento) =>
                setFiltroRol(evento.target.value as FiltroRol)
              }
            >
              <option value="TODOS">Todos los roles</option>
              <option value="ADMIN">Administradores</option>
              <option value="OPERADOR">Operadores</option>
            </select>
          </label>

          <button
            type="button"
            className="pc-boton-secundario pc-boton-actualizar"
            onClick={() => void cargar()}
            title="Actualizar listado"
          >
            <RefreshCw size={16} className={cargando ? "pc-girando" : ""} />
          </button>
        </BarraListado>

        <div className="pc-listado-contexto">
          <span>
            <span className="pc-punto-contexto" />
            {filtrados.length} resultados
          </span>

          <span className="pc-listado-contexto-secundario">
            <UserCog size={13} /> Control de acceso al sistema
          </span>
        </div>

        {cargando ? (
          <TablaCargando mensaje="Consultando los usuarios del sistema…" />
        ) : filtrados.length === 0 ? (
          <TablaVacia
            titulo="Sin usuarios para mostrar"
            mensaje="No se encontraron cuentas con los filtros aplicados."
            Icono={Users}
            accion={
              <button
                className="pc-boton-secundario"
                onClick={() => {
                  setBusqueda("");
                  setFiltroRol("TODOS");
                }}
              >
                Limpiar filtros
              </button>
            }
          />
        ) : (
          <div className="pc-tabla-scroll">
            <table className="pc-tabla-vehiculos">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Acceso</th>
                  <th>Fecha de registro</th>
                  <th>Estado</th>
                  <th className="pc-columna-acciones">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>
                      <div className="pc-vehiculo-identidad">
                        <span
                          className={`pc-vehiculo-icono ${
                            usuario.rol === "ADMIN"
                              ? "pc-icono-tipo-patineta"
                              : ""
                          }`}
                        >
                          {usuario.rol === "ADMIN" ? (
                            <ShieldCheck size={21} />
                          ) : (
                            <Wrench size={21} />
                          )}
                        </span>

                        <div className="pc-vehiculo-datos">
                          <strong>{usuario.nombre}</strong>
                          <small>Usuario #{usuario.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>{usuario.correo}</td>

                    <td>
                      <span
                        className={`pc-rol-chip ${
                          usuario.rol === "ADMIN"
                            ? "pc-rol-admin"
                            : "pc-rol-operador"
                        }`}
                      >
                        {usuario.rol}
                      </span>
                    </td>

                    <td>
                      <span className="pc-texto-tenue">
                        {usuario.rol === "ADMIN"
                          ? "Todos los módulos"
                          : "Vehículos · Clientes · Movimientos · Pagos"}
                      </span>
                    </td>

                    <td>{formatoFecha(usuario.fecha_creacion)}</td>

                    <td>
                      <EtiquetaEstado activo={usuario.estado} />
                    </td>

                    <td>
                      <div className="pc-acciones-registro">
                        <button
                          type="button"
                          className="pc-accion-tabla pc-accion-editar"
                          title="Editar usuario"
                          onClick={() => abrirEdicion(usuario)}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          className="pc-accion-tabla pc-accion-desactivar"
                          title={
                            usuario.estado ? "Desactivar usuario" : "Activar usuario"
                          }
                          disabled={usuario.id === sesion?.id}
                          style={
                            usuario.id === sesion?.id
                              ? { opacity: 0.4, cursor: "not-allowed" }
                              : undefined
                          }
                          onClick={() => void alternarEstado(usuario)}
                        >
                          <Power size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="pc-tabla-pie pc-vehiculos-pie">
          <span>
            Mostrando <strong>{filtrados.length}</strong> de{" "}
            <strong>{usuarios.length}</strong> usuarios
          </span>

          <span>
            <CircleCheck size={15} />
            Datos de ParkControl
          </span>
        </footer>
      </section>

      {modalAbierto && (
        <div
          className="pc-modal-fondo pc-modal-vehiculos-fondo"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) cerrarModal();
          }}
        >
          <section
            className="pc-modal pc-modal-vehiculos pc-modal-compacto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-usuario"
          >
            <header className="pc-modal-encabezado pc-modal-vehiculos-header">
              <div className="pc-modal-titulo-grupo">
                <span className="pc-modal-icono">
                  <UserPlus size={24} />
                </span>

                <div>
                  <span className="pc-migas">SEGURIDAD DEL SISTEMA</span>
                  <h2 id="titulo-modal-usuario">
                    {usuarioEditar ? "Editar usuario" : "Registrar usuario"}
                  </h2>
                  <p>
                    {usuarioEditar
                      ? "Actualiza los datos y el rol de la cuenta."
                      : "Crea una cuenta de administrador u operador."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="pc-boton-cerrar-modal"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar formulario"
              >
                <X size={21} />
              </button>
            </header>

            <form onSubmit={guardar}>
              <div className="pc-formulario-contenido">
                <div className="pc-formulario-grid">
                  <label className="pc-campo-completo">
                    Nombre completo <span>*</span>
                    <input
                      value={formulario.nombre}
                      onChange={(evento) =>
                        setFormulario((actual) => ({
                          ...actual,
                          nombre: evento.target.value,
                        }))
                      }
                      maxLength={100}
                      required
                      placeholder="Nombre y apellidos"
                    />
                  </label>

                  <label>
                    Correo electrónico <span>*</span>
                    <input
                      type="email"
                      value={formulario.correo}
                      onChange={(evento) =>
                        setFormulario((actual) => ({
                          ...actual,
                          correo: evento.target.value,
                        }))
                      }
                      maxLength={100}
                      required
                      placeholder="usuario@parkcontrol.com"
                    />
                  </label>

                  <label>
                    Rol <span>*</span>
                    <select
                      value={formulario.rol}
                      onChange={(evento) =>
                        setFormulario((actual) => ({
                          ...actual,
                          rol: evento.target.value as "ADMIN" | "OPERADOR",
                        }))
                      }
                      required
                    >
                      <option value="OPERADOR">Operador</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </label>

                  <label>
                    {usuarioEditar ? "Nueva contraseña" : "Contraseña"}{" "}
                    {!usuarioEditar && <span>*</span>}
                    <input
                      type="password"
                      value={formulario.password}
                      onChange={(evento) =>
                        setFormulario((actual) => ({
                          ...actual,
                          password: evento.target.value,
                        }))
                      }
                      minLength={8}
                      maxLength={100}
                      required={!usuarioEditar}
                      placeholder={
                        usuarioEditar
                          ? "Dejar vacío para conservarla"
                          : "Mínimo 8 caracteres"
                      }
                    />
                  </label>

                  <label>
                    Confirmar contraseña {usuarioEditar ? "" : <span>*</span>}
                    <input
                      type="password"
                      value={formulario.confirmar}
                      onChange={(evento) =>
                        setFormulario((actual) => ({
                          ...actual,
                          confirmar: evento.target.value,
                        }))
                      }
                      minLength={8}
                      maxLength={100}
                      required={!usuarioEditar && Boolean(formulario.password)}
                      placeholder="Repite la contraseña"
                    />
                  </label>
                </div>

                <div className="pc-ayuda-formulario pc-ayuda-vehiculos">
                  <KeyRound size={18} />
                  <p>
                    {formulario.rol === "ADMIN"
                      ? "El administrador tiene acceso a todos los módulos: tarifas, usuarios y reportes incluidos."
                      : "El operador solo accede a vehículos, clientes, movimientos y pagos."}
                  </p>
                </div>
              </div>

              <footer className="pc-modal-acciones pc-modal-vehiculos-acciones">
                <button
                  type="button"
                  className="pc-boton-secundario"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="pc-accion-principal"
                  disabled={guardando}
                >
                  {guardando ? (
                    <>
                      <LoaderCircle size={18} className="pc-icono-girando" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      {usuarioEditar ? <Pencil size={18} /> : <UserPlus size={18} />}
                      {usuarioEditar ? "Guardar cambios" : "Registrar usuario"}
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      <footer className="pc-footer">
        <span>
          <ShieldCheck size={12} /> Módulo exclusivo del administrador.
        </span>
        <span>
          <Users size={12} /> No es posible desactivar tu propia cuenta.
        </span>
      </footer>
    </section>
  );
}
