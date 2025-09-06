# Usamos una imagen oficial de Python como base
FROM python:3.11-slim

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de requerimientos e instalamos las dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del código de la aplicación
COPY . .

# Expone el puerto en el que la aplicación escuchará (Cloud Run usará esto)
EXPOSE 8080

# Comando para iniciar la aplicación cuando el contenedor se inicie
# CORRECCIÓN: El puerto de Uvicorn ahora usa la variable de entorno $PORT
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${PORT:-8080}"]