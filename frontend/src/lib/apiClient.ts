import axios from 'axios';
import toast from 'react-hot-toast';

const baseURL = process.env.NEXT_PUBLIC_API_URL;

const apiClient = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // Añade un tiempo de espera para evitar bloqueos
});

// Interceptor para manejar errores de forma global
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
      toast.error('Error de conexión con el servidor. Por favor, verifica tu conexión a internet.');
    } else {
      toast.error('Ocurrió un error inesperado al comunicarse con el servidor.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
