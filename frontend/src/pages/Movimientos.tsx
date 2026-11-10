import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ArrowRightLeft,
  CarFront,
  CircleCheck,
  ClipboardList,
  Clock3,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Timer,
  X,
} from "lucide-react";

import EncabezadoModulo from "../componentes/EncabezadoModulo";
import {
  Aviso,
  BarraListado,
  FilaIndicadores,
  Indicador,
  TablaCargando,
  TablaVacia,
} from "../componentes/Indicadores";
import { claseIconoTipo, IconoTipo } from "../componentes/IconosTipo";
import {
  listarMovimientos,
  listarVehiculos,
  registrarEntrada,
  registrarSalida,
} from "../services/parqueaderoApi";
import {
  ETIQUETA_METODO,
  formatoDuracion,
  formatoFechaHora,
  formatoMoneda,
  mensajeError,
  type EstadoMovimiento,
  type MovimientoDetallado,
  type VehiculoDetallado,
} from "../services/parqueadero";

type FiltroEstado = "TODOS" | EstadoMovimiento;

function claseEstado(estado: EstadoMovimiento): string {
  if (estado === "ACTIVO") return "activo";
  if (estado === "FINALIZADO") return "finalizado";
  return "cancelado";
}

function textoEstado(estado: EstadoMovimiento): string {
  if (estado === "ACTIVO") return "En parqueadero";
  if (estado === "FINALIZADO") return "Finalizado";
  return "Cancelado";
}

export default function Movimientos() {
  const [movimientos, setMovimientos] = useState<MovimientoDetallado[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoDetallado[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODOS");

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [vehiculoEntradaId, setVehiculoEntradaId] = useState("");
  const [entrando, setEntrando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [datos, datosVehiculos] = await Promise.all([
        listarMovimientos(),
        listarVehiculos(),
      ]);
      setMovimientos(datos);
      setVehiculos(datosVehiculos);
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resumen = useMemo(() => {
    const activos = movimientos.filter((m) => m.estado === "ACTIVO");
    const finalizados = movimientos.filter((m) => m.estado === "FINALIZADO");

    return {
      total: movimientos.length,
      activos: activos.length,
      finalizados: finalizados.length,
      valorFinalizado: finalizados.reduce(
        (total, movimiento) => total + Number(movimiento.valor_total ?? 0),
        0
      ),
      valorEnCurso: activos.reduce(
        (total, movimiento) => total + Number(movimiento.valor_estimado ?? 0),
        0
      ),
    };
  }, [movimientos]);

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return movimientos.filter((movimiento) => {
      const coincideTexto =
        !termino ||
        [
          movimiento.vehiculo_codigo ?? "",
          movimiento.placa ?? "",
          movimiento.cliente_nombre ?? "",
          movimiento.tipo ?? "",
          String(movimiento.id),
        ].some((valor) => valor.toLowerCase().includes(termino));

      const coincideEstado =
        filtroEstado === "TODOS" || movimiento.estado === filtroEstado;

      return coincideTexto && coincideEstado;
    });
  }, [movimientos, busqueda, filtroEstado]);

  async function manejarEntrada() {
    setError("");
    setMensaje("");

    if (!vehiculoEntradaId) {
      setError("Selecciona un vehículo para registrar su entrada.");
      return;
    }

    const vehiculo = vehiculos.find(
      (item) => item.id === Number(vehiculoEntradaId)
    );

    if (!vehiculo) {
      setError("El vehículo seleccionado ya no está disponible. Actualiza la lista.");
      return;
    }

    if (vehiculo.en_parqueadero) {
      setError("Ese vehículo ya tiene un ingreso activo.");
      return;
    }

    if (!vehiculo.estado) {
      setError("El vehículo está inactivo. Actívalo para registrar la entrada.");
      return;
    }

    setEntrando(true);

    try {
      await registrarEntrada(vehiculo.id);
      setMensaje(
        `Entrada registrada para ${vehiculo.codigo}${
          vehiculo.placa ? ` (${vehiculo.placa})` : ""
        }.`
      );
      setVehiculoEntradaId("");
      await cargar();
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    } finally {
      setEntrando(false);
    }
  }

  async function manejarSalida(movimiento: MovimientoDetallado) {
    if (
      !window.confirm(
        `¿Registrar la salida de ${movimiento.vehiculo_codigo}? Se calculará el valor a pagar según la tarifa vigente.`
      )
    ) {
      return;
    }

    setError("");
    setMensaje("");
    setProcesando(movimiento.id);

    try {
      const salida = await registrarSalida(movimiento.id);

      setMensaje(
        `Salida registrada: ${formatoDuracion(
          salida.minutos
        )} de permanencia · Total a pagar ${formatoMoneda(salida.valor_total)}.`
      );

      await cargar();
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    } finally {
      setProcesando(null);
    }
  }

  return (
    <section className="pc-modulo pc-vehiculos">
      <EncabezadoModulo
        seccion="Operaciones"
        titulo="Control de movimientos"
        descripcion="Administra los ingresos y salidas de vehículos del parqueadero."
        accion={
          <button
            className="pc-boton-secundario"
            onClick={() => void cargar()}
            disabled={cargando}
          >
            <RefreshCw size={16} className={cargando ? "pc-girando" : ""} />
            Actualizar
          </button>
        }
      />

      {error && <Aviso tipo="error" mensaje={error} onCerrar={() => setError("")} />}
      {mensaje && (
        <Aviso tipo="exito" mensaje={mensaje} onCerrar={() => setMensaje("")} />
      )}

      <FilaIndicadores>
        <Indicador
          etiqueta="Total movimientos"
          valor={resumen.total}
          descripcion="Registros del parqueadero"
          icono={ArrowRightLeft}
          cargando={cargando}
        />

        <Indicador
          etiqueta="Vehículos dentro"
          valor={resumen.activos}
          descripcion={`${formatoMoneda(resumen.valorEnCurso)} en curso`}
          icono={CarFront}
          tono="ambar"
          cargando={cargando}
        />

        <Indicador
          etiqueta="Movimientos finalizados"
          valor={resumen.finalizados}
          descripcion="Salidas registradas"
          icono={CircleCheck}
          tono="verde"
          cargando={cargando}
        />

        <Indicador
          etiqueta="Valor finalizado"
          valor={formatoMoneda(resumen.valorFinalizado)}
          descripcion="Según movimientos cerrados"
          icono={Clock3}
          tono="morado"
          cargando={cargando}
        />
      </FilaIndicadores>

      <section className="pc-panel pc-panel-entrada">
        <div className="pc-panel-encabezado">
          <div>
            <h3>
              <LogIn size={18} /> Registrar entrada
            </h3>
            <p>
              Selecciona un vehículo registrado que esté activo y fuera del parqueadero.
            </p>
          </div>
        </div>

        <div className="pc-entrada-form">
          <label className="pc-busqueda-vehiculos pc-busqueda-entrada">
            <CarFront size={16} />
            <select
              value={vehiculoEntradaId}
              onChange={(evento) => setVehiculoEntradaId(evento.target.value)}
              aria-label="Seleccionar vehículo para registrar entrada"
              disabled={cargando || entrando}
            >
              <option value="">
                {vehiculos.some((vehiculo) => vehiculo.estado && !vehiculo.en_parqueadero)
                  ? "Selecciona un vehículo registrado"
                  : "No hay vehículos disponibles para ingresar"}
              </option>
              {vehiculos
                .filter((vehiculo) => vehiculo.estado && !vehiculo.en_parqueadero)
                .map((vehiculo) => (
                  <option key={vehiculo.id} value={vehiculo.id}>
                    {vehiculo.codigo} · {vehiculo.placa ?? "Sin placa"} · {vehiculo.tipo}
                    {vehiculo.cliente_nombre ? ` · ${vehiculo.cliente_nombre}` : ""}
                  </option>
                ))}
            </select>
          </label>

          <button
            className="pc-accion-principal"
            onClick={() => void manejarEntrada()}
            disabled={entrando || cargando || !vehiculoEntradaId}
          >
            <LogIn size={17} />
            {entrando ? "Registrando..." : "Registrar entrada"}
          </button>
        </div>
      </section>

      <section className="pc-vehiculos-listado">
        <BarraListado
          Icono={ClipboardList}
          titulo="Listado de movimientos"
          descripcion="Consulta las entradas y salidas de vehículos."
        >
          <label className="pc-busqueda-vehiculos">
            <Search size={16} />
            <input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar código, placa, cliente…"
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
              value={filtroEstado}
              onChange={(evento) =>
                setFiltroEstado(evento.target.value as FiltroEstado)
              }
            >
              <option value="TODOS">Todos los movimientos</option>
              <option value="ACTIVO">En parqueadero</option>
              <option value="FINALIZADO">Finalizados</option>
              <option value="CANCELADO">Cancelados</option>
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
            <Timer size={13} /> Control de ingresos y salidas
          </span>
        </div>

        {cargando ? (
          <TablaCargando mensaje="Consultando los movimientos del parqueadero…" />
        ) : filtrados.length === 0 ? (
          <TablaVacia
            titulo={
              movimientos.length === 0
                ? "Aún no hay movimientos"
                : "Sin resultados para este filtro"
            }
            mensaje={
              movimientos.length === 0
                ? "Registra la primera entrada con el código o la placa del vehículo."
                : "Cambia el estado seleccionado o limpia la búsqueda."
            }
            Icono={ArrowRightLeft}
            accion={
              movimientos.length > 0 ? (
                <button
                  className="pc-boton-secundario"
                  onClick={() => {
                    setBusqueda("");
                    setFiltroEstado("TODOS");
                  }}
                >
                  Limpiar filtros
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="pc-tabla-scroll">
            <table className="pc-tabla-vehiculos">
              <thead>
                <tr>
                  <th>Movimiento</th>
                  <th>Vehículo</th>
                  <th>Ingreso</th>
                  <th>Salida</th>
                  <th>Tiempo</th>
                  <th>Valor</th>
                  <th>Estado</th>
                  <th className="pc-columna-acciones">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((movimiento) => (
                  <tr key={movimiento.id}>
                    <td>
                      <div className="pc-vehiculo-datos">
                        <strong>#{movimiento.id}</strong>
                        <small>
                          {movimiento.usuario_ingreso
                            ? `Por ${movimiento.usuario_ingreso}`
                            : "Registro de movimiento"}
                        </small>
                      </div>
                    </td>

                    <td>
                      <div className="pc-vehiculo-identidad">
                        <span
                          className={`pc-vehiculo-icono ${claseIconoTipo(
                            movimiento.tipo
                          )}`}
                        >
                          <IconoTipo tipo={movimiento.tipo} tamano={19} />
                        </span>

                        <div className="pc-vehiculo-datos">
                          <strong>{movimiento.vehiculo_codigo ?? "—"}</strong>
                          <small>{movimiento.placa ?? "Sin placa"}</small>
                        </div>
                      </div>
                    </td>

                    <td>{formatoFechaHora(movimiento.fecha_ingreso)}</td>

                    <td>
                      {movimiento.fecha_salida
                        ? formatoFechaHora(movimiento.fecha_salida)
                        : "—"}
                    </td>

                    <td>
                      {movimiento.estado === "ACTIVO" ? (
                        <span className="pc-texto-en-curso">
                          {formatoDuracion(movimiento.minutos_transcurridos)}
                        </span>
                      ) : (
                        formatoDuracion(movimiento.minutos)
                      )}
                    </td>

                    <td>
                      {movimiento.estado === "ACTIVO" ? (
                        <div className="pc-valor-celda">
                          <strong>
                            {formatoMoneda(movimiento.valor_estimado ?? 0)}
                          </strong>
                          <small>Estimado</small>
                        </div>
                      ) : (
                        <div className="pc-valor-celda">
                          <strong>
                            {formatoMoneda(movimiento.valor_total ?? 0)}
                          </strong>
                          <small>
                            {movimiento.pago_id
                              ? ETIQUETA_METODO[movimiento.metodo_pago ?? ""] ??
                                "Pagado"
                              : "Sin pago"}
                          </small>
                        </div>
                      )}
                    </td>

                    <td>
                      <span
                        className={`pc-estado-etiqueta ${claseEstado(
                          movimiento.estado
                        )}`}
                      >
                        <span className="pc-estado-punto" />
                        {textoEstado(movimiento.estado)}
                      </span>
                    </td>

                    <td>
                      {movimiento.estado === "ACTIVO" ? (
                        <button
                          type="button"
                          className="pc-boton-tabla pc-boton-salida"
                          onClick={() => void manejarSalida(movimiento)}
                          disabled={procesando === movimiento.id}
                        >
                          <LogOut size={15} />
                          {procesando === movimiento.id
                            ? "Procesando…"
                            : "Salida"}
                        </button>
                      ) : (
                        <span className="pc-registro-sin-acciones">
                          <CircleCheck size={16} />
                        </span>
                      )}
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
            <strong>{movimientos.length}</strong> movimientos
          </span>

          <span>
            <CircleCheck size={15} />
            Datos de ParkControl
          </span>
        </footer>
      </section>

      <footer className="pc-footer">
        <span>
          <LogIn size={12} /> Cada entrada queda asociada al usuario autenticado.
        </span>
        <span>
          <LogOut size={12} /> La salida calcula minutos y valor según la tarifa.
        </span>
      </footer>
    </section>
  );
}
