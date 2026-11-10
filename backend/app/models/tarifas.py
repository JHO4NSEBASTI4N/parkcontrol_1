from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Numeric, String, text
from sqlalchemy.dialects.mysql import INTEGER
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Tarifa(Base):
    __tablename__ = "tarifas"

    __table_args__ = (
        CheckConstraint(
            "tipo_vehiculo IN ('MOTO', 'BICICLETA', 'PATINETA')",
            name="chk_tarifa_tipo",
        ),
        CheckConstraint("valor_minuto > 0", name="chk_tarifa_valor"),
    )

    id: Mapped[int] = mapped_column(
        INTEGER(unsigned=True), primary_key=True, autoincrement=True
    )
    tipo_vehiculo: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False
    )
    valor_minuto: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    estado: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("1"), nullable=False
    )
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=lambda: datetime.now(),
    )
