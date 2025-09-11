// En: frontend/src/lib/apiClient.ts
import axios from 'axios';

// 1. Leemos la variable de entorno para obtener la URL base de nuestra API.
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 2. Creamos una instancia de Axios con una configuración centralizada.
const apiClient = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 3. Exportamos el conector para que toda la aplicación pueda usarlo.
export default apiClient;