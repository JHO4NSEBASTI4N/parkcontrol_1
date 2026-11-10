from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class TarifaBase(BaseModel):
    tipo_vehiculo: str = Field(pattern=r"^(MOTO|BICICLETA|PATINETA)$")
    valor_minuto: Decimal = Field(gt=0, max_digits=10, decimal_places=2)


class TarifaCrear(TarifaBase):
    pass


class TarifaActualizar(BaseModel):
    tipo_vehiculo: str | None = Field(
        default=None, pattern=r"^(MOTO|BICICLETA|PATINETA)$"
    )
    valor_minuto: Decimal | None = Field(
        default=None, gt=0, max_digits=10, decimal_places=2
    )
    estado: bool | None = None


class TarifaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo_vehiculo: str
    valor_minuto: Decimal
    estado: bool
    fecha_creacion: datetime
    fecha_actualizacion: datetime
