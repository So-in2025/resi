// En: frontend/src/lib/apiClient.ts
import axios from 'axios';

// 1. Leemos la variable de entorno para obtener la URL base de nuestra API.
const baseURL = process.env.NEXT_PUBLIC_API_URL;

// 2. Creamos una instancia de Axios con una configuración centralizada.
// Todos los componentes que importen este archivo usarán esta misma configuración.
const apiClient = axios.create({
  baseURL: baseURL, // El "conector" ya sabe a dónde apuntar.
  headers: {
    'Content-Type': 'application/json',
  },
});

// 3. Exportamos el conector para que toda la aplicación pueda usarlo.
export default apiClient;