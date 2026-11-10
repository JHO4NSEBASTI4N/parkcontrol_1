from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    correo: EmailStr
    rol: str = Field(default="OPERADOR", pattern=r"^(ADMIN|OPERADOR)$")


class UsuarioCrear(UsuarioBase):
    password: str = Field(min_length=8, max_length=100)


class UsuarioActualizar(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    correo: EmailStr | None = None
    rol: str | None = Field(default=None, pattern=r"^(ADMIN|OPERADOR)$")
    password: str | None = Field(default=None, min_length=8, max_length=100)
    estado: bool | None = None


class UsuarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    correo: EmailStr
    rol: str
    estado: bool
    fecha_creacion: datetime
    fecha_actualizacion: datetime


class UsuarioSesion(BaseModel):
    """Datos del usuario autenticado que consume el frontend."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    correo: EmailStr
    rol: str
    estado: bool
    modulo: str
    modulos: list[str]
    permisos: list[str]
