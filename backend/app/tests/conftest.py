import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.models import (
    Cliente,
    Vehiculo,
    Usuario,
    Tarifa,
    Movimiento,
    Pago,
)


@pytest.fixture
def db():
    motor_prueba = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(bind=motor_prueba)

    SesionPrueba = sessionmaker(
        bind=motor_prueba,
        autoflush=False,
        autocommit=False,
    )
    
    sesion = SesionPrueba()
    
    try:
        yield sesion
    finally:
        sesion.close()
        Base.metadata.drop_all(bind=motor_prueba)
        motor_prueba.dispose()
    