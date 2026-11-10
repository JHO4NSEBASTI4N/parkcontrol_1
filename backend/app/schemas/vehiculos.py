from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class TipoVehiculo(str, Enum):
    MOTO = "MOTO"
    BICICLETA = "BICICLETA"
    PATINETA = "PATINETA"


class VehiculoBase(BaseModel):
    codigo: str = Field(min_length=1, max_length=20)
    placa: str | None = Field(default=None, max_length=20)
    tipo: TipoVehiculo
    marca: str | None = Field(default=None, max_length=50)
    modelo: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=30)


class VehiculoCrear(VehiculoBase):
    cliente_id: int = Field(gt=0)


class VehiculoActualizar(BaseModel):
    codigo: str | None = Field(default=None, min_length=1, max_length=20)
    placa: str | None = Field(default=None, max_length=20)
    tipo: TipoVehiculo | None = None
    marca: str | None = Field(default=None, max_length=50)
    modelo: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=30)
    cliente_id: int | None = Field(default=None, gt=0)
    estado: bool | None = None


class VehiculoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    placa: str | None
    tipo: str
    marca: str | None
    modelo: str | None
    color: str | None
    cliente_id: int
    estado: bool


class VehiculoDetallado(BaseModel):
    """Vehículo con datos del cliente y de su movimiento activo."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    placa: str | None
    tipo: str
    marca: str | None
    modelo: str | None
    color: str | None
    cliente_id: int
    cliente_nombre: str | None = None
    estado: bool
    en_parqueadero: bool = False
    movimiento_activo_id: int | None = None
    fecha_ingreso: str | None = None
    minutos_transcurridos: int | None = None
    tarifa_minuto: Decimal | None = None
    valor_estimado: Decimal | None = None
