from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PagoCrear(BaseModel):
    movimiento_id: int = Field(gt=0)
    valor: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    metodo_pago: str = Field(pattern=r"^(EFECTIVO|TARJETA|TRANSFERENCIA)$")


class PagoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    movimiento_id: int
    valor: Decimal
    metodo_pago: str
    fecha_pago: datetime
    estado: str


class PagoDetallado(BaseModel):
    id: int
    movimiento_id: int
    valor: Decimal
    metodo_pago: str
    fecha_pago: datetime
    estado: str
    vehiculo_codigo: str | None = None
    placa: str | None = None
    tipo: str | None = None
    cliente_nombre: str | None = None
    fecha_ingreso: datetime | None = None
    fecha_salida: datetime | None = None
    minutos: int | None = None
