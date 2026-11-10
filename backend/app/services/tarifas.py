from sqlalchemy.orm import Session

from app.repositories.tarifas import tarifa_repositorio
from app.schemas.tarifas import TarifaCrear, TarifaActualizar


class TarifaServicio:

    def listar_tarifas(self, db: Session):
        return tarifa_repositorio.listar(db)

    def obtener_tarifa(self, db: Session, tarifa_id: int):
        tarifa = tarifa_repositorio.obtener_por_id(db, tarifa_id)

        if tarifa is None:
            raise ValueError("La tarifa no existe.")

        return tarifa

    def crear_tarifa(self, db: Session, datos: TarifaCrear):
        existente = tarifa_repositorio.obtener_por_tipo(
            db, datos.tipo_vehiculo
        )

        if existente is not None:
            raise ValueError(
                "Ya existe una tarifa para este tipo de vehículo."
            )

        try:
            tarifa = tarifa_repositorio.crear(db, datos)
            db.commit()
            db.refresh(tarifa)
            return tarifa
        except Exception:
            db.rollback()
            raise

    def actualizar_tarifa(
        self,
        db: Session,
        tarifa_id: int,
        datos: TarifaActualizar,
    ):
        tarifa = self.obtener_tarifa(db, tarifa_id)
        cambios = datos.model_dump(exclude_unset=True)

        nuevo_tipo = cambios.get("tipo_vehiculo")

        if nuevo_tipo is not None and nuevo_tipo != tarifa.tipo_vehiculo:
            existente = tarifa_repositorio.obtener_por_tipo(
                db, nuevo_tipo
            )

            if existente is not None:
                raise ValueError(
                    "Ya existe una tarifa para ese tipo de vehículo."
                )

        try:
            tarifa = tarifa_repositorio.actualizar(db, tarifa, datos)
            db.commit()
            db.refresh(tarifa)
            return tarifa
        except Exception:
            db.rollback()
            raise

    def desactivar_tarifa(self, db: Session, tarifa_id: int):
        tarifa = self.obtener_tarifa(db, tarifa_id)

        try:
            tarifa = tarifa_repositorio.desactivar(db, tarifa)
            db.commit()
            db.refresh(tarifa)
            return tarifa
        except Exception:
            db.rollback()
            raise


tarifa_servicio = TarifaServicio()
