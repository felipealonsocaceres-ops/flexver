"""Schemas Pydantic del dominio de Usuarios (Clean Architecture ligera).

En esta versión ligera, los modelos de Pydantic actúan como las entidades del
dominio: definen la forma de los datos que entran (Create) y salen (Response)
de la API, manteniendo las contraseñas fuera de cualquier respuesta.
"""

import re
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Rol(str, Enum):
    """Roles permitidos en FlexVer.

    Coincide exactamente con el CHECK/enum de la columna `rol` en Supabase y
    con el tipo del frontend (`'cliente' | 'conductor' | 'administrador'`).
    """

    CLIENTE = "cliente"
    CONDUCTOR = "conductor"
    ADMINISTRADOR = "administrador"


class UserBase(BaseModel):
    """Atributos comunes a todas las representaciones del usuario.

    `email` usa `EmailStr` (requiere `pydantic[email]`) para validación estricta.
    """

    # Regex para permitir solo letras y espacios. Bloquea "sjjsksjks 123"
    nombre_completo: str = Field(..., min_length=2, max_length=120, pattern=r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$")
    email: EmailStr
    telefono: str | None = Field(default=None, max_length=20)
    rol: Rol = Field(default=Rol.CLIENTE)


class UserCreate(UserBase):
    """Datos de entrada para registrar un usuario.

    Incluye la contraseña, que se usa únicamente para crear la identidad en
    Supabase Auth y nunca se persiste en la tabla `usuarios` ni se devuelve.
    """

    password: str = Field(..., min_length=6, max_length=72)


class ClientProfileCreate(UserCreate):
    """Datos de entrada para registrar un usuario con rol 'cliente'.

    Extiende `UserCreate` y fuerza `rol` a 'cliente' para que la creación del perfil sea coherente.
    """
    rol: Rol = Field(default=Rol.CLIENTE, frozen=True)


class DriverProfileCreate(UserCreate):
    """Datos de entrada para registrar un usuario con rol 'conductor'.

    Extiende `UserCreate` con los campos reales de la tabla `conductores`.
    Fuerza `rol` a 'conductor' para que la creación del perfil sea coherente.
    """

    rol: Rol = Field(default=Rol.CONDUCTOR, frozen=True)
    rut: str = Field(..., min_length=8, max_length=12)
    estado_verificacion: str = Field(default="pendiente", max_length=20)
    disponible: bool = Field(default=False)
    latitud_actual: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitud_actual: float | None = Field(default=None, ge=-180.0, le=180.0)

    @field_validator('rut')
    @classmethod
    def validar_rut_chileno(cls, v: str) -> str:
        """Valida que el RUT sea matemáticamente correcto en Chile."""
        # 1. Limpiar puntos y guiones
        rut_limpio = v.replace(".", "").replace("-", "").upper()
        if len(rut_limpio) < 8:
            raise ValueError('El RUT es demasiado corto')
        
        cuerpo = rut_limpio[:-1]
        dv_ingresado = rut_limpio[-1]

        # 2. Bloquear RUTs de prueba absurdos (ej: 1111111-1)
        if len(set(cuerpo)) == 1:
            raise ValueError('RUT genérico o de prueba no permitido')

        # 3. Algoritmo Módulo 11
        suma = 0
        multiplo = 2
        for char in reversed(cuerpo):
            suma += int(char) * multiplo
            multiplo = multiplo + 1 if multiplo < 7 else 2
            
        dv_esperado = 11 - (suma % 11)
        if dv_esperado == 11:
            dv_calculado = '0'
        elif dv_esperado == 10:
            dv_calculado = 'K'
        else:
            dv_calculado = str(dv_esperado)

        if dv_calculado != dv_ingresado:
            raise ValueError('El dígito verificador del RUT es incorrecto')
            
        return v


class UserResponse(UserBase):
    """Datos de salida del usuario (sin contraseña ni secretos).

    `model_config.from_attributes` permite construirlo desde objetos u ORMs;
    aquí se construye desde el dict que retorna Supabase.
    """

    model_config = ConfigDict(from_attributes=True)

    id_usuario: str
    created_at: datetime | None = None