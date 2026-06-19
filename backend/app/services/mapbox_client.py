import os
import httpx
from fastapi import HTTPException

class MapboxClient:
    """Cliente para interactuar con la API de Mapbox Directions."""
    
    def __init__(self):
        self.token = os.getenv("MAPBOX_ACCESS_TOKEN")
        self.base_url = "https://api.mapbox.com/directions/v5/mapbox/driving"

    async def get_driving_distance_km(self, lat_origen: float, lon_origen: float, lat_destino: float, lon_destino: float) -> float:
        """
        Consulta a Mapbox la ruta de conducción y retorna la distancia en kilómetros.
        """
        if not self.token:
            raise ValueError("El token de Mapbox no está configurado en el servidor.")

        # Mapbox usa el formato: longitud,latitud
        coordenadas = f"{lon_origen},{lat_origen};{lon_destino},{lat_destino}"
        url = f"{self.base_url}/{coordenadas}"
        
        params = {
            "access_token": self.token,
            "geometries": "geojson", # Retorna la ruta para dibujarla en el mapa después
            "overview": "full"
        }

        async with httpx.AsyncClient() as client:
            respuesta = await client.get(url, params=params)
            
            if respuesta.status_code != 200:
                print(f"Error Mapbox: {respuesta.text}")
                raise HTTPException(status_code=502, detail="Error al consultar el servicio de mapas.")
                
            datos = respuesta.json()
            
            if datos["code"] != "Ok" or not datos.get("routes"):
                raise HTTPException(status_code=400, detail="No se encontró una ruta terrestre válida entre estos puntos.")

            # Mapbox devuelve la distancia en metros. La pasamos a kilómetros.
            distancia_metros = datos["routes"][0]["distance"]
            distancia_km = distancia_metros / 1000.0
            
            return round(distancia_km, 2)