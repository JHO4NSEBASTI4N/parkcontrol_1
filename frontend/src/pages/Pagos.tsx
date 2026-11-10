import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import {
  Banknote,
  CircleCheck,
  CreditCard,
  LoaderCircle,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Wallet,
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
  listarPagos,
  registrarPago,
} from "../services/parqueaderoApi";
import {
  ETIQUETA_METODO,
  formatoDuracion,
  formatoFechaHora,
  formatoMoneda,
  mensajeError,
  type MovimientoDetallado,
  type PagoDetallado,
} from "../services/parqueadero";

type FiltroMetodo = "TODOS" | "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";

export default function Pagos() {
  const [pagos, setPagos] = useState<PagoDetallado[]>([]);
  const [pendientes, setPendientes] = useState<MovimientoDetallado[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState<FiltroMetodo>("TODOS");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [movimientoId, setMovimientoId] = useState("");
  const [metodo, setMetodo] = useState("EFECTIVO");
  const [valor, setValor] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [datosPagos, datosMovimientos] = await Promise.all([
        listarPagos(),
        listarMovimientos(),
      ]);

      setPagos(datosPagos);
      setPendientes(
        datosMovimientos.filter(
          (movimiento) =>
            movimiento.estado === "FINALIZADO" && movimiento.pago_id === null
        )
      );
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
    const pagados = pagos.filter((pago) => pago.estado === "PAGADO");

    const total = pagados.reduce(
      (acumulado, pago) => acumulado + Number(pago.valor),
      0
    );

    return {
      total: pagos.length,
      pagados: pagados.length,
      recaudado: total,
      ticket: pagados.length ? total / pagados.length : 0,
      pendientes: pendientes.length,
      valorPendiente: pendientes.reduce(
        (acumulado, movimiento) => acumulado + Number(movimiento.valor_total ?? 0),
        0
      ),
    };
  }, [pagos, pendientes]);

  const porMetodo = useMemo(() => {
    const mapa: Record<string, { cantidad: number; total: number }> = {};

    pagos.forEach((pago) => {
      const registro = mapa[pago.metodo_pago] ?? { cantidad: 0, total: 0 };
      registro.cantidad += 1;
      registro.total += Number(pago.valor);
      mapa[pago.metodo_pago] = registro;
    });

    return mapa;
  }, [pagos]);

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return pagos.filter((pago) => {
      const coincideTexto =
        !termino ||
        [
          pago.vehiculo_codigo ?? "",
          pago.placa ?? "",
          pago.cliente_nombre ?? "",
          pago.metodo_pago,
          String(pago.id),
          String(pago.movimiento_id),
        ].some((valorTexto) => valorTexto.toLowerCase().includes(termino));

      const coincideMetodo =
        filtroMetodo === "TODOS" || pago.metodo_pago === filtroMetodo;

      return coincideTexto && coincideMetodo;
    });
  }, [pagos, busqueda, filtroMetodo]);

  function abrirModal(movimiento?: MovimientoDetallado) {
    setError("");
    setMensaje("");

    if (movimiento) {
      setMovimientoId(String(movimiento.id));
      setValor(String(Number(movimiento.valor_total ?? 0)));
    } else {
      setMovimientoId("");
      setValor("");
    }

    setMetodo("EFECTIVO");
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;
    setModalAbierto(false);
  }

  function seleccionarMovimiento(id: string) {
    setMovimientoId(id);

    const movimiento = pendientes.find((item) => String(item.id) === id);

    if (movimiento?.valor_total !== null && movimiento?.valor_total !== undefined) {
      setValor(String(Number(movimiento.valor_total)));
    } else {
      setValor("");
    }
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");

    if (!movimientoId) {
      setError("Selecciona el movimiento que se va a pagar.");
      return;
    }

    const valorNumero = Number(valor);

    if (!valorNumero || valorNumero <= 0) {
      setError("El valor del pago debe ser mayor que cero.");
      return;
    }

    setGuardando(true);

    try {
      await registrarPago({
        movimiento_id: Number(movimientoId),
        valor: valorNumero.toFixed(2),
        metodo_pago: metodo,
      });

      setMensaje(
        `Pago de ${formatoMoneda(valorNumero)} registrado (${
          ETIQUETA_METODO[metodo]
        }).`
      );

      setModalAbierto(false);
      await cargar();
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="pc-modulo pc-vehiculos">
      <EncabezadoModulo
        seccion="Operaciones"
        titulo="Gestión de pagos"
        descripcion="Registra y consulta los pagos de los movimientos finalizados."
        accion={
          <button
            className="pc-accion-principal pc-boton-registrar"
            onClick={() => abrirModal()}
          >
            <Plus size={19} />
            <span>Registrar pago</span>
          </button>
        }
      />

      {error && <Aviso tipo="error" mensaje={error} onCerrar={() => setError("")} />}
      {mensaje && (
        <Aviso tipo="exito" mensaje={mensaje} onCerrar={() => setMensaje("")} />
      )}

      <FilaIndicadores>
        <Indicador
          etiqueta="Total de pagos"
          valor={resumen.total}
          descripcion="Pagos registrados"
          icono={Receipt}
          cargando={cargando}
        />

        <Indicador
          etiqueta="Pagos confirmados"
          valor={resumen.pagados}
          descripcion="Con estado PAGADO"
          icono={CircleCheck}
          tono="verde"
          cargando={cargando}
        />

        <Indicador
          etiqueta="Total recaudado"
          valor={formatoMoneda(resumen.recaudado)}
          descripcion={`Ticket promedio ${formatoMoneda(resumen.ticket)}`}
          icono={Wallet}
          tono="morado"
          cargando={cargando}
        />

        <Indicador
          etiqueta="Pendientes de pago"
          valor={resumen.pendientes}
          descripcion={`${formatoMoneda(resumen.valorPendiente)} por cobrar`}
          icono={Banknote}
          tono="ambar"
          cargando={cargando}
        />
      </FilaIndicadores>

      {pendientes.length > 0 && (
        <section className="pc-panel pc-panel-entrada">
          <div className="pc-panel-encabezado">
            <div>
              <h3>
                <Banknote size={18} /> Movimientos pendientes de pago
              </h3>
              <p>
                Estos movimientos ya finalizaron y esperan el registro del pago.
              </p>
            </div>
          </div>

          <div className="pc-pendientes">
            {pendientes.map((movimiento) => (
              <article key={movimiento.id} className="pc-pendiente">
                <span className="pc-pendiente-icono">
                  <IconoTipo tipo={movimiento.tipo} tamano={19} />
                </span>

                <div>
                  <strong>
                    {movimiento.vehiculo_codigo}
                    {movimiento.placa ? ` · ${movimiento.placa}` : ""}
                  </strong>
                  <span>
                    Movimiento #{movimiento.id} ·{" "}
                    {formatoDuracion(movimiento.minutos)} ·{" "}
                    {movimiento.cliente_nombre ?? "Sin cliente"}
                  </span>
                </div>

                <strong className="pc-pendiente-valor">
                  {formatoMoneda(movimiento.valor_total ?? 0)}
                </strong>

                <button
                  className="pc-accion-principal pc-boton-cobrar"
                  onClick={() => abrirModal(movimiento)}
                >
                  <CreditCard size={16} />
                  Cobrar
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="pc-vehiculos-listado">
        <BarraListado
          Icono={CreditCard}
          titulo="Listado de pagos"
          descripcion="Consulta el historial de pagos registrados."
        >
          <label className="pc-busqueda-vehiculos">
            <Search size={16} />
            <input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar placa, cliente, pago…"
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
              value={filtroMetodo}
              onChange={(evento) =>
                setFiltroMetodo(evento.target.value as FiltroMetodo)
              }
            >
              <option value="TODOS">Todos los métodos</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
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
            <CreditCard size={13} /> Efectivo {porMetodo.EFECTIVO?.cantidad ?? 0} ·
            Tarjeta {porMetodo.TARJETA?.cantidad ?? 0} · Transferencia{" "}
            {porMetodo.TRANSFERENCIA?.cantidad ?? 0}
          </span>
        </div>

        {cargando ? (
          <TablaCargando mensaje="Consultando el historial de pagos…" />
        ) : filtrados.length === 0 ? (
          <TablaVacia
            titulo={
              pagos.length === 0
                ? "Aún no hay pagos registrados"
                : "Sin resultados para este filtro"
            }
            mensaje={
              pagos.length === 0
                ? "Cuando finalices un movimiento podrás registrar su pago desde aquí."
                : "Cambia el método de pago o limpia la búsqueda."
            }
            Icono={CreditCard}
            accion={
              <button
                className="pc-boton-secundario"
                onClick={() => {
                  setBusqueda("");
                  setFiltroMetodo("TODOS");
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
                  <th>Pago</th>
                  <th>Vehículo</th>
                  <th>Cliente</th>
                  <th>Movimiento</th>
                  <th>Tiempo</th>
                  <th>Valor</th>
                  <th>Método</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((pago) => (
                  <tr key={pago.id}>
                    <td>
                      <div className="pc-vehiculo-datos">
                        <strong>Pago #{pago.id}</strong>
                        <small>{formatoFechaHora(pago.fecha_pago)}</small>
                      </div>
                    </td>

                    <td>
                      <div className="pc-vehiculo-identidad">
                        <span
                          className={`pc-vehiculo-icono ${claseIconoTipo(
                            pago.tipo
                          )}`}
                        >
                          <IconoTipo tipo={pago.tipo} tamano={19} />
                        </span>

                        <div className="pc-vehiculo-datos">
                          <strong>{pago.vehiculo_codigo ?? "—"}</strong>
                          <small>{pago.placa ?? "Sin placa"}</small>
                        </div>
                      </div>
                    </td>

                    <td>{pago.cliente_nombre ?? "—"}</td>

                    <td>
                      <span className="pc-placa-vehiculo">
                        #{pago.movimiento_id}
                      </span>
                    </td>

                    <td>{formatoDuracion(pago.minutos)}</td>

                    <td>
                      <strong className="pc-valor-fuerte">
                        {formatoMoneda(pago.valor)}
                      </strong>
                    </td>

                    <td>{ETIQUETA_METODO[pago.metodo_pago] ?? pago.metodo_pago}</td>

                    <td>
                      <span className="pc-estado-etiqueta activo">
                        <span className="pc-estado-punto" />
                        {pago.estado}
                      </span>
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
            <strong>{pagos.length}</strong> pagos
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
            aria-labelledby="titulo-modal-pago"
          >
            <header className="pc-modal-encabezado pc-modal-vehiculos-header">
              <div className="pc-modal-titulo-grupo">
                <span className="pc-modal-icono">
                  <CreditCard size={24} />
                </span>

                <div>
                  <span className="pc-migas">CAJA DEL PARQUEADERO</span>
                  <h2 id="titulo-modal-pago">Registrar pago</h2>
                  <p>El valor debe coincidir con el total del movimiento.</p>
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
                    Movimiento a pagar <span>*</span>
                    <select
                      value={movimientoId}
                      onChange={(evento) =>
                        seleccionarMovimiento(evento.target.value)
                      }
                      required
                    >
                      <option value="">Selecciona un movimiento finalizado</option>

                      {pendientes.map((movimiento) => (
                        <option key={movimiento.id} value={movimiento.id}>
                          #{movimiento.id} · {movimiento.vehiculo_codigo} ·{" "}
                          {formatoMoneda(movimiento.valor_total ?? 0)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Valor a cobrar <span>*</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={valor}
                      onChange={(evento) => setValor(evento.target.value)}
                      required
                      placeholder="0"
                    />
                  </label>

                  <label>
                    Método de pago <span>*</span>
                    <select
                      value={metodo}
                      onChange={(evento) => setMetodo(evento.target.value)}
                      required
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                  </label>
                </div>

                {pendientes.length === 0 && (
                  <div className="pc-ayuda-formulario pc-ayuda-vehiculos">
                    <Banknote size={18} />
                    <p>
                      No hay movimientos pendientes. Finaliza una salida en
                      Movimientos para poder registrar el pago.
                    </p>
                  </div>
                )}
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
                  disabled={guardando || pendientes.length === 0}
                >
                  {guardando ? (
                    <>
                      <LoaderCircle size={18} className="pc-icono-girando" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      Registrar pago
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
          <Receipt size={12} /> Solo se pueden pagar movimientos finalizados.
        </span>
        <span>
          <Wallet size={12} /> El valor se valida contra el total calculado.
        </span>
      </footer>
    </section>
  );
}
