import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  X,
  Pencil,
  Power,
  CircleCheck,
  CircleX,
  SlidersHorizontal,
  Mail,
  Phone,
  LoaderCircle,
  UserRound,
} from "lucide-react";
import axios from "axios";
import api from "../services/api";

interface Cliente {
  id: number;
  nombre: string;
  documento: string;
  telefono: string | null;
  correo: string | null;
  fecha_registro: string;
  estado: boolean;
}

interface ClienteFormulario {
  nombre: string;
  documento: string;
  telefono: string;
  correo: string;
}

type FiltroEstado = "TODOS" | "ACTIVOS" | "INACTIVOS";

const formularioInicial: ClienteFormulario = {
  nombre: "",
  documento: "",
  telefono: "",
  correo: "",
};

function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detalle = error.response?.data?.detail;

    if (typeof detalle === "string") {
      return detalle;
    }

    if (error.response?.status === 401) {
      return "Tu sesión ha expirado o no es válida. Inicia sesión nuevamente.";
    }

    if (error.response?.status === 403) {
      return "No tienes permisos para realizar esta operación.";
    }

    if (error.response?.status === 409) {
      return "Ya existe un cliente con ese documento.";
    }

    if (error.response?.status === 422) {
      return "Verifica los datos ingresados, especialmente el correo electrónico.";
    }

    if (!error.response) {
      return "No fue posible conectar con FastAPI. Verifica que el backend esté iniciado.";
    }
  }

  return "Ocurrió un error inesperado.";
}

function fechaFormateada(fecha: string): string {
  if (!fecha) return "-";
  const fechaValida = new Date(fecha);

  if (Number.isNaN(fechaValida.getTime())) {
    return fecha;
  }

  return fechaValida.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODOS");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEditar, setClienteEditar] = useState<Cliente | null>(null);
  const [formulario, setFormulario] =
    useState<ClienteFormulario>(formularioInicial);

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const respuesta = await api.get<Cliente[]>("/api/clientes");
      setClientes(respuesta.data);
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarClientes();
  }, [cargarClientes]);

  const resumen = useMemo(() => {
    return {
      total: clientes.length,
      activos: clientes.filter((cliente) => cliente.estado).length,
      inactivos: clientes.filter((cliente) => !cliente.estado).length,
      conCorreo: clientes.filter((cliente) => Boolean(cliente.correo)).length,
    };
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return clientes.filter((cliente) => {
      const coincideBusqueda = [
        cliente.nombre,
        cliente.documento,
        cliente.telefono ?? "",
        cliente.correo ?? "",
        String(cliente.id),
      ].some((valor) => valor.toLowerCase().includes(termino));

      const coincideEstado =
        filtroEstado === "TODOS" ||
        (filtroEstado === "ACTIVOS" && cliente.estado) ||
        (filtroEstado === "INACTIVOS" && !cliente.estado);

      return coincideBusqueda && coincideEstado;
    });
  }, [clientes, busqueda, filtroEstado]);

  function cambiarCampo(campo: keyof ClienteFormulario, valor: string) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function abrirRegistro() {
    setError("");
    setMensaje("");
    setClienteEditar(null);
    setFormulario(formularioInicial);
    setModalAbierto(true);
  }

  function abrirEdicion(cliente: Cliente) {
    setError("");
    setMensaje("");
    setClienteEditar(cliente);

    setFormulario({
      nombre: cliente.nombre,
      documento: cliente.documento,
      telefono: cliente.telefono ?? "",
      correo: cliente.correo ?? "",
    });

    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);
    setClienteEditar(null);
    setFormulario(formularioInicial);
  }

  async function guardarCliente(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");

    if (!formulario.nombre.trim() || !formulario.documento.trim()) {
      setError("El nombre y el documento son obligatorios.");
      return;
    }

    if (
      formulario.correo.trim() &&
      !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(formulario.correo.trim())
    ) {
      setError("Ingresa una dirección de correo electrónico válida.");
      return;
    }

    setGuardando(true);

    const datos = {
      nombre: formulario.nombre.trim(),
      documento: formulario.documento.trim(),
      telefono: formulario.telefono.trim() ? formulario.telefono.trim() : null,
      correo: formulario.correo.trim() ? formulario.correo.trim() : null,
    };

    try {
      if (clienteEditar) {
        await api.put(`/api/clientes/${clienteEditar.id}`, datos);
        setMensaje("Cliente actualizado correctamente.");
      } else {
        await api.post("/api/clientes", datos);
        setMensaje("Cliente registrado correctamente.");
      }

      setModalAbierto(false);
      setClienteEditar(null);
      setFormulario(formularioInicial);

      await cargarClientes();
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(cliente: Cliente) {
    const accion = cliente.estado ? "desactivar" : "activar";

    const confirmado = window.confirm(
      `¿Deseas ${accion} al cliente ${cliente.nombre}?`
    );

    if (!confirmado) return;

    setError("");
    setMensaje("");

    try {
      if (cliente.estado) {
        await api.patch(`/api/clientes/${cliente.id}/desactivar`);
      } else {
        await api.patch(`/api/clientes/${cliente.id}/activar`);
      }

      setMensaje(
        `El cliente ${cliente.nombre} fue ${
          cliente.estado ? "desactivado" : "activado"
        } correctamente.`
      );

      await cargarClientes();
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    }
  }

  return (
    <section className="pc-modulo pc-vehiculos">
      <header className="pc-modulo-encabezado pc-vehiculos-encabezado">
        <div className="pc-encabezado-texto">
          <div className="pc-migas">
            <span>ParkControl</span>
            <span className="pc-migas-separador">/</span>
            <span>Gestión</span>
            <span className="pc-migas-separador">/</span>
            <span>Clientes</span>
          </div>

          <h1>Gestión de clientes</h1>

          <p>
            Administra la información y el estado de los clientes del
            parqueadero.
          </p>
        </div>

        <button
          type="button"
          className="pc-accion-principal pc-boton-registrar"
          onClick={abrirRegistro}
        >
          <Plus size={19} />
          <span>Registrar cliente</span>
        </button>
      </header>

      {error && (
        <div className="pc-aviso pc-aviso-error" role="alert">
          <CircleX size={20} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Cerrar aviso de error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {mensaje && (
        <div className="pc-aviso pc-aviso-exito" role="status">
          <CircleCheck size={20} />
          <span>{mensaje}</span>
          <button
            type="button"
            onClick={() => setMensaje("")}
            aria-label="Cerrar aviso de éxito"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="pc-vehiculos-resumen">
        <article className="pc-indicador-vehiculo pc-indicador-total">
          <div className="pc-indicador-superior">
            <span className="pc-indicador-etiqueta">Total de clientes</span>
            <span className="pc-indicador-icono">
              <Users size={22} />
            </span>
          </div>

          <div className="pc-indicador-inferior">
            <strong>{cargando ? "-" : resumen.total}</strong>
            <span className="pc-indicador-descripcion">
              Clientes registrados
            </span>
          </div>
        </article>

        <article className="pc-indicador-vehiculo pc-indicador-activos">
          <div className="pc-indicador-superior">
            <span className="pc-indicador-etiqueta">Clientes activos</span>
            <span className="pc-indicador-icono">
              <CircleCheck size={22} />
            </span>
          </div>

          <div className="pc-indicador-inferior">
            <strong>{cargando ? "-" : resumen.activos}</strong>
            <span className="pc-indicador-descripcion">
              Clientes habilitados
            </span>
          </div>
        </article>

        <article className="pc-indicador-vehiculo pc-indicador-inactivos">
          <div className="pc-indicador-superior">
            <span className="pc-indicador-etiqueta">Clientes inactivos</span>
            <span className="pc-indicador-icono">
              <Power size={22} />
            </span>
          </div>

          <div className="pc-indicador-inferior">
            <strong>{cargando ? "-" : resumen.inactivos}</strong>
            <span className="pc-indicador-descripcion">
              Clientes desactivados
            </span>
          </div>
        </article>

        <article className="pc-indicador-vehiculo pc-indicador-tipos">
          <div className="pc-indicador-superior">
            <span className="pc-indicador-etiqueta">
              Con correo electrónico
            </span>
            <span className="pc-indicador-icono">
              <Mail size={22} />
            </span>
          </div>

          <div className="pc-indicador-inferior">
            <strong>{cargando ? "-" : resumen.conCorreo}</strong>
            <span className="pc-indicador-descripcion">
              Clientes con correo registrado
            </span>
          </div>
        </article>
      </div>

      <section className="pc-tabla-contenedor pc-vehiculos-listado">
        <header className="pc-vehiculos-toolbar">
          <div className="pc-tabla-titulo">
            <div className="pc-tabla-titulo-icono">
              <Users size={22} />
            </div>

            <div>
              <h2>Listado de clientes</h2>
              <p>Consulta, busca y administra los registros.</p>
            </div>
          </div>

          <div className="pc-vehiculos-controles">
            <label className="pc-busqueda-vehiculos">
              <Search size={19} />

              <input
                type="search"
                placeholder="Buscar nombre, documento..."
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                aria-label="Buscar clientes"
              />

              {busqueda && (
                <button
                  type="button"
                  className="pc-limpiar-busqueda"
                  onClick={() => setBusqueda("")}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </label>

            <label className="pc-filtro-estado">
              <SlidersHorizontal size={17} />

              <select
                value={filtroEstado}
                onChange={(evento) =>
                  setFiltroEstado(evento.target.value as FiltroEstado)
                }
                aria-label="Filtrar clientes por estado"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVOS">Solo activos</option>
                <option value="INACTIVOS">Solo inactivos</option>
              </select>
            </label>

            <button
              type="button"
              className="pc-boton-secundario pc-boton-actualizar"
              onClick={() => void cargarClientes()}
              disabled={cargando}
              aria-label="Actualizar listado"
              title="Actualizar listado"
            >
              <RefreshCw
                size={18}
                className={cargando ? "pc-girando" : ""}
              />
            </button>
          </div>
        </header>

        <div className="pc-listado-contexto">
          <span>
            <span className="pc-punto-contexto" />
            {cargando
              ? "Consultando información..."
              : `${clientesFiltrados.length} resultados`}
          </span>
          <span className="pc-listado-contexto-secundario">
            <Users size={15} />
            Directorio de clientes
          </span>
        </div>

        {cargando ? (
          <div className="pc-tabla-vacia pc-estado-cargando">
            <LoaderCircle size={32} className="pc-girando" />
            <strong>Cargando clientes</strong>
            <span>Estamos consultando los registros del parqueadero.</span>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="pc-tabla-vacia pc-estado-vacio">
            <div className="pc-vacio-icono">
              {busqueda || filtroEstado !== "TODOS" ? (
                <Search size={34} />
              ) : (
                <Users size={36} />
              )}
            </div>

            <strong>
              {busqueda || filtroEstado !== "TODOS"
                ? "No encontramos resultados"
                : "Aún no hay clientes registrados"}
            </strong>

            <span>
              {busqueda || filtroEstado !== "TODOS"
                ? "Prueba otros términos o cambia el filtro."
                : "Registra el primer cliente para comenzar a gestionar el directorio."}
            </span>

            {!busqueda && filtroEstado === "TODOS" && (
              <button
                type="button"
                className="pc-accion-principal"
                onClick={abrirRegistro}
              >
                <Plus size={18} />
                Registrar primer cliente
              </button>
            )}

            {(busqueda || filtroEstado !== "TODOS") && (
              <button
                type="button"
                className="pc-boton-secundario"
                onClick={() => {
                  setBusqueda("");
                  setFiltroEstado("TODOS");
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="pc-tabla-scroll">
            <table className="pc-tabla pc-tabla-vehiculos">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Fecha de registro</th>
                  <th>Estado</th>
                  <th className="pc-columna-acciones">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>
                      <div className="pc-vehiculo-identidad">
                        <span className="pc-vehiculo-icono pc-icono-cliente">
                          <UserRound size={21} />
                        </span>

                        <div className="pc-vehiculo-datos">
                          <strong>{cliente.nombre}</strong>
                          <small>Cliente #{cliente.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="pc-placa-vehiculo">
                        {cliente.documento}
                      </span>
                    </td>

                    <td>
                      <div className="pc-cliente-contacto">
                        {cliente.telefono && (
                          <span>
                            <Phone size={14} />
                            {cliente.telefono}
                          </span>
                        )}

                        {cliente.correo && (
                          <span>
                            <Mail size={14} />
                            {cliente.correo}
                          </span>
                        )}

                        {!cliente.telefono && !cliente.correo && (
                          <span className="pc-contacto-vacio">
                            Sin contacto registrado
                          </span>
                        )}
                      </div>
                    </td>

                    <td>{fechaFormateada(cliente.fecha_registro)}</td>

                    <td>
                      <span>
                        <span
                          className={`pc-estado-etiqueta ${
                            cliente.estado ? "activo" : "inactivo"
                          }`}
                        >
                          <span className="pc-estado-punto" />
                          {cliente.estado ? "Activo" : "Inactivo"}
                        </span>
                      </span>
                    </td>

                    <td>
                      <div className="pc-acciones-registro">
                        <button
                          type="button"
                          className="pc-accion-tabla pc-accion-editar"
                          title="Editar cliente"
                          aria-label={`Editar ${cliente.nombre}`}
                          onClick={() => abrirEdicion(cliente)}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          className="pc-accion-tabla pc-accion-desactivar"
                          title={
                            cliente.estado
                              ? "Desactivar cliente"
                              : "Activar cliente"
                          }
                          aria-label={`${
                            cliente.estado ? "Desactivar" : "Activar"
                          } ${cliente.nombre}`}
                          onClick={() => void cambiarEstado(cliente)}
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
            Mostrando <strong>{clientesFiltrados.length}</strong> de{" "}
            <strong>{clientes.length}</strong> clientes
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
            if (evento.target === evento.currentTarget) {
              cerrarModal();
            }
          }}
        >
          <section
            className="pc-modal pc-modal-vehiculos"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-cliente"
          >
            <header className="pc-modal-encabezado pc-modal-vehiculos-header">
              <div className="pc-modal-titulo-grupo">
                <span className="pc-modal-icono">
                  <Users size={25} />
                </span>

                <div>
                  <span className="pc-migas">GESTIÓN DEL PARQUEADERO</span>

                  <h2 id="titulo-modal-cliente">
                    {clienteEditar ? "Editar cliente" : "Registrar cliente"}
                  </h2>

                  <p>
                    {clienteEditar
                      ? "Actualiza la información del cliente."
                      : "Completa los datos para crear un nuevo registro."}
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

            <form onSubmit={guardarCliente}>
              <div className="pc-formulario-contenido">
                <div className="pc-formulario-seccion-titulo">
                  <span>01</span>
                  <div>
                    <strong>Información personal</strong>
                    <p>Datos de identificación del cliente.</p>
                  </div>
                </div>

                <div className="pc-formulario-grid">
                  <label className="pc-campo-completo">
                    Nombre completo <span>*</span>
                    <input
                      value={formulario.nombre}
                      onChange={(evento) =>
                        cambiarCampo("nombre", evento.target.value)
                      }
                      maxLength={100}
                      required
                      placeholder="Nombre y apellidos"
                    />
                  </label>

                  <label className="pc-campo-completo">
                    Número de documento <span>*</span>
                    <input
                      value={formulario.documento}
                      onChange={(evento) =>
                        cambiarCampo("documento", evento.target.value)
                      }
                      maxLength={20}
                      required
                      placeholder="Cédula o documento de identidad"
                    />
                  </label>
                </div>

                <div className="pc-formulario-seccion-titulo pc-formulario-seccion-secundaria">
                  <span>02</span>
                  <div>
                    <strong>Información de contacto</strong>
                    <p>Datos opcionales para comunicarse con el cliente.</p>
                  </div>
                </div>

                <div className="pc-formulario-grid">
                  <label>
                    Teléfono
                    <input
                      type="tel"
                      value={formulario.telefono}
                      onChange={(evento) =>
                        cambiarCampo("telefono", evento.target.value)
                      }
                      maxLength={20}
                      placeholder="Número de contacto"
                    />
                  </label>

                  <label>
                    Correo electrónico
                    <input
                      type="email"
                      value={formulario.correo}
                      onChange={(evento) =>
                        cambiarCampo("correo", evento.target.value)
                      }
                      maxLength={100}
                      placeholder="cliente@correo.com"
                    />
                  </label>
                </div>

                <div className="pc-ayuda-formulario pc-ayuda-vehiculos">
                  <CircleCheck size={18} />
                  <p>
                    El nombre y el documento son obligatorios. El teléfono y el
                    correo son opcionales.
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
                      <LoaderCircle size={18} className="pc-girando" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      {clienteEditar ? (
                        <Pencil size={18} />
                      ) : (
                        <Plus size={18} />
                      )}
                      {clienteEditar ? "Guardar cambios" : "Registrar cliente"}
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}