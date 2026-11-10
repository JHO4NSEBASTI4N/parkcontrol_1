from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, text
from sqlalchemy.dialects.mysql import INTEGER
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(
        INTEGER(unsigned=True), primary_key=True, autoincrement=True
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    correo: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(20), default="OPERADOR", nullable=False)
    estado: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("1"), nullable=False
    )
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    # En la tabla la columna se llama "fecha_actualizacion" (ver PARKCONTROL.sql).
    # Se conserva el nombre "fecha_actualizacion"; la propiedad
    # "fecha_ultima_actualizacion" queda como alias de compatibilidad.
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        "fecha_actualizacion",
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    movimientos_ingreso = relationship(
        "Movimiento",
        back_populates="usuario_ingreso",
        foreign_keys="[Movimiento.usuario_ingreso_id]",
    )
    movimientos_salida = relationship(
        "Movimiento",
        back_populates="usuario_salida",
        foreign_keys="[Movimiento.usuario_salida_id]",
    )

    @property
    def fecha_ultima_actualizacion(self) -> datetime:
        """Alias antiguo para no romper el código que ya lo usaba."""
        return self.fecha_actualizacion
