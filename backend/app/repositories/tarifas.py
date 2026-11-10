from sqlalchemy import Select
from sqlalchemy.orm import Session

from app.models.tarifas import Tarifa
from app.schemas.tarifas import TarifaActualizar, TarifaCrear


class TarifaRepositorio:

    def listar(self, db: Session) -> list[Tarifa]:
        consulta: Select[Tarifa] = Select(Tarifa).order_by(Tarifa.id)
        return list(db.scalars(consulta).all())

    def obtener_por_id(self, db: Session, tarifa_id: int) -> Tarifa | None:
        return db.get(Tarifa, tarifa_id)

    def obtener_por_tipo(self, db: Session, tipo_vehiculo: str) -> Tarifa | None:
        consulta: Select[Tarifa] = Select(Tarifa).where(
            Tarifa.tipo_vehiculo == tipo_vehiculo
        )
        return db.scalars(consulta).first()

    def crear(self, db: Session, datos: TarifaCrear) -> Tarifa:
        datos_limpios = datos.model_dump()
        datos_limpios["tipo_vehiculo"] = str(datos.tipo_vehiculo)

        tarifa = Tarifa(**datos_limpios)
        db.add(tarifa)
        db.flush()
        return tarifa

    def actualizar(
        self, db: Session, tarifa: Tarifa, datos: TarifaActualizar
    ) -> Tarifa:
        cambios = datos.model_dump(exclude_unset=True)

        for campo, valor in cambios.items():
            if campo == "tipo_vehiculo" and valor is not None:
                valor = str(valor)
            setattr(tarifa, campo, valor)

        db.flush()
        return tarifa

    def desactivar(self, db: Session, tarifa: Tarifa) -> Tarifa:
        tarifa.estado = False
        db.flush()
        return tarifa

    def activar(self, db: Session, tarifa: Tarifa) -> Tarifa:
        tarifa.estado = True
        db.flush()
        return tarifa


tarifa_repositorio = TarifaRepositorio()
