# En: backend/routers/market_data.py
import httpx
from fastapi import APIRouter, HTTPException
from httpx import AsyncClient, ConnectTimeout, ReadTimeout

router = APIRouter(
    prefix="/market-data",
    tags=["Market Data"]
)

DOLAR_API_URL = "https://dolarapi.com/v1/dolares"

@router.get("/dolar")
async def get_dolar_prices():
    """
    Obtiene las cotizaciones del dólar (oficial, blue, mep) desde una API externa.
    """
    try:
        # CORRECCIÓN: Se añade un timeout a la petición para evitar que el servidor se cuelgue
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(DOLAR_API_URL)
            response.raise_for_status()
            
            data = response.json()
            
            dolar_oficial = next((item for item in data if item.get('casa') == 'oficial'), None)
            dolar_blue = next((item for item in data if item.get('casa') == 'blue'), None)
            
            if not dolar_oficial or not dolar_blue:
                raise HTTPException(status_code=503, detail="El servicio de cotizaciones no devolvió los datos esperados.")

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
            
    # CORRECCIÓN: Se manejan los errores de timeout y de conexión de forma más específica
    except (ConnectTimeout, ReadTimeout):
        raise HTTPException(status_code=503, detail="El servicio de cotizaciones tardó demasiado en responder.")
    except httpx.RequestError as exc:
        print(f"Error al llamar a la API de Dolar: {exc}")
        raise HTTPException(status_code=503, detail="El servicio de cotizaciones no está disponible en este momento.")
    except Exception as e:
        print(f"Error inesperado al procesar los datos del dólar: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {e}")