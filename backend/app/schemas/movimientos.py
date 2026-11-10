from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class MovimientoCrear(BaseModel):
    vehiculo_id: int = Field(gt=0)
    usuario_ingreso_id: int | None = Field(gt=0, default=None)


class MovimientoFinalizar(BaseModel):
    usuario_salida_id: int | None = Field(gt=0, default=None)


class MovimientoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehiculo_id: int
    usuario_ingreso_id: int | None
    usuario_salida_id: int | None
    fecha_ingreso: datetime
    fecha_salida: datetime | None
    minutos: int | None
    valor_total: Decimal | None
    estado: str


class MovimientoDetallado(BaseModel):
    """Movimiento con la información del vehículo, cliente y pago."""

    id: int
    vehiculo_id: int
    vehiculo_codigo: str | None = None
    placa: str | None = None
    tipo: str | None = None
    marca: str | None = None
    modelo: str | None = None
    cliente_id: int | None = None
    cliente_nombre: str | None = None
    usuario_ingreso: str | None = None
    usuario_salida: str | None = None
    fecha_ingreso: datetime
    fecha_salida: datetime | None = None
    minutos: int | None = None
    valor_total: Decimal | None = None
    estado: str
    minutos_transcurridos: int | None = None
    valor_estimado: Decimal | None = None
    tarifa_minuto: Decimal | None = None
    pago_id: int | None = None
    metodo_pago: str | None = None
