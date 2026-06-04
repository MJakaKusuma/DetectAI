// Definisi tipe untuk Header agar tidak menggunakan 'any'
type ApiHeaders = Record<string, string>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.5.213:8000";

export const apiRequest = async <T>(
  endpoint: string, 
  method: string = "GET", 
  body: unknown = null,  
  token: string | null = null
): Promise<T> => {
  
  // Gunakan ApiHeaders (Record<string, string>) bukan 'any'
  const headers: ApiHeaders = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Terjadi kesalahan pada server");
    }
    
    // Mengembalikan data dengan tipe generic <T>
    return await response.json() as T;
  } catch (error) {
    throw error;
  }
};