import api from "./api";
import type { TipoVehiculo } from "./parqueadero";

/* =========================================================
   DASHBOARD
========================================================= */

export interface DashboardResumen {
  vehiculos_estacionados: number;
  ingresos_hoy: number | string;
  clientes_registrados: number;
  movimientos_hoy: number;
}

export interface ActividadReciente {
  id: number;
  vehiculo: string;
  placa: string | null;
  tipo: string;
  cliente: string | null;
  fecha_ingreso: string;
  fecha_salida: string | null;
  estado: string;
  valor_total: string | number | null;
}

export interface ContextoDashboard {
  usuario: {
    id: number;
    nombre: string;
    rol: "ADMIN" | "OPERADOR";
    modulo: string;
    modulos: string[];
    es_administrador: boolean;
  };
  totales: {
    vehiculos: number;
    clientes: number;
    tipos_vehiculo: number;
    salidas_hoy: number;
    recaudado_semana: string | number;
  };
}

export async function obtenerResumenDashboard(): Promise<DashboardResumen> {
  const respuesta = await api.get<DashboardResumen>("/api/dashboard/resumen");
  return respuesta.data;
}

export async function obtenerContextoDashboard(): Promise<ContextoDashboard> {
  const respuesta = await api.get<ContextoDashboard>(
    "/api/dashboard/contexto"
  );
  return respuesta.data;
}

export async function obtenerActividadReciente(): Promise<ActividadReciente[]> {
  const respuesta = await api.get<ActividadReciente[]>(
    "/api/dashboard/actividad"
  );
  return respuesta.data;
}

/* =========================================================
   REPORTES
========================================================= */

export type PeriodoReporte =
  | "hoy"
  | "ayer"
  | "semanal"
  | "quincenal"
  | "mensual"
  | "rango";

export interface OpcionesReporte {
  periodo: PeriodoReporte;
  desde?: string;
  hasta?: string;
  texto?: string;
  tipo?: TipoVehiculo | "";
  estado?: string;
  metodo?: string;
}

function parametros(opciones: OpcionesReporte) {
  const valores: Record<string, string> = { periodo: opciones.periodo };

  if (opciones.periodo === "rango") {
    if (opciones.desde) valores.desde = opciones.desde;
    if (opciones.hasta) valores.hasta = opciones.hasta;
  }

  if (opciones.texto) valores.texto = opciones.texto;
  if (opciones.tipo) valores.tipo = opciones.tipo;
  if (opciones.estado && opciones.estado !== "TODOS") {
    valores.estado = opciones.estado;
  }
  if (opciones.metodo && opciones.metodo !== "TODOS") {
    valores.metodo = opciones.metodo;
  }

  return valores;
}

export interface FilaReportePeriodo {
  fecha: string;
  entradas: number;
  salidas: number;
  pagos: number;
  recaudado: string | number;
}

export interface ReportePeriodo {
  desde: string;
  hasta: string;
  periodo: string;
  total_entradas: number;
  total_salidas: number;
  total_pagos: number;
  total_recaudado: string | number;
  promedio_diario: string | number;
  minutos_acumulados: number;
  dias_con_actividad: number;
  filas: FilaReportePeriodo[];
}

export interface ReporteConsolidado {
  periodo: string;
  desde: string;
  hasta: string;
  periodo_anterior_desde: string;
  periodo_anterior_hasta: string;
  total_entradas: number;
  total_salidas: number;
  total_pagos: number;
  total_recaudado: string | number;
  recaudado_periodo_anterior: string | number;
  variacion_recaudo: string | number;
  variacion_porcentual: string | number;
  promedio_diario: string | number;
  permanencia_promedio_minutos: number;
  dias_con_actividad: number;
  por_tipo_vehiculo: {
    tipo: TipoVehiculo;
    entradas: number;
    salidas: number;
    recaudado: string | number;
  }[];
  por_metodo_pago: {
    metodo: string;
    cantidad: number;
    total: string | number;
  }[];
}

