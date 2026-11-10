from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class FilaReporte(BaseModel):
    """Resumen de un día del periodo consultado."""

    fecha: date
    entradas: int = 0
    salidas: int = 0
    pagos: int = 0
    recaudado: Decimal = Decimal("0.00")


class ReportePeriodo(BaseModel):
    desde: datetime
    hasta: datetime
    periodo: str
    total_entradas: int
    total_salidas: int
    total_pagos: int
    total_recaudado: Decimal
    promedio_diario: Decimal
    minutos_acumulados: int
    dias_con_actividad: int
    filas: list[FilaReporte]


class FilaTipoVehiculo(BaseModel):
    tipo: str
    entradas: int
    salidas: int
    recaudado: Decimal


class FilaMetodoPago(BaseModel):
    metodo: str
    cantidad: int
    total: Decimal


class ReporteConsolidado(BaseModel):
    periodo: str
    desde: datetime
    hasta: datetime
    periodo_anterior_desde: datetime
    periodo_anterior_hasta: datetime
    total_entradas: int
    total_salidas: int
    total_pagos: int
    total_recaudado: Decimal
    recaudado_periodo_anterior: Decimal
    variacion_recaudo: Decimal
    variacion_porcentual: Decimal
    promedio_diario: Decimal
    permanencia_promedio_minutos: int
    dias_con_actividad: int
    por_tipo_vehiculo: list[FilaTipoVehiculo]
    por_metodo_pago: list[FilaMetodoPago]
