import { useCallback, useEffect, useMemo, useState } from "react";
import { strToU8, zipSync } from "fflate";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Coins,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Timer,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import EncabezadoModulo from "../componentes/EncabezadoModulo";
import { useSesion } from "../contexto/SesionContext";
import {
  Aviso,
  BarraListado,
  FilaIndicadores,
  Indicador,
  TablaCargando,
  TablaVacia,
} from "../componentes/Indicadores";
import { IconoTipo } from "../componentes/IconosTipo";
import {
  obtenerReporteClientes,
  obtenerReporteConsolidado,
  obtenerReporteIngresos,
  obtenerReporteMovimientos,
  obtenerReportePeriodo,
  type FilaClienteReporte,
  type FilaMovimientoReporte,
  type OpcionesReporte,
  type PeriodoReporte,
  type ReporteClientes,
  type ReporteConsolidado,
  type ReporteIngresos,
  type ReporteMovimientos,
  type ReportePeriodo,
} from "../services/dashboard";
import {
  ETIQUETA_METODO,
  ETIQUETA_TIPO,
  fechaISO,
  formatoDuracion,
  formatoFecha,
  formatoFechaHora,
  formatoMoneda,
  formatoNumero,
  mensajeError,
  type TipoVehiculo,
} from "../services/parqueadero";

type Pestana = "movimientos" | "ingresos" | "clientes";

const PERIODOS: { valor: PeriodoReporte; etiqueta: string }[] = [
  { valor: "hoy", etiqueta: "Hoy" },
  { valor: "ayer", etiqueta: "Ayer" },
  { valor: "semanal", etiqueta: "Reporte semanal" },
  { valor: "quincenal", etiqueta: "Reporte quincenal" },
  { valor: "mensual", etiqueta: "Reporte mensual" },
  { valor: "rango", etiqueta: "Rango personalizado" },
];

const PESTANAS: { valor: Pestana; etiqueta: string }[] = [
  { valor: "movimientos", etiqueta: "Movimientos" },
  { valor: "ingresos", etiqueta: "Ingresos y salidas" },
  { valor: "clientes", etiqueta: "Clientes" },
];

function hoyISO(): string {
  return fechaISO(new Date());
}

function haceDiasISO(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fechaISO(fecha);
}

