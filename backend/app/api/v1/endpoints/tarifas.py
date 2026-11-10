from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencias import exigir_administrador
from app.database.connection import obtener_sesion
from app.models.usuarios import Usuario
from app.repositories.tarifas import tarifa_repositorio
from app.schemas.tarifas import (
    TarifaCrear,
    TarifaActualizar,
    TarifaRespuesta,
)

router = APIRouter(
    prefix="/api/tarifas",
    tags=["Tarifas"],
)


# ==========================================
# LISTAR TODAS LAS TARIFAS
# ==========================================


@router.get(
    "",
    response_model=list[TarifaRespuesta],
    status_code=status.HTTP_200_OK,
)
def listar_tarifas(
    db: Session = Depends(obtener_sesion),
    usuario: Usuario = Depends(exigir_administrador),
):
    return tarifa_repositorio.listar(db)


# ==========================================
# CONSULTAR UNA TARIFA POR ID
# ==========================================


@router.get(
    "/{tarifa_id}",
    response_model=TarifaRespuesta,
    status_code=status.HTTP_200_OK,
)
def obtener_tarifa(
    tarifa_id: int,
    db: Session = Depends(obtener_sesion),
    usuario: Usuario = Depends(exigir_administrador),
):
    tarifa = tarifa_repositorio.obtener_por_id(db, tarifa_id)

    if tarifa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La tarifa no existe.",
        )

    return tarifa


# ==========================================
# CREAR UNA TARIFA
# ==========================================


@router.post(
    "",
    response_model=TarifaRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def crear_tarifa(
    datos: TarifaCrear,
    db: Session = Depends(obtener_sesion),
    usuario: Usuario = Depends(exigir_administrador),
):
    existente = tarifa_repositorio.obtener_por_tipo(
        db,
        datos.tipo_vehiculo,
    )

    if existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una tarifa para este tipo de vehículo.",
        )

    try:
        tarifa = tarifa_repositorio.crear(db, datos)
        db.commit()
        db.refresh(tarifa)
        return tarifa

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una tarifa para este tipo de vehículo.",
        )

    except Exception:
        db.rollback()
        raise


# ==========================================
# ACTUALIZAR UNA TARIFA
# ==========================================


@router.put(
    "/{tarifa_id}",
    response_model=TarifaRespuesta,
    status_code=status.HTTP_200_OK,
)
def actualizar_tarifa(
    tarifa_id: int,
    datos: TarifaActualizar,
    db: Session = Depends(obtener_sesion),
    usuario: Usuario = Depends(exigir_administrador),
):
    tarifa = tarifa_repositorio.obtener_por_id(db, tarifa_id)

    if tarifa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La tarifa no existe.",
        )

    cambios = datos.model_dump(exclude_unset=True)

    if not cambios:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se enviaron datos para actualizar.",
        )

    if (
        "tipo_vehiculo" in cambios
        and cambios["tipo_vehiculo"] is not None
    ):
        existente = tarifa_repositorio.obtener_por_tipo(
            db,
            cambios["tipo_vehiculo"],
        )

        if existente is not None and existente.id != tarifa_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una tarifa para ese tipo de vehículo.",
            )

    try:
        tarifa = tarifa_repositorio.actualizar(
            db,
            tarifa,
            datos,
        )
        db.commit()
        db.refresh(tarifa)
        return tarifa

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pudo actualizar. Verifica que el tipo de vehículo no esté duplicado.",
        )

    except Exception:
        db.rollback()
        raise


# ==========================================
# DESACTIVAR UNA TARIFA
# ==========================================


@router.patch(
    "/{tarifa_id}/desactivar",
    response_model=TarifaRespuesta,
    status_code=status.HTTP_200_OK,
)
def desactivar_tarifa(
    tarifa_id: int,
    db: Session = Depends(obtener_sesion),
    usuario: Usuario = Depends(exigir_administrador),
):
    tarifa = tarifa_repositorio.obtener_por_id(db, tarifa_id)

    if tarifa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La tarifa no existe.",
        )

    try:
        tarifa = tarifa_repositorio.desactivar(db, tarifa)
        db.commit()
        db.refresh(tarifa)
        return tarifa

    except Exception:
        db.rollback()
        raise


# ==========================================
# ACTIVAR UNA TARIFA
# ==========================================


@router.patch(
    "/{tarifa_id}/activar",
    response_model=TarifaRespuesta,
    status_code=status.HTTP_200_OK,
)
def activar_tarifa(
    tarifa_id: int,
    db: Session = Depends(obtener_sesion),
    usuario: Usuario = Depends(exigir_administrador),
):
    tarifa = tarifa_repositorio.obtener_por_id(db, tarifa_id)

    if tarifa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La tarifa no existe.",
        )

    try:
        tarifa = tarifa_repositorio.activar(db, tarifa)
        db.commit()
        db.refresh(tarifa)
        return tarifa

    except Exception:
        db.rollback()
        raise