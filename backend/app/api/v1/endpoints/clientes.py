from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencias import (
    obtener_usuario_actual,
    exigir_administrador,
    exigir_permiso,
)
from app.database.connection import obtener_sesion
from app.models.clientes import Cliente
from app.schemas.clientes import (
    ClienteCrear,
    ClienteActualizar,
    ClienteRespuesta,
)

router = APIRouter(
    prefix="/api/clientes",
    tags=["Clientes"],
)


@router.get(
    "",
    response_model=list[ClienteRespuesta],
    summary="Listar Clientes",
)
def listar_clientes(
    db: Session = Depends(obtener_sesion),
    usuario_actual = Depends(obtener_usuario_actual),
):
    consulta = select(Cliente).order_by(Cliente.id.desc())
    return db.scalars(consulta).all()


@router.get(
    "/{cliente_id}",
    response_model=ClienteRespuesta,
    summary="Obtener Cliente",
)
def obtener_cliente(
    cliente_id: int,
    db: Session = Depends(obtener_sesion),
    usuario_actual = Depends(obtener_usuario_actual),
):
    cliente = db.get(Cliente, cliente_id)

    if cliente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El cliente no existe.",
        )

    return cliente


@router.post(
    "",
    response_model=ClienteRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Crear Cliente",
)
def crear_cliente(
    datos: ClienteCrear,
    db: Session = Depends(obtener_sesion),
    usuario_actual = Depends(exigir_permiso("clientes:gestionar")),
):
    documento = datos.documento.strip()

    existente = db.scalar(
        select(Cliente).where(
            Cliente.documento == documento
        )
    )

    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un cliente con ese documento.",
        )

    cliente = Cliente(
        nombre=datos.nombre.strip(),
        documento=documento,
        telefono=datos.telefono,
        correo=datos.correo,
    )

    try:
        db.add(cliente)
        db.commit()
        db.refresh(cliente)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No fue posible registrar el cliente. "
                "Verifica que el documento no esté registrado."
            ),
        ) from error

    return cliente


@router.put(
    "/{cliente_id}",
    response_model=ClienteRespuesta,
    summary="Actualizar Cliente",
)
def actualizar_cliente(
    cliente_id: int,
    datos: ClienteActualizar,
    db: Session = Depends(obtener_sesion),
    usuario_actual = Depends(exigir_administrador),
):
    cliente = db.get(Cliente, cliente_id)

    if cliente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El cliente no existe.",
        )

    cambios = datos.model_dump(exclude_unset=True)

    if (
        "documento" in cambios
        and cambios["documento"] is not None
    ):
        cambios["documento"] = cambios["documento"].strip()

        duplicado = db.scalar(
            select(Cliente).where(
                Cliente.documento == cambios["documento"],
                Cliente.id != cliente_id,
            )
        )

        if duplicado:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Otro cliente ya tiene ese documento.",
            )

    if (
        "nombre" in cambios
        and cambios["nombre"] is not None
    ):
        cambios["nombre"] = cambios["nombre"].strip()

    for campo, valor in cambios.items():
        setattr(cliente, campo, valor)

    try:
        db.commit()
        db.refresh(cliente)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No fue posible actualizar el cliente. "
                "Verifica los datos y el documento."
            ),
        ) from error

    return cliente


@router.patch(
    "/{cliente_id}/desactivar",
    response_model=ClienteRespuesta,
    summary="Desactivar Cliente",
)
def desactivar_cliente(
    cliente_id: int,
    db: Session = Depends(obtener_sesion),
    usuario_actual = Depends(exigir_administrador),
):
    cliente = db.get(Cliente, cliente_id)

    if cliente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El cliente no existe.",
        )

    cliente.estado = False

    try:
        db.commit()
        db.refresh(cliente)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No fue posible desactivar el cliente.",
        ) from error

    return cliente


@router.patch(
    "/{cliente_id}/activar",
    response_model=ClienteRespuesta,
    summary="Activar Cliente",
)
def activar_cliente(
    cliente_id: int,
    db: Session = Depends(obtener_sesion),
    usuario_actual = Depends(exigir_administrador),
):
    cliente = db.get(Cliente, cliente_id)

    if cliente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El cliente no existe.",
        )

    cliente.estado = True

    try:
        db.commit()
        db.refresh(cliente)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No fue posible activar el cliente.",
        ) from error

    return cliente