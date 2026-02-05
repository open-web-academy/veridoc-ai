'use server'

/**
 * Tipos para la respuesta de la API de NEAR AI
 */
type NearAIResponse = {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

type AnalyzeDocumentResult = {
  success: boolean;
  content?: string;
  error?: string;
};

/**
 * Modelo de NEAR AI a usar (fácil de cambiar)
 * 
 * Modelo económico seleccionado para pruebas:
 * - openai/gpt-oss-120b: Modelo de código abierto, muy económico
 * - Alternativa: Qwen/Qwen3-30B-A3B-Instruct-2507
 * 
 * 💰 Costo aproximado: $0.15 USD por millón de tokens
 * Esto permite hacer pruebas sin gastar mucho saldo.
 */
const NEAR_AI_MODEL = "openai/gpt-oss-120b";

/**
 * Endpoint base de la API de NEAR AI
 */
const NEAR_AI_API_URL = "https://api.near.ai/v1/chat/completions";

/**
 * Analiza un documento markdown usando la API de NEAR AI
 * 
 * @param markdownContent - Contenido en formato Markdown extraído del PDF
 * @returns Resultado del análisis con el contenido de la respuesta o error
 * 
 * @example
 * ```typescript
 * const result = await analyzeDocument("# Título\n\nContenido...");
 * if (result.success) {
 *   console.log(result.content);
 * }
 * ```
 */
export async function analyzeDocument(
  markdownContent: string
): Promise<AnalyzeDocumentResult> {
  // Validar API Key
  const apiKey = process.env.NEAR_AI_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: NEAR_AI_API_KEY no está configurada");
    return {
      success: false,
      error: "API Key de NEAR AI no configurada"
    };
  }

  // Validar contenido
  if (!markdownContent || markdownContent.trim().length === 0) {
    return {
      success: false,
      error: "El contenido markdown no puede estar vacío"
    };
  }

  try {
    console.log("🚀 Iniciando análisis con NEAR AI...");
    console.log(`📄 Longitud del contenido: ${markdownContent.length} caracteres`);

    // Construir el payload compatible con OpenAI
    const payload = {
      model: NEAR_AI_MODEL,
      messages: [
        {
          role: "system",
          content: "Eres un asistente experto analizando documentos técnicos. Responde siempre en español."
        },
        {
          role: "user",
          content: `Analiza el siguiente documento:\n\n${markdownContent}`
        }
      ],
      temperature: 0.5,
      max_tokens: 1000 // Limitado para mantener costos bajos
    };

    console.log(`📤 Enviando petición a NEAR AI (modelo: ${NEAR_AI_MODEL})...`);

    // Realizar la petición POST
    const response = await fetch(NEAR_AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error de API: ${response.status} ${response.statusText}`);
      console.error(`Detalles: ${errorText}`);
      
      return {
        success: false,
        error: `Error de API: ${response.status} ${response.statusText}`
      };
    }

    // Parsear la respuesta
    const data: NearAIResponse = await response.json();

    // Extraer el contenido del mensaje
    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        error: "La API no devolvió ninguna respuesta"
      };
    }

    const content = data.choices[0].message.content;

    if (!content) {
      return {
        success: false,
        error: "La respuesta de la API está vacía"
      };
    }

    console.log("✅ Análisis completado exitosamente");
    if (data.usage) {
      console.log(`📊 Tokens usados: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
    }

    return {
      success: true,
      content: content
    };

  } catch (error: any) {
    console.error("❌ Error al analizar documento:", error);
    
    // Manejar diferentes tipos de errores
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error: "Error de conexión con la API de NEAR AI"
      };
    }

    return {
      success: false,
      error: error.message || "Error desconocido al analizar el documento"
    };
  }
}