export interface FilaMovimientoReporte {
  id: number;
  vehiculo_id: number;
  codigo: string | null;
  placa: string | null;
  tipo: TipoVehiculo | null;
  marca: string | null;
  modelo: string | null;
  cliente: string | null;
  documento: string | null;
  fecha_ingreso: string;
  fecha_salida: string | null;
  minutos: number | null;
  valor_total: string | number | null;
  estado: string;
  metodo_pago: string | null;
  usuario_ingreso: string | null;
}

export interface ReporteMovimientos {
  periodo: string;
  periodo_nombre: string;
  desde: string;
  hasta: string;
  filtros: { texto: string; estado: string; tipo: string };
  resumen: {
    entradas: number;
    salidas: number;
    pagos: number;
    recaudado: string | number;
    permanencia_promedio_minutos: number;
    promedio_diario: string | number;
  };
  filas: FilaMovimientoReporte[];
  filas_salidas: FilaMovimientoReporte[];
}

export interface FilaIngresoReporte {
  id: number;
  movimiento_id: number;
  valor: string | number;
  metodo_pago: string;
  fecha_pago: string;
  estado: string;
  vehiculo: string | null;
  placa: string | null;
  tipo: TipoVehiculo | null;
  cliente: string | null;
}

export interface ReporteIngresos {
  periodo: string;
  periodo_nombre: string;
  desde: string;
  hasta: string;
  resumen: {
    pagos: number;
    recaudado: string | number;
    ticket_promedio: string | number;
  };
  por_metodo: { metodo: string; cantidad: number; total: string | number }[];
  filas: FilaIngresoReporte[];
}

export interface FilaClienteReporte {
  id: number;
  nombre: string;
  documento: string;
  telefono: string | null;
  correo: string | null;
  estado: boolean;
  vehiculos: number;
  movimientos: number;
  total_pagado: string | number;
}

export interface ReporteClientes {
  periodo: string;
  periodo_nombre: string;
  desde: string;
  hasta: string;
  resumen: {
    clientes: number;
    activos: number;
    movimientos: number;
    recaudado: string | number;
  };
  filas: FilaClienteReporte[];
}

export interface FilaAnual {
  mes: number;
  entradas: number;
  salidas: number;
  recaudado: string | number;
}

export async function obtenerReportePeriodo(
  opciones: OpcionesReporte
): Promise<ReportePeriodo> {
  const respuesta = await api.get<ReportePeriodo>("/api/reportes/periodo", {
    params: parametros(opciones),
  });
  return respuesta.data;
}

export async function obtenerReporteConsolidado(
  opciones: OpcionesReporte
): Promise<ReporteConsolidado> {
  const respuesta = await api.get<ReporteConsolidado>(
    "/api/reportes/consolidado",
    { params: parametros(opciones) }
  );
  return respuesta.data;
}

export async function obtenerReporteMovimientos(
  opciones: OpcionesReporte
): Promise<ReporteMovimientos> {
  const respuesta = await api.get<ReporteMovimientos>(
    "/api/reportes/movimientos",
    { params: parametros(opciones) }
  );
  return respuesta.data;
}

export async function obtenerReporteIngresos(
  opciones: OpcionesReporte
): Promise<ReporteIngresos> {
  const respuesta = await api.get<ReporteIngresos>(
    "/api/reportes/ingresos",
    { params: parametros(opciones) }
  );
  return respuesta.data;
}

export async function obtenerReporteClientes(
  opciones: OpcionesReporte
): Promise<ReporteClientes> {
  const respuesta = await api.get<ReporteClientes>(
    "/api/reportes/clientes",
    { params: parametros(opciones) }
  );
  return respuesta.data;
}

export async function obtenerReporteAnual(anio: number): Promise<FilaAnual[]> {
  const respuesta = await api.get<FilaAnual[]>("/api/reportes/anual", {
    params: { anio },
  });
  return respuesta.data;
}
