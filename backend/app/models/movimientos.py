from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, text
from sqlalchemy.dialects.mysql import INTEGER as MYSQL_INTEGER
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Movimiento(Base):
    __tablename__ = "movimientos"

    __table_args__ = (
        CheckConstraint(
            "estado IN ('ACTIVO', 'FINALIZADO', 'CANCELADO')",
            name="chk_movimiento_estado",
        ),
    )

    id: Mapped[int] = mapped_column(
        MYSQL_INTEGER(unsigned=True), primary_key=True, autoincrement=True
    )
    vehiculo_id: Mapped[int] = mapped_column(
        MYSQL_INTEGER(unsigned=True),
        ForeignKey("vehiculos.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    usuario_ingreso_id: Mapped[int | None] = mapped_column(
        MYSQL_INTEGER(unsigned=True),
        ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    usuario_salida_id: Mapped[int | None] = mapped_column(
        MYSQL_INTEGER(unsigned=True),
        ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    fecha_ingreso: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"), index=True
    )
    fecha_salida: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    minutos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    valor_total: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'ACTIVO'"), index=True
    )

    vehiculo = relationship("Vehiculo", back_populates="movimientos")
    usuario_ingreso = relationship(
        "Usuario",
        foreign_keys=[usuario_ingreso_id],
        back_populates="movimientos_ingreso",
    )
    usuario_salida = relationship(
        "Usuario",
        foreign_keys=[usuario_salida_id],
        back_populates="movimientos_salida",
    )
    pago = relationship("Pago", back_populates="movimiento", uselist=False)
