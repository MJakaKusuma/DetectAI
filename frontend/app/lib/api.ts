type ApiHeaders = Record<string, string>;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export const apiRequest = async <T>(
  endpoint: string,
  method: string = "GET",
  body: unknown = null
): Promise<T> => {

  const headers: ApiHeaders = {};
  if (
    body &&
    !(body instanceof FormData)
  ) {
    headers["Content-Type"] =
      "application/json";
  }

  const config: RequestInit = {
    method,
    headers,

    credentials: "include",

    body:
      body instanceof FormData
        ? body
        : body
        ? JSON.stringify(body)
        : null,
  };

  try {
    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      config
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      let errorMessage =
        "Terjadi kesalahan pada server";

      try {
        const errorData =
          JSON.parse(errorText);

        errorMessage =
          errorData.detail ||
          errorData.message ||
          errorMessage;

      } catch {
        errorMessage =
          errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const text =
      await response.text();

    return text
      ? JSON.parse(text)
      : ({} as T);

  } catch (error) {
    throw error;
  }
};