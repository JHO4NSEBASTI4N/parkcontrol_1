import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  Bike,
  CarFront,
  CircleCheck,
  CircleDollarSign,
  Footprints,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Tags,
  Wallet,
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
import { claseIconoTipo, IconoTipo } from "../componentes/IconosTipo";
import {
  actualizarTarifa,
  cambiarEstadoTarifa,
  crearTarifa,
  listarTarifas,
} from "../services/parqueaderoApi";
import {
  ETIQUETA_TIPO,
  formatoFecha,
  formatoMoneda,
  mensajeError,
  type Tarifa,
  type TipoVehiculo,
} from "../services/parqueadero";

type FiltroEstado = "TODOS" | "ACTIVAS" | "INACTIVAS";

const TIPOS: TipoVehiculo[] = ["MOTO", "PATINETA", "BICICLETA"];

interface FormularioTarifa {
  tipo_vehiculo: TipoVehiculo;
  valor_minuto: string;
}

const formularioInicial: FormularioTarifa = {
  tipo_vehiculo: "MOTO",
  valor_minuto: "",
};

export default function Tarifas() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODOS");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [tarifaEditar, setTarifaEditar] = useState<Tarifa | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioTarifa>(formularioInicial);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      setTarifas(await listarTarifas());
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
    const activas = tarifas.filter((tarifa) => tarifa.estado);

    const promedio = activas.length
      ? activas.reduce(
          (total, tarifa) => total + Number(tarifa.valor_minuto),
          0
        ) / activas.length
      : 0;

    return {
      total: tarifas.length,
      activas: activas.length,
      inactivas: tarifas.length - activas.length,
      promedio,
      tiposDisponibles: new Set(tarifas.map((tarifa) => tarifa.tipo_vehiculo))
        .size,
    };
  }, [tarifas]);

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return tarifas.filter((tarifa) => {
      const coincideTexto =
        !termino ||
        [
          tarifa.tipo_vehiculo,
          ETIQUETA_TIPO[tarifa.tipo_vehiculo],
          String(tarifa.valor_minuto),
          String(tarifa.id),
        ].some((valor) => valor.toLowerCase().includes(termino));

      const coincideEstado =
        filtroEstado === "TODOS" ||
        (filtroEstado === "ACTIVAS" && tarifa.estado) ||
        (filtroEstado === "INACTIVAS" && !tarifa.estado);

      return coincideTexto && coincideEstado;
    });
  }, [tarifas, busqueda, filtroEstado]);

  const tiposSinTarifa = TIPOS.filter(
    (tipo) => !tarifas.some((tarifa) => tarifa.tipo_vehiculo === tipo)
  );

  function abrirRegistro() {
    setError("");
    setMensaje("");
    setTarifaEditar(null);
    setFormulario({
      tipo_vehiculo: tiposSinTarifa[0] ?? "MOTO",
      valor_minuto: "",
    });
    setModalAbierto(true);
  }

  function abrirEdicion(tarifa: Tarifa) {
    setError("");
    setMensaje("");
    setTarifaEditar(tarifa);
    setFormulario({
      tipo_vehiculo: tarifa.tipo_vehiculo,
      valor_minuto: String(Number(tarifa.valor_minuto)),
    });
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;
    setModalAbierto(false);
    setTarifaEditar(null);
    setFormulario(formularioInicial);
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");

    const valor = Number(formulario.valor_minuto);

    if (!valor || valor <= 0) {
      setError("El valor por minuto debe ser mayor que cero.");
      return;
    }

    setGuardando(true);

    try {
      if (tarifaEditar) {
        await actualizarTarifa(tarifaEditar.id, {
          valor_minuto: valor.toFixed(2),
        });
        setMensaje(
          `Tarifa de ${ETIQUETA_TIPO[formulario.tipo_vehiculo]} actualizada a ${formatoMoneda(
            valor
          )} por minuto.`
        );
      } else {
        await crearTarifa({
          tipo_vehiculo: formulario.tipo_vehiculo,
          valor_minuto: valor.toFixed(2),
        });
        setMensaje(
          `Tarifa de ${ETIQUETA_TIPO[formulario.tipo_vehiculo]} registrada.`
        );
      }

      setModalAbierto(false);
      setTarifaEditar(null);
      setFormulario(formularioInicial);

      await cargar();
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(tarifa: Tarifa) {
    const accion = tarifa.estado ? "desactivar" : "activar";

    if (
      !window.confirm(
        `¿Deseas ${accion} la tarifa de ${ETIQUETA_TIPO[tarifa.tipo_vehiculo]}?`
      )
    ) {
      return;
    }

    setError("");
    setMensaje("");

    try {
      await cambiarEstadoTarifa(tarifa.id, !tarifa.estado);
      setMensaje(
        `Tarifa de ${ETIQUETA_TIPO[tarifa.tipo_vehiculo]} ${
          tarifa.estado ? "desactivada" : "activada"
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
        seccion="Configuración"
        titulo="Gestión de tarifas"
        descripcion="Administra los valores por minuto para cada tipo de vehículo."
        accion={
          <button
            className="pc-accion-principal pc-boton-registrar"
            onClick={abrirRegistro}
            disabled={tiposSinTarifa.length === 0}
            title={
              tiposSinTarifa.length === 0
                ? "Ya hay una tarifa para cada tipo de vehículo"
                : "Registrar una nueva tarifa"
            }
          >
            <Plus size={19} />
            <span>Registrar tarifa</span>
          </button>
        }
      />

      {error && <Aviso tipo="error" mensaje={error} onCerrar={() => setError("")} />}
      {mensaje && (
        <Aviso tipo="exito" mensaje={mensaje} onCerrar={() => setMensaje("")} />
      )}

      <FilaIndicadores>
        <Indicador
          etiqueta="Total de tarifas"
          valor={resumen.total}
          descripcion="Tipos de vehículos configurados"
          icono={Tags}
          cargando={cargando}
        />

        <Indicador
          etiqueta="Tarifas activas"
          valor={resumen.activas}
          descripcion="Disponibles para cobro"
          icono={CircleCheck}
          tono="verde"
          cargando={cargando}
        />

        <Indicador
          etiqueta="Tarifas inactivas"
          valor={resumen.inactivas}
          descripcion="Deshabilitadas"
          icono={Power}
          tono="ambar"
          cargando={cargando}
        />

        <Indicador
          etiqueta="Valor promedio"
          valor={formatoMoneda(resumen.promedio)}
          descripcion="Por minuto configurado"
          icono={CircleDollarSign}
          tono="morado"
          cargando={cargando}
        />
      </FilaIndicadores>

      {tiposSinTarifa.length > 0 && (
        <div className="pc-nota">
          <CircleDollarSign size={18} />
          <p>
            {tiposSinTarifa.length === 1
              ? `Falta configurar la tarifa de ${ETIQUETA_TIPO[tiposSinTarifa[0]]}.`
              : `Faltan las tarifas de ${tiposSinTarifa
                  .map((tipo) => ETIQUETA_TIPO[tipo])
                  .join(", ")}.`}{" "}
            Sin tarifa activa no se pueden registrar entradas de ese tipo.
          </p>
        </div>
      )}

      <section className="pc-vehiculos-listado">
        <BarraListado
          Icono={Tags}
          titulo="Listado de tarifas"
          descripcion="Consulta y administra los precios del parqueadero."
        >
          <label className="pc-busqueda-vehiculos">
            <Search size={16} />
            <input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar tipo, valor…"
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
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVAS">Activas</option>
              <option value="INACTIVAS">Inactivas</option>
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
            {filtradas.length} resultados
          </span>

          <span className="pc-listado-contexto-secundario">
            <Tags size={13} /> Tarifas por minuto
          </span>
        </div>

        {cargando ? (
          <TablaCargando mensaje="Consultando las tarifas configuradas…" />
        ) : filtradas.length === 0 ? (
          <TablaVacia
            titulo={
              tarifas.length === 0
                ? "Aún no hay tarifas configuradas"
                : "Sin resultados para este filtro"
            }
            mensaje={
              tarifas.length === 0
                ? "Configura el valor por minuto de motos, bicicletas y patinetas."
                : "Cambia el estado o limpia la búsqueda."
            }
            Icono={Tags}
            accion={
              tarifas.length === 0 ? (
                <button className="pc-accion-principal" onClick={abrirRegistro}>
                  <Plus size={17} />
                  Registrar tarifa
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="pc-tabla-scroll">
            <table className="pc-tabla-vehiculos">
              <thead>
                <tr>
                  <th>Tipo de vehículo</th>
                  <th>Identificador</th>
                  <th>Valor por minuto</th>
                  <th>Hora estimada</th>
                  <th>Fecha de creación</th>
                  <th>Estado</th>
                  <th className="pc-columna-acciones">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map((tarifa) => (
                  <tr key={tarifa.id}>
                    <td>
                      <div className="pc-vehiculo-identidad">
                        <span
                          className={`pc-vehiculo-icono ${claseIconoTipo(
                            tarifa.tipo_vehiculo
                          )}`}
                        >
                          <IconoTipo tipo={tarifa.tipo_vehiculo} />
                        </span>

                        <div className="pc-vehiculo-datos">
                          <strong>{ETIQUETA_TIPO[tarifa.tipo_vehiculo]}</strong>
                          <small>Tarifa por tiempo de permanencia</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="pc-placa-vehiculo">#{tarifa.id}</span>
                    </td>

                    <td>
                      <div className="pc-valor-celda">
                        <strong>{formatoMoneda(tarifa.valor_minuto)}</strong>
                        <small>Por minuto</small>
                      </div>
                    </td>

                    <td>
                      <div className="pc-valor-celda">
                        <strong>
                          {formatoMoneda(Number(tarifa.valor_minuto) * 60)}
                        </strong>
                        <small>Cada hora</small>
                      </div>
                    </td>

                    <td>{formatoFecha(tarifa.fecha_creacion)}</td>

                    <td>
                      <EtiquetaEstado
                        activo={tarifa.estado}
                        textoActivo="Activa"
                        textoInactivo="Inactiva"
                      />
                    </td>

                    <td>
                      <div className="pc-acciones-registro">
                        <button
                          type="button"
                          className="pc-accion-tabla pc-accion-editar"
                          title="Editar tarifa"
                          onClick={() => abrirEdicion(tarifa)}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          className="pc-accion-tabla pc-accion-desactivar"
                          title={
                            tarifa.estado ? "Desactivar tarifa" : "Activar tarifa"
                          }
                          onClick={() => void alternarEstado(tarifa)}
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
            Mostrando <strong>{filtradas.length}</strong> de{" "}
            <strong>{tarifas.length}</strong> tarifas
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
            aria-labelledby="titulo-modal-tarifa"
          >
            <header className="pc-modal-encabezado pc-modal-vehiculos-header">
              <div className="pc-modal-titulo-grupo">
                <span className="pc-modal-icono">
                  <Tags size={24} />
                </span>

                <div>
                  <span className="pc-migas">CONFIGURACIÓN DEL PARQUEADERO</span>
                  <h2 id="titulo-modal-tarifa">
                    {tarifaEditar ? "Editar tarifa" : "Registrar tarifa"}
                  </h2>
                  <p>
                    {tarifaEditar
                      ? "Actualiza el valor por minuto del tipo de vehículo."
                      : "Define el valor que se cobrará por minuto."}
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
                  <label>
                    Tipo de vehículo <span>*</span>
                    <select
                      value={formulario.tipo_vehiculo}
                      onChange={(evento) =>
                        setFormulario((actual) => ({
                          ...actual,
                          tipo_vehiculo: evento.target.value as TipoVehiculo,
                        }))
                      }
                      disabled={Boolean(tarifaEditar)}
                      required
                    >
                      {TIPOS.map((tipo) => (
                        <option
                          key={tipo}
                          value={tipo}
                          disabled={
                            !tarifaEditar &&
                            tarifas.some(
                              (tarifa) => tarifa.tipo_vehiculo === tipo
                            )
                          }
                        >
                          {ETIQUETA_TIPO[tipo]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Valor por minuto (COP) <span>*</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={formulario.valor_minuto}
                      onChange={(evento) =>
                        setFormulario((actual) => ({
                          ...actual,
                          valor_minuto: evento.target.value,
                        }))
                      }
                      required
                      placeholder="50"
                    />
                  </label>
                </div>

                {formulario.valor_minuto && (
                  <div className="pc-ayuda-formulario pc-ayuda-vehiculos">
                    <Wallet size={18} />
                    <p>
                      Equivale a{" "}
                      <strong>
                        {formatoMoneda(Number(formulario.valor_minuto) * 60)}
                      </strong>{" "}
                      por hora y{" "}
                      <strong>
                        {formatoMoneda(Number(formulario.valor_minuto) * 120)}
                      </strong>{" "}
                      por 2 horas de permanencia.
                    </p>
                  </div>
                )}

                <div className="pc-tipos-tarjeta">
                  {(["MOTO", "PATINETA", "BICICLETA"] as TipoVehiculo[]).map(
                    (tipo) => (
                      <span key={tipo} className="pc-tipo-tarjeta">
                        {tipo === "MOTO" ? (
                          <CarFront size={17} />
                        ) : tipo === "BICICLETA" ? (
                          <Bike size={17} />
                        ) : (
                          <Footprints size={17} />
                        )}
                        {ETIQUETA_TIPO[tipo]}
                      </span>
                    )
                  )}
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
                      {tarifaEditar ? <Pencil size={18} /> : <Plus size={18} />}
                      {tarifaEditar ? "Guardar cambios" : "Registrar tarifa"}
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
          <Tags size={12} /> Una tarifa por tipo de vehículo (Moto, Bicicleta,
          Patineta).
        </span>
        <span>
          <Wallet size={12} /> Solo el administrador puede modificar los precios.
        </span>
      </footer>
    </section>
  );
}
