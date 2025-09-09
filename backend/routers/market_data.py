# En: backend/routers/market_data.py (Archivo Nuevo)
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(
    prefix="/market-data",
    tags=["Market Data"]
)

# Usaremos una API pública para las cotizaciones.
# Nota: En producción, lo ideal sería tener una API más robusta o de pago.
DOLAR_API_URL = "https://dolarapi.com/v1/dolares"

@router.get("/dolar")
async def get_dolar_prices():
    """
    Obtiene las cotizaciones del dólar (oficial, blue, mep) desde una API externa.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(DOLAR_API_URL)
            response.raise_for_status()  # Lanza un error si la respuesta no es 200 OK
            
            data = response.json()
            
            # Buscamos y formateamos los datos que nos interesan
            dolar_oficial = next((item for item in data if item.get('casa') == 'oficial'), None)
            dolar_blue = next((item for item in data if item.get('casa') == 'blue'), None)
            
            if not dolar_oficial or not dolar_blue:
                raise HTTPException(status_code=404, detail="No se encontraron las cotizaciones principales.")

            return {
                "oficial": {
                    "nombre": "Dólar Oficial",
                    "compra": dolar_oficial.get('compra'),
                    "venta": dolar_oficial.get('venta')
                },
                "blue": {
                    "nombre": "Dólar Blue",
                    "compra": dolar_blue.get('compra'),
                    "venta": dolar_blue.get('venta')
                }
            }
            
    except httpx.RequestError as exc:
        print(f"Error al llamar a la API de Dolar: {exc}")
        raise HTTPException(status_code=503, detail="El servicio de cotizaciones no está disponible en este momento.")
    except Exception as e:
        print(f"Error inesperado al procesar los datos del dólar: {e}")
        raise HTTPException(status_code=500, detail="Error interno al procesar los datos del dólar.")