import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  CarFront,
  CircleCheck,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Tags,
  Timer,
  UserRound,
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
import { claseIconoTipo, EtiquetaTipo, IconoTipo } from "../componentes/IconosTipo";
import { useSesion } from "../contexto/SesionContext";
import {
  cambiarEstadoVehiculo,
  crearVehiculo,
  actualizarVehiculo,
  listarClientes,
  listarVehiculos,
} from "../services/parqueaderoApi";
import {
  formatoDuracion,
  formatoMoneda,
  mensajeError,
  type Cliente,
  type TipoVehiculo,
  type VehiculoDetallado,
  type VehiculoPayload,
} from "../services/parqueadero";

type FiltroEstado = "TODOS" | "ACTIVOS" | "INACTIVOS" | "PARQUEADERO";

interface FormularioVehiculo {
  codigo: string;
  placa: string;
  tipo: TipoVehiculo;
  marca: string;
  modelo: string;
  color: string;
  cliente_id: string;
}

const formularioInicial: FormularioVehiculo = {
  codigo: "",
  placa: "",
  tipo: "MOTO",
  marca: "",
  modelo: "",
  color: "",
  cliente_id: "",
};

export default function Vehiculos() {
  const { puedeVer } = useSesion();

  const [vehiculos, setVehiculos] = useState<VehiculoDetallado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODOS");
  const [filtroTipo, setFiltroTipo] = useState<TipoVehiculo | "TODOS">("TODOS");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [vehiculoEditar, setVehiculoEditar] =
    useState<VehiculoDetallado | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioVehiculo>(formularioInicial);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [datosVehiculos, datosClientes] = await Promise.all([
        listarVehiculos(),
        listarClientes(),
      ]);

      setVehiculos(datosVehiculos);
      setClientes(datosClientes);
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const resumen = useMemo(
    () => ({
      total: vehiculos.length,
      activos: vehiculos.filter((vehiculo) => vehiculo.estado).length,
      inactivos: vehiculos.filter((vehiculo) => !vehiculo.estado).length,
      enParqueadero: vehiculos.filter((vehiculo) => vehiculo.en_parqueadero).length,
      tipos: new Set(vehiculos.map((vehiculo) => vehiculo.tipo)).size,
    }),
    [vehiculos]
  );

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return vehiculos.filter((vehiculo) => {
      const coincideTexto =
        !termino ||
        [
          vehiculo.codigo,
          vehiculo.placa ?? "",
          vehiculo.marca ?? "",
          vehiculo.modelo ?? "",
          vehiculo.color ?? "",
          vehiculo.cliente_nombre ?? "",
          String(vehiculo.id),
        ].some((valor) => valor.toLowerCase().includes(termino));

      const coincideEstado =
        filtroEstado === "TODOS" ||
        (filtroEstado === "ACTIVOS" && vehiculo.estado) ||
        (filtroEstado === "INACTIVOS" && !vehiculo.estado) ||
        (filtroEstado === "PARQUEADERO" && vehiculo.en_parqueadero);

      const coincideTipo =
        filtroTipo === "TODOS" || vehiculo.tipo === filtroTipo;

      return coincideTexto && coincideEstado && coincideTipo;
    });
  }, [vehiculos, busqueda, filtroEstado, filtroTipo]);

  function cambiarCampo(campo: keyof FormularioVehiculo, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  function abrirRegistro() {
    setError("");
    setMensaje("");
    setVehiculoEditar(null);
    setFormulario(formularioInicial);
    setModalAbierto(true);
  }

  function abrirEdicion(vehiculo: VehiculoDetallado) {
    setError("");
    setMensaje("");
    setVehiculoEditar(vehiculo);

    setFormulario({
      codigo: vehiculo.codigo,
      placa: vehiculo.placa ?? "",
      tipo: vehiculo.tipo,
      marca: vehiculo.marca ?? "",
      modelo: vehiculo.modelo ?? "",
      color: vehiculo.color ?? "",
      cliente_id: String(vehiculo.cliente_id),
    });

    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);
    setVehiculoEditar(null);
    setFormulario(formularioInicial);
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");

    if (!formulario.codigo.trim()) {
      setError("El código del vehículo es obligatorio.");
      return;
    }

    if (!formulario.cliente_id) {
      setError("Selecciona el cliente propietario del vehículo.");
      return;
    }

    const payload: VehiculoPayload = {
      codigo: formulario.codigo.trim().toUpperCase(),
      placa: formulario.placa.trim() ? formulario.placa.trim().toUpperCase() : null,
      tipo: formulario.tipo,
      marca: formulario.marca.trim() || null,
      modelo: formulario.modelo.trim() || null,
      color: formulario.color.trim() || null,
      cliente_id: Number(formulario.cliente_id),
    };

    setGuardando(true);

    try {
      if (vehiculoEditar) {
        await actualizarVehiculo(vehiculoEditar.id, payload);
        setMensaje(`Vehículo ${payload.codigo} actualizado correctamente.`);
      } else {
        await crearVehiculo(payload);
        setMensaje(`Vehículo ${payload.codigo} registrado correctamente.`);
      }

      setModalAbierto(false);
      setVehiculoEditar(null);
      setFormulario(formularioInicial);

      await cargarDatos();
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(vehiculo: VehiculoDetallado) {
    const accion = vehiculo.estado ? "desactivar" : "activar";

    if (!window.confirm(`¿Deseas ${accion} el vehículo ${vehiculo.codigo}?`)) {
      return;
    }

    setError("");
    setMensaje("");

    try {
      await cambiarEstadoVehiculo(vehiculo.id, !vehiculo.estado);

      setMensaje(
        `Vehículo ${vehiculo.codigo} ${
          vehiculo.estado ? "desactivado" : "activado"
        } correctamente.`
      );

      await cargarDatos();
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    }
  }

  return (
    <section className="pc-modulo pc-vehiculos">
      <EncabezadoModulo
        seccion="Gestión"
        titulo="Gestión de vehículos"
        descripcion="Administra, consulta y controla los vehículos registrados en tu parqueadero."
        accion={
          puedeVer("vehiculos") ? (
            <button
              type="button"
              className="pc-accion-principal pc-boton-registrar"
              onClick={abrirRegistro}
            >
              <Plus size={19} />
              <span>Registrar vehículo</span>
            </button>
          ) : undefined
        }
      />

      {error && <Aviso tipo="error" mensaje={error} onCerrar={() => setError("")} />}
      {mensaje && (
        <Aviso tipo="exito" mensaje={mensaje} onCerrar={() => setMensaje("")} />
      )}

      <FilaIndicadores>
        <Indicador
          etiqueta="Total de vehículos"
          valor={resumen.total}
          descripcion="Registros encontrados"
          icono={CarFront}
          cargando={cargando}
        />

        <Indicador
          etiqueta="Vehículos activos"
          valor={resumen.activos}
          descripcion="Registros habilitados"
          icono={CircleCheck}
          tono="verde"
          cargando={cargando}
        />

        <Indicador
          etiqueta="Dentro del parqueadero"
          valor={resumen.enParqueadero}
          descripcion="Con ingreso activo ahora"
          icono={Timer}
          tono="ambar"
          cargando={cargando}
        />

        <Indicador
          etiqueta="Tipos registrados"
          valor={resumen.tipos}
          descripcion="De 3 tipos disponibles"
          icono={Tags}
          tono="morado"
          cargando={cargando}
        />
      </FilaIndicadores>

      <section className="pc-vehiculos-listado">
        <BarraListado
          Icono={CarFront}
          titulo="Listado de vehículos"
          descripcion="Consulta los registros y administra su estado."
        >
          <label className="pc-busqueda-vehiculos">
            <Search size={16} />
            <input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar código, placa, marca, cliente…"
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
              value={filtroTipo}
              onChange={(evento) =>
                setFiltroTipo(evento.target.value as TipoVehiculo | "TODOS")
              }
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="MOTO">Motos</option>
              <option value="BICICLETA">Bicicletas</option>
              <option value="PATINETA">Patinetas</option>
            </select>
          </label>

          <label className="pc-filtro-estado">
            <SlidersHorizontal size={15} />
            <select
              value={filtroEstado}
              onChange={(evento) =>
                setFiltroEstado(evento.target.value as FiltroEstado)
              }
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVOS">Activos</option>
              <option value="INACTIVOS">Inactivos</option>
              <option value="PARQUEADERO">Dentro del parqueadero</option>
            </select>
          </label>

          <button
            type="button"
            className="pc-boton-secundario pc-boton-actualizar"
            onClick={() => void cargarDatos()}
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
            {resumen.enParqueadero} dentro · {resumen.inactivos} inactivos
          </span>
        </div>

        {cargando ? (
          <TablaCargando mensaje="Consultando los vehículos registrados…" />
        ) : filtrados.length === 0 ? (
          <TablaVacia
            titulo={
              vehiculos.length === 0
                ? "Aún no hay vehículos registrados"
                : "Sin resultados para esta búsqueda"
            }
            mensaje={
              vehiculos.length === 0
                ? "Registra el primer vehículo para poder controlar sus entradas y salidas."
                : "Prueba con otro término de búsqueda o cambia los filtros aplicados."
            }
            Icono={CarFront}
            accion={
              vehiculos.length === 0 ? (
                <button className="pc-accion-principal" onClick={abrirRegistro}>
                  <Plus size={17} />
                  Registrar vehículo
                </button>
              ) : (
                <button
                  className="pc-boton-secundario"
                  onClick={() => {
                    setBusqueda("");
                    setFiltroEstado("TODOS");
                    setFiltroTipo("TODOS");
                  }}
                >
                  Limpiar filtros
                </button>
              )
            }
          />
        ) : (
          <div className="pc-tabla-scroll">
            <table className="pc-tabla-vehiculos">
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Placa</th>
                  <th>Tipo</th>
                  <th>Marca y modelo</th>
                  <th>Cliente</th>
                  <th>Permanencia</th>
                  <th>Estado</th>
                  <th className="pc-columna-acciones">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((vehiculo) => (
                  <tr key={vehiculo.id}>
                    <td>
                      <div className="pc-vehiculo-identidad">
                        <span
                          className={`pc-vehiculo-icono ${claseIconoTipo(
                            vehiculo.tipo
                          )}`}
                        >
                          <IconoTipo tipo={vehiculo.tipo} />
                        </span>

                        <div className="pc-vehiculo-datos">
                          <strong>{vehiculo.codigo}</strong>
                          <small>Registro #{vehiculo.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="pc-placa-vehiculo">
                        {vehiculo.placa ?? "Sin placa"}
                      </span>
                    </td>

                    <td>
                      <EtiquetaTipo tipo={vehiculo.tipo} />
                    </td>

                    <td>
                      <div className="pc-marca-modelo">
                        <strong>
                          {[vehiculo.marca, vehiculo.modelo]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </strong>
                        <small>{vehiculo.color ?? "Color no registrado"}</small>
                      </div>
                    </td>

                    <td>
                      <span className="pc-cliente-identificador">
                        {vehiculo.cliente_nombre ?? `Cliente #${vehiculo.cliente_id}`}
                      </span>
                    </td>

                    <td>
                      {vehiculo.en_parqueadero ? (
                        <div className="pc-permanencia">
                          <strong>
                            {formatoDuracion(vehiculo.minutos_transcurridos)}
                          </strong>
                          <small>
                            {formatoMoneda(vehiculo.valor_estimado ?? 0)} estimado
                          </small>
                        </div>
                      ) : (
                        <span className="pc-texto-tenue">Fuera</span>
                      )}
                    </td>

                    <td>
                      <EtiquetaEstado activo={vehiculo.estado} />
                    </td>

                    <td>
                      <div className="pc-acciones-registro">
                        <button
                          type="button"
                          className="pc-accion-tabla pc-accion-editar"
                          title="Editar vehículo"
                          onClick={() => abrirEdicion(vehiculo)}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          className="pc-accion-tabla pc-accion-desactivar"
                          title={
                            vehiculo.estado
                              ? "Desactivar vehículo"
                              : "Activar vehículo"
                          }
                          onClick={() => void alternarEstado(vehiculo)}
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
            <strong>{vehiculos.length}</strong> vehículos
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
            className="pc-modal pc-modal-vehiculos"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-vehiculo"
          >
            <header className="pc-modal-encabezado pc-modal-vehiculos-header">
              <div className="pc-modal-titulo-grupo">
                <span className="pc-modal-icono">
                  <CarFront size={25} />
                </span>

                <div>
                  <span className="pc-migas">GESTIÓN DEL PARQUEADERO</span>

                  <h2 id="titulo-modal-vehiculo">
                    {vehiculoEditar ? "Editar vehículo" : "Registrar vehículo"}
                  </h2>

                  <p>
                    {vehiculoEditar
                      ? "Actualiza la información del vehículo."
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

            <form onSubmit={guardar}>
              <div className="pc-formulario-contenido">
                <div className="pc-formulario-seccion-titulo">
                  <span>01</span>
                  <div>
                    <strong>Identificación del vehículo</strong>
                    <p>Código interno, placa y tipo de vehículo.</p>
                  </div>
                </div>

                <div className="pc-formulario-grid">
                  <label>
                    Código <span>*</span>
                    <input
                      value={formulario.codigo}
                      onChange={(evento) =>
                        cambiarCampo("codigo", evento.target.value.toUpperCase())
                      }
                      maxLength={20}
                      required
                      placeholder="VEH-001"
                    />
                  </label>

                  <label>
                    Placa
                    <input
                      value={formulario.placa}
                      onChange={(evento) =>
                        cambiarCampo("placa", evento.target.value.toUpperCase())
                      }
                      maxLength={20}
                      placeholder="ABC-123"
                    />
                  </label>

                  <label>
                    Tipo de vehículo <span>*</span>
                    <select
                      value={formulario.tipo}
                      onChange={(evento) =>
                        cambiarCampo("tipo", evento.target.value)
                      }
                      required
                    >
                      <option value="MOTO">Moto</option>
                      <option value="BICICLETA">Bicicleta</option>
                      <option value="PATINETA">Patineta eléctrica</option>
                    </select>
                  </label>

                  <label>
                    Cliente propietario <span>*</span>
                    <select
                      value={formulario.cliente_id}
                      onChange={(evento) =>
                        cambiarCampo("cliente_id", evento.target.value)
                      }
                      required
                    >
                      <option value="">Selecciona un cliente</option>

                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nombre} · {cliente.documento}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="pc-formulario-seccion-titulo pc-formulario-seccion-secundaria">
                  <span>02</span>
                  <div>
                    <strong>Características</strong>
                    <p>Información opcional para identificar el vehículo.</p>
                  </div>
                </div>

                <div className="pc-formulario-grid">
                  <label>
                    Marca
                    <input
                      value={formulario.marca}
                      onChange={(evento) =>
                        cambiarCampo("marca", evento.target.value)
                      }
                      maxLength={50}
                      placeholder="AKT, Yamaha, GW…"
                    />
                  </label>

                  <label>
                    Modelo
                    <input
                      value={formulario.modelo}
                      onChange={(evento) =>
                        cambiarCampo("modelo", evento.target.value)
                      }
                      maxLength={50}
                      placeholder="2020"
                    />
                  </label>

                  <label className="pc-campo-completo">
                    Color
                    <input
                      value={formulario.color}
                      onChange={(evento) =>
                        cambiarCampo("color", evento.target.value)
                      }
                      maxLength={30}
                      placeholder="Rojo, negro, azul…"
                    />
                  </label>
                </div>

                <div className="pc-ayuda-formulario pc-ayuda-vehiculos">
                  <UserRound size={18} />
                  <p>
                    El cliente debe estar registrado y activo. Para registrar una
                    entrada el vehículo debe estar activo y con tarifa
                    configurada.
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
                      {vehiculoEditar ? <Pencil size={18} /> : <Plus size={18} />}
                      {vehiculoEditar ? "Guardar cambios" : "Registrar vehículo"}
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
          <Clock3 size={12} /> Los valores estimados se recalculan cada vez que
          actualizas el listado.
        </span>
        <span>
          <CircleDollarSign size={12} /> Tarifas configuradas por el
          administrador
        </span>
      </footer>
    </section>
  );
}
