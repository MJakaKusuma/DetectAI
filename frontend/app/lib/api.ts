// Definisi tipe untuk Header agar tidak menggunakan 'any'
type ApiHeaders = Record<string, string>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiRequest = async <T>(
  endpoint: string, 
  method: string = "GET", 
  body: unknown = null,  
  token: string | null = null
): Promise<T> => {
  
  const headers: ApiHeaders = {};

  // PERBAIKAN: Hanya pasang Content-Type JSON jika body bukan FormData
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // PERBAIKAN: Jika body adalah FormData, kirim apa adanya tanpa JSON.stringify
  const config: RequestInit = {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : null,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      // Antisipasi jika error penolakan server bukan berformat JSON
      const errorText = await response.text();
      let errorMessage = "Terjadi kesalahan pada server";
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    // Mengembalikan data dengan tipe generic <T>
    return await response.json() as T;
  } catch (error) {
    throw error;
  }
};