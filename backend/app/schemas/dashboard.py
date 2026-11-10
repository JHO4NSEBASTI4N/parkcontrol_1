from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class DashboardResumen(BaseModel):
    """Indicadores generales que se muestran en el panel."""

    vehiculos_estacionados: int
    ingresos_hoy: Decimal
    clientes_registrados: int
    movimientos_hoy: int


class ActividadReciente(BaseModel):
    """Últimos movimientos registrados (entradas y salidas)."""

    id: int
    vehiculo: str
    placa: str | None
    tipo: str
    cliente: str | None
    fecha_ingreso: datetime
    fecha_salida: datetime | None
    estado: str
    valor_total: Decimal | None