function descargarExcel(
  nombre: string,
  encabezados: string[],
  filas: (string | number | null)[][]
) {
  const tabla = [encabezados, ...filas];
  const escaparXml = (valor: string) => valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
  const columnaExcel = (indice: number) => {
    let numero = indice + 1;
    let columna = "";
    while (numero > 0) {
      const resto = (numero - 1) % 26;
      columna = String.fromCharCode(65 + resto) + columna;
      numero = Math.floor((numero - 1) / 26);
    }
    return columna;
  };
  const filasXml = tabla.map((fila, indiceFila) => {
    const celdas = fila.map((valor, indiceColumna) => {
      const referencia = `${columnaExcel(indiceColumna)}${indiceFila + 1}`;
      if (typeof valor === "number" && Number.isFinite(valor)) {
        return `<c r="${referencia}"><v>${valor}</v></c>`;
      }
      return `<c r="${referencia}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(String(valor ?? ""))}</t></is></c>`;
    }).join("");
    return `<row r="${indiceFila + 1}">${celdas}</row>`;
  }).join("");
  const xml = (contenido: string) => strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${contenido}`
  );
  const archivo = zipSync({
    "[Content_Types].xml": xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
    "_rels/.rels": xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    "xl/workbook.xml": xml('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Reporte" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    "xl/_rels/workbook.xml.rels": xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
    "xl/worksheets/sheet1.xml": xml(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${filasXml}</sheetData></worksheet>`),
  });
  const blob = new Blob([archivo], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `${nombre}.xlsx`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export default function Reportes() {
  const { esAdministrador } = useSesion();
  const [periodo, setPeriodo] = useState<PeriodoReporte>(esAdministrador ? "semanal" : "hoy");
  const [desde, setDesde] = useState(haceDiasISO(6));
  const [hasta, setHasta] = useState(hoyISO());
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<TipoVehiculo | "">("");
  const [estado, setEstado] = useState("TODOS");

  const [consolidado, setConsolidado] = useState<ReporteConsolidado | null>(null);
  const [periodoDatos, setPeriodoDatos] = useState<ReportePeriodo | null>(null);
  const [movimientos, setMovimientos] = useState<ReporteMovimientos | null>(null);
  const [ingresos, setIngresos] = useState<ReporteIngresos | null>(null);
  const [clientes, setClientes] = useState<ReporteClientes | null>(null);

  const [pestana, setPestana] = useState<Pestana>("movimientos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const opciones = useMemo<OpcionesReporte>(
    () => ({
      periodo,
      desde: periodo === "rango" ? desde : undefined,
      hasta: periodo === "rango" ? hasta : undefined,
      texto: texto.trim() || undefined,
      tipo: tipo || undefined,
      estado,
    }),
    [periodo, desde, hasta, texto, tipo, estado]
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      if (!esAdministrador) {
        const datosMovimientos = await obtenerReporteMovimientos({
          ...opciones,
          periodo: "hoy",
          desde: undefined,
          hasta: undefined,
        });
        const movimientosDelDia = new Map<number, FilaMovimientoReporte>();
        [...datosMovimientos.filas, ...datosMovimientos.filas_salidas].forEach((fila) => {
          movimientosDelDia.set(fila.id, fila);
        });
        setMovimientos({
          ...datosMovimientos,
          filas: [...movimientosDelDia.values()].sort((a, b) => b.id - a.id),
        });
        setConsolidado(null);
        setPeriodoDatos(null);
        setIngresos(null);
        setClientes(null);
        return;
      }

      const [datosConsolidado, datosPeriodo, datosMovimientos, datosIngresos, datosClientes] =
        await Promise.all([
          obtenerReporteConsolidado(opciones),
          obtenerReportePeriodo(opciones),
          obtenerReporteMovimientos(opciones),
          obtenerReporteIngresos(opciones),
          obtenerReporteClientes(opciones),
        ]);

      setConsolidado(datosConsolidado);
      setPeriodoDatos(datosPeriodo);
      const todosLosMovimientos = new Map<number, FilaMovimientoReporte>();
      [...datosMovimientos.filas, ...datosMovimientos.filas_salidas].forEach((fila) => {
        todosLosMovimientos.set(fila.id, fila);
      });
      setMovimientos({
        ...datosMovimientos,
        filas: [...todosLosMovimientos.values()].sort((a, b) => b.id - a.id),
      });
      setIngresos(datosIngresos);
      setClientes(datosClientes);
    } catch (errorApi: unknown) {
      setError(mensajeError(errorApi));
    } finally {
      setCargando(false);
    }
  }, [opciones, esAdministrador]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const maximoDiario = useMemo(() => {
    if (!periodoDatos?.filas.length) return 0;

    return Math.max(
      ...periodoDatos.filas.map((fila) => Number(fila.recaudado)),
      1
    );
  }, [periodoDatos]);

  const variacion = Number(consolidado?.variacion_porcentual ?? 0);
  const positivo = variacion >= 0;

  const filasClientes: FilaClienteReporte[] = clientes?.filas ?? [];
  const filasMovimientos: FilaMovimientoReporte[] = movimientos?.filas ?? [];
  const cantidadExportable = pestana === "movimientos"
    ? filasMovimientos.length
    : pestana === "ingresos"
      ? ingresos?.filas.length ?? 0
      : filasClientes.length;

  function exportar(formato: "excel" | "pdf") {
    const nombreReporte = pestana === "movimientos"
      ? "movimientos"
      : pestana === "ingresos"
        ? "ingresos"
        : "clientes";
    const nombre = `parkcontrol-${nombreReporte}-${esAdministrador ? periodo : "hoy"}`;
    let encabezados: string[];
    let filas: (string | number | null)[][];

    if (pestana === "movimientos" && movimientos) {
      encabezados = ["ID", "Vehículo", "Placa", "Tipo", "Cliente", "Documento", "Ingreso", "Salida", "Minutos", "Valor", "Estado"];
      filas = movimientos.filas.map((fila) => [fila.id, fila.codigo, fila.placa, fila.tipo, fila.cliente, fila.documento, fila.fecha_ingreso, fila.fecha_salida, fila.minutos, fila.valor_total, fila.estado]);
    } else if (pestana === "ingresos" && ingresos) {
      encabezados = ["Pago", "Movimiento", "Vehículo", "Placa", "Cliente", "Fecha", "Valor", "Método", "Estado"];
      filas = ingresos.filas.map((fila) => [fila.id, fila.movimiento_id, fila.vehiculo, fila.placa, fila.cliente, fila.fecha_pago, fila.valor, fila.metodo_pago, fila.estado]);
    } else if (pestana === "clientes" && clientes) {
      encabezados = ["Cliente", "Documento", "Teléfono", "Correo", "Vehículos", "Movimientos", "Total pagado", "Estado"];
      filas = filasClientes.map((fila) => [fila.nombre, fila.documento, fila.telefono, fila.correo, fila.vehiculos, fila.movimientos, fila.total_pagado, fila.estado ? "Activo" : "Inactivo"]);
    } else {
      return;
    }

    if (formato === "excel") {
      descargarExcel(nombre, encabezados, filas);
      return;
    }

    const documento = new jsPDF({ orientation: "landscape" });
    documento.setFontSize(16);
    documento.text(`ParkControl · Reporte de ${nombreReporte}`, 14, 15);
    documento.setFontSize(10);
    documento.text(`Periodo: ${esAdministrador ? (PERIODOS.find((item) => item.valor === periodo)?.etiqueta ?? periodo) : "Hoy"}`, 14, 22);
    autoTable(documento, {
      head: [encabezados],
      body: filas.map((fila) => fila.map((celda) => String(celda ?? "—"))),
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 108] },
      margin: { left: 14, right: 14 },
    });
    documento.save(`${nombre}.pdf`);
  }

  return (
    <section className="pc-modulo pc-vehiculos">
      <EncabezadoModulo
        seccion="Informes"
        titulo={esAdministrador ? "Reportes del parqueadero" : "Movimientos del día"}
        descripcion={esAdministrador ? "Filtra y consulta movimientos, ingresos y clientes por periodo." : "Consulta y descarga únicamente los movimientos registrados hoy."}
        accion={
          <div className="pc-acciones-encabezado">
            <button className="pc-boton-secundario" onClick={() => exportar("excel")} disabled={cargando || cantidadExportable === 0}>
              <FileSpreadsheet size={16} />
              Descargar Excel
            </button>
            <button className="pc-boton-secundario" onClick={() => exportar("pdf")} disabled={cargando || cantidadExportable === 0}>
              <Download size={16} />
              Descargar PDF
            </button>

            <button
              className="pc-boton-secundario"
              onClick={() => void cargar()}
              disabled={cargando}
            >
              <RefreshCw size={16} className={cargando ? "pc-girando" : ""} />
              Actualizar
            </button>
          </div>
        }
      />

      {error && <Aviso tipo="error" mensaje={error} onCerrar={() => setError("")} />}

      <section className="pc-filtros-reportes">
        <div className="pc-filtros-fila">
          <label className="pc-filtro-campo">
            <span>Periodo</span>
            <select
              value={esAdministrador ? periodo : "hoy"}
              disabled={!esAdministrador}
              onChange={(evento) => {
                const valor = evento.target.value as PeriodoReporte;
                setPeriodo(valor);

                if (valor === "semanal") {
                  setDesde(haceDiasISO(6));
                  setHasta(hoyISO());
                } else if (valor === "quincenal") {
                  setDesde(haceDiasISO(14));
                  setHasta(hoyISO());
                } else if (valor === "mensual") {
                  setDesde(haceDiasISO(29));
                  setHasta(hoyISO());
                } else if (valor === "hoy") {
                  setDesde(hoyISO());
                  setHasta(hoyISO());
                } else if (valor === "ayer") {
                  setDesde(haceDiasISO(1));
                  setHasta(haceDiasISO(1));
                }
              }}
            >
              {PERIODOS.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.etiqueta}
                </option>
              ))}
            </select>
          </label>

          {esAdministrador && periodo === "rango" && (
            <>
              <label className="pc-filtro-campo">
                <span>Desde</span>
                <input
                  type="date"
                  value={desde}
                  max={hasta}
                  onChange={(evento) => setDesde(evento.target.value)}
                />
              </label>

              <label className="pc-filtro-campo">
                <span>Hasta</span>
                <input
                  type="date"
                  value={hasta}
                  min={desde}
                  max={hoyISO()}
                  onChange={(evento) => setHasta(evento.target.value)}
                />
              </label>
            </>
          )}

          <label className="pc-filtro-campo pc-filtro-busqueda">
            <span>Buscar</span>
            <div className="pc-filtro-input-icono">
              <Search size={15} />
              <input
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                placeholder="Placa, código, cliente o documento"
              />
              {texto && (
                <button
                  type="button"
                  onClick={() => setTexto("")}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </label>

          <label className="pc-filtro-campo">
            <span>Tipo</span>
            <select
              value={tipo}
              onChange={(evento) =>
                setTipo(evento.target.value as TipoVehiculo | "")
              }
            >
              <option value="">Todos</option>
              <option value="MOTO">Moto</option>
              <option value="BICICLETA">Bicicleta</option>
              <option value="PATINETA">Patineta</option>
            </select>
          </label>

          <label className="pc-filtro-campo">
            <span>Estado</span>
            <select
              value={estado}
              onChange={(evento) => setEstado(evento.target.value)}
            >
              <option value="TODOS">Todos</option>
              <option value="ACTIVO">En parqueadero</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>
        </div>

        <div className="pc-filtros-pie">
          <span>
            <CalendarDays size={14} />
            {periodoDatos
              ? `${formatoFecha(periodoDatos.desde)} — ${formatoFecha(
                  new Date(
                    new Date(periodoDatos.hasta).getTime() - 86400000
                  ).toISOString()
                )}`
              : esAdministrador ? "Calculando rango…" : "Movimientos de hoy"}
          </span>

          <span>
            {consolidado
              ? `${consolidado.dias_con_actividad} días con actividad`
              : ""}
          </span>
        </div>
      </section>

      {esAdministrador && (
      <>
      <FilaIndicadores>
        <Indicador
          etiqueta="Total recaudado"
          valor={formatoMoneda(consolidado?.total_recaudado ?? 0)}
          descripcion={
            consolidado
              ? `Periodo anterior ${formatoMoneda(
                  consolidado.recaudado_periodo_anterior
                )}`
              : "Pagos confirmados"
          }
          icono={Coins}
          cargando={cargando}
        />

        <Indicador
          etiqueta="Entradas registradas"
          valor={formatoNumero(consolidado?.total_entradas ?? 0)}
          descripcion={`${formatoNumero(
            consolidado?.total_salidas ?? 0
          )} salidas en el periodo`}
          icono={TrendingUp}
          tono="verde"
          cargando={cargando}
        />

        <Indicador
          etiqueta="Permanencia promedio"
          valor={formatoDuracion(consolidado?.permanencia_promedio_minutos ?? 0)}
          descripcion={`${formatoNumero(
            consolidado?.total_pagos ?? 0
          )} pagos registrados`}
          icono={Timer}
          tono="ambar"
          cargando={cargando}
        />

        <Indicador
          etiqueta="Variación del recaudo"
          valor={
            <span className={positivo ? "pc-variacion-positiva" : "pc-variacion-negativa"}>
              {positivo ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
              {`${positivo ? "+" : ""}${variacion.toFixed(1)}%`}
            </span>
          }
          descripcion={`Vs. periodo anterior · ${formatoMoneda(
            consolidado?.variacion_recaudo ?? 0
          )}`}
          icono={BarChart3}
          tono={positivo ? "morado" : "rojo"}
          cargando={cargando}
        />
      </FilaIndicadores>

      <div className="pc-reportes-grid">
        <section className="pc-panel">
          <div className="pc-panel-encabezado">
            <div>
              <h3>Recaudo diario</h3>
              <p>Pagos confirmados por día dentro del periodo.</p>
            </div>

            <span className="pc-promedio-diario">
              Promedio {formatoMoneda(consolidado?.promedio_diario ?? 0)}
            </span>
          </div>

          {cargando && !periodoDatos ? (
            <div className="pc-grafico-cargando">
              <span className="pc-spinner" />
            </div>
          ) : (
            <div className="pc-grafico">
              {(periodoDatos?.filas ?? []).map((fila) => {
                const altura = maximoDiario
                  ? Math.max(4, (Number(fila.recaudado) / maximoDiario) * 100)
                  : 4;

                return (
                  <div className="pc-grafico-columna" key={fila.fecha}>
                    <span className="pc-grafico-valor">
                      {Number(fila.recaudado) > 0
                        ? formatoMoneda(fila.recaudado)
                        : ""}
                    </span>

                    <div className="pc-grafico-barra-fondo">
                      <div
                        className="pc-grafico-barra"
                        style={{ height: `${altura}%` }}
                        title={`${formatoFecha(fila.fecha)} · ${formatoMoneda(
                          fila.recaudado
                        )}`}
                      />
                    </div>

                    <span className="pc-grafico-etiqueta">
                      {new Date(`${fila.fecha}T00:00:00`).toLocaleDateString(
                        "es-CO",
                        { day: "2-digit", month: "short" }
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="pc-panel pc-panel-lateral">
          <div className="pc-panel-encabezado">
            <div>
              <h3>Distribución</h3>
              <p>Recaudo por tipo de vehículo y método de pago.</p>
            </div>
          </div>

          <div className="pc-distribucion">
            {(consolidado?.por_tipo_vehiculo ?? []).map((fila) => {
              const total = Number(consolidado?.total_recaudado ?? 0) || 1;
              const porcentaje = (Number(fila.recaudado) / total) * 100;

              return (
                <div className="pc-distribucion-fila" key={fila.tipo}>
                  <div className="pc-distribucion-cabecera">
                    <span className="pc-distribucion-tipo">
                      <IconoTipo tipo={fila.tipo} tamano={15} />
                      {ETIQUETA_TIPO[fila.tipo]}
                    </span>

                    <strong>{formatoMoneda(fila.recaudado)}</strong>
                  </div>

                  <div className="pc-barra-progreso">
                    <div
                      className={`pc-barra-progreso-relleno pc-relleno-${fila.tipo.toLowerCase()}`}
                      style={{ width: `${Math.min(100, porcentaje)}%` }}
                    />
                  </div>

                  <span className="pc-distribucion-detalle">
                    {fila.entradas} entradas · {fila.salidas} salidas
                  </span>
                </div>
              );
            })}

            <div className="pc-metodos-pago">
              {(consolidado?.por_metodo_pago ?? []).length === 0 && (
                <span className="pc-texto-tenue">
                  Aún no hay pagos en este periodo.
                </span>
              )}

              {(consolidado?.por_metodo_pago ?? []).map((fila) => (
                <span className="pc-metodo-chip" key={fila.metodo}>
                  {ETIQUETA_METODO[fila.metodo] ?? fila.metodo}
                  <strong>{formatoMoneda(fila.total)}</strong>
                  <small>{fila.cantidad} pagos</small>
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      </>
      )}

      <section className="pc-vehiculos-listado">
        <BarraListado
          Icono={BarChart3}
          titulo="Detalle del reporte"
          descripcion={esAdministrador ? "Aplica filtros y descarga los reportes en Excel o PDF." : "Movimientos del día disponibles para consulta y descarga."}
        >
          <div className="pc-pestanas">
            {PESTANAS.filter((item) => esAdministrador || item.valor === "movimientos").map((item) => (
              <button
                key={item.valor}
                className={`pc-pestana ${
                  pestana === item.valor ? "pc-pestana-activa" : ""
                }`}
                onClick={() => setPestana(item.valor)}
              >
                {item.etiqueta}
              </button>
            ))}
          </div>
        </BarraListado>

        {cargando ? (
          <TablaCargando mensaje="Calculando el reporte con los filtros aplicados…" />
        ) : pestana === "movimientos" ? (
          filasMovimientos.length === 0 ? (
            <TablaVacia
              titulo="Sin movimientos en el periodo"
              mensaje="Ajusta el periodo, el tipo de vehículo o el texto de búsqueda."
              Icono={FileSpreadsheet}
            />
          ) : (
            <div className="pc-tabla-scroll">
              <table className="pc-tabla-vehiculos">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vehículo</th>
                    <th>Tipo</th>
                    <th>Cliente</th>
                    <th>Ingreso</th>
                    <th>Salida</th>
                    <th>Tiempo</th>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Registró</th>
                  </tr>
                </thead>

                <tbody>
                  {filasMovimientos.map((fila) => (
                    <tr key={fila.id}>
                      <td>#{fila.id}</td>

                      <td>
                        <div className="pc-vehiculo-datos">
                          <strong>{fila.codigo ?? "—"}</strong>
                          <small>{fila.placa ?? "Sin placa"}</small>
                        </div>
                      </td>

                      <td>{fila.tipo ? ETIQUETA_TIPO[fila.tipo] : "—"}</td>

                      <td>
                        <div className="pc-vehiculo-datos">
                          <strong>{fila.cliente ?? "—"}</strong>
                          <small>{fila.documento ?? ""}</small>
                        </div>
                      </td>

                      <td>{formatoFechaHora(fila.fecha_ingreso)}</td>
                      <td>{formatoFechaHora(fila.fecha_salida)}</td>
                      <td>{formatoDuracion(fila.minutos)}</td>

                      <td>
                        <strong className="pc-valor-fuerte">
                          {formatoMoneda(fila.valor_total ?? 0)}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`pc-estado-etiqueta ${
                            fila.estado === "ACTIVO"
                              ? "activo"
                              : fila.estado === "FINALIZADO"
                                ? "finalizado"
                                : "cancelado"
                          }`}
                        >
                          <span className="pc-estado-punto" />
                          {fila.estado}
                        </span>
                      </td>

                      <td>{fila.usuario_ingreso ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : pestana === "ingresos" ? (
          (ingresos?.filas ?? []).length === 0 ? (
            <TablaVacia
              titulo="Sin ingresos en el periodo"
              mensaje="No se registraron pagos con los filtros actuales."
              Icono={Coins}
            />
          ) : (
            <div className="pc-tabla-scroll">
              <table className="pc-tabla-vehiculos">
                <thead>
                  <tr>
                    <th>Pago</th>
                    <th>Vehículo</th>
                    <th>Cliente</th>
                    <th>Fecha de pago</th>
                    <th>Método</th>
                    <th>Valor</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {(ingresos?.filas ?? []).map((fila) => (
                    <tr key={fila.id}>
                      <td>#{fila.id}</td>

                      <td>
                        <div className="pc-vehiculo-datos">
                          <strong>{fila.vehiculo ?? "—"}</strong>
                          <small>{fila.placa ?? "Sin placa"}</small>
                        </div>
                      </td>

                      <td>{fila.cliente ?? "—"}</td>
                      <td>{formatoFechaHora(fila.fecha_pago)}</td>
                      <td>
                        {ETIQUETA_METODO[fila.metodo_pago] ?? fila.metodo_pago}
                      </td>

                      <td>
                        <strong className="pc-valor-fuerte">
                          {formatoMoneda(fila.valor)}
                        </strong>
                      </td>

                      <td>
                        <span className="pc-estado-etiqueta activo">
                          <span className="pc-estado-punto" />
                          {fila.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filasClientes.length === 0 ? (
          <TablaVacia
            titulo="Sin clientes para el filtro"
            mensaje="Prueba con otro término de búsqueda."
            Icono={Users}
          />
        ) : (
          <div className="pc-tabla-scroll">
            <table className="pc-tabla-vehiculos">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Vehículos</th>
                  <th>Movimientos</th>
                  <th>Total pagado</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {filasClientes.map((fila) => (
                  <tr key={fila.id}>
                    <td>
                      <div className="pc-vehiculo-datos">
                        <strong>{fila.nombre}</strong>
                        <small>Cliente #{fila.id}</small>
                      </div>
                    </td>

                    <td>
                      <span className="pc-placa-vehiculo">{fila.documento}</span>
                    </td>

                    <td>
                      <div className="pc-cliente-contacto">
                        <span>{fila.telefono ?? "Sin teléfono"}</span>
                        <span>{fila.correo ?? "Sin correo"}</span>
                      </div>
                    </td>

                    <td>{fila.vehiculos}</td>
                    <td>{fila.movimientos}</td>

                    <td>
                      <strong className="pc-valor-fuerte">
                        {formatoMoneda(fila.total_pagado)}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`pc-estado-etiqueta ${
                          fila.estado ? "activo" : "inactivo"
                        }`}
                      >
                        <span className="pc-estado-punto" />
                        {fila.estado ? "Activo" : "Inactivo"}
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
            {pestana === "movimientos" && (
              <>
                <strong>{movimientos?.filas.length ?? 0}</strong> movimientos ·{" "}
                <strong>
                  {formatoMoneda(movimientos?.resumen.recaudado ?? 0)}
                </strong>{" "}
                recaudados
              </>
            )}

            {pestana === "ingresos" && (
              <>
                <strong>{ingresos?.resumen.pagos ?? 0}</strong> pagos · Ticket
                promedio{" "}
                <strong>{formatoMoneda(ingresos?.resumen.ticket_promedio ?? 0)}</strong>
              </>
            )}

            {pestana === "clientes" && (
              <>
                <strong>{clientes?.resumen.clientes ?? 0}</strong> clientes ·{" "}
                <strong>{clientes?.resumen.activos ?? 0}</strong> activos
              </>
            )}
          </span>

          <span>
            <FileSpreadsheet size={15} />
            Descargable en Excel y PDF
          </span>
        </footer>
      </section>

      <footer className="pc-footer">
        <span>
          <BarChart3 size={12} /> {esAdministrador ? "Reportes calculados sobre pagos confirmados." : "Reporte limitado a los movimientos registrados hoy."}
        </span>
        {esAdministrador && <span>
          <CalendarDays size={12} /> Periodos: hoy, ayer, semanal, quincenal y mensual.
        </span>}
      </footer>
    </section>
  );
}
