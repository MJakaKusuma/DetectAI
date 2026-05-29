// Definisi tipe untuk Header agar tidak menggunakan 'any'
type ApiHeaders = Record<string, string>;

export const apiRequest = async <T>(
  endpoint: string, 
  method: string = "GET", 
  body: any = null,      // Hapus tanda '?' karena sudah ada initializer (= null)
  token: string | null = null // Hapus tanda '?' karena sudah ada initializer
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
    const response = await fetch(`http://127.0.0.1:8000${endpoint}`, config);
    
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