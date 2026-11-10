from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import configuracion


ALGORITMO = configuracion.algorithm
TIEMPO_EXPIRACION_MINUTOS = 30


def crear_token_acceso(
    datos: dict,
    minutos_expiracion: int = TIEMPO_EXPIRACION_MINUTOS,
) -> str:
    """Genera un token JWT con fecha de expiración."""
    ahora = datetime.now(timezone.utc)

    contenido = datos.copy()
    contenido.update(
        {
            "iat": ahora,
            "exp": ahora + timedelta(minutes=minutos_expiracion),
        }
    )

    return jwt.encode(
        contenido,
        configuracion.secret_key,
        algorithm=ALGORITMO,
    )
    
def decodificar_token(token: str) -> dict:
    """Valida la firma y la expiración de un token JWT."""
    return jwt.decode(
        token,
        configuracion.secret_key,
        algorithms=[ALGORITMO],
        options={"require": ["exp", "iat", "sub"]},
    )