from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class ClienteBase(BaseModel):
    
    nombre: str = Field(min_length=1, max_length=100)
    correo: EmailStr | None = None
    telefono: str | None = Field(default=None, max_length=20)
    documento: str = Field(min_length=1, max_length=20)


class ClienteCrear(ClienteBase):
    pass

class ClienteActualizar(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    correo: EmailStr | None = None
    telefono: str | None = Field(default=None, max_length=20)
    documento: str | None = Field(default=None, min_length=1, max_length=20)

class ClienteRespuesta(ClienteBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    estado: bool
    fecha_registro: datetime