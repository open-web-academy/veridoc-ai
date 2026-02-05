/**
 * Utilidades para interactuar con la API de NEAR AI
 * Compatible con el formato de OpenAI
 */

/**
 * Tipo para los mensajes del payload
 */
type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Tipo para el payload completo de NEAR AI
 */
export type NearAIPayload = {
  model: string;
  messages: Message[];
  temperature: number;
  max_tokens: number;
};

/**
 * Crea un payload formateado para la API de NEAR AI
 * 
 * @param markdownContent - Contenido en formato Markdown extraído del PDF
 * @returns Objeto payload listo para enviar a la API de NEAR AI
 * 
 * @example
 * ```typescript
 * const payload = createNearPayload("# Título\n\nContenido del PDF...");
 * // Enviar payload a la API
 * ```
 */
export function createNearPayload(markdownContent: string): NearAIPayload {
  // Validar que el contenido no esté vacío
  if (!markdownContent || markdownContent.trim().length === 0) {
    throw new Error("El contenido markdown no puede estar vacío");
  }

  // Crear el payload con la estructura requerida
  const payload: NearAIPayload = {
    model: "llama-v3.1-70b-instruct",
    messages: [
      {
        role: "system",
        content: "Eres un asistente experto analizando documentos técnicos. Responde siempre en español."
      },
      {
        role: "user",
        content: `Analiza la siguiente información extraída de un PDF:\n\n${markdownContent}`
      }
    ],
    temperature: 0.5,
    max_tokens: 2000
  };

  return payload;
}
