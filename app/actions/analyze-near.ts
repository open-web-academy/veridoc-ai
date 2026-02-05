'use server'

import { readFile } from "fs/promises";
import { join } from "path";

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
  error?: {
    message: string;
    type: string;
  };
};

type AnalyzeNearResult = {
  success: boolean;
  content?: string;
  error?: string;
};

/**
 * Modelo de NEAR AI a usar (fácil de cambiar)
 * 
 * Modelo económico seleccionado para pruebas:
 * - openai/gpt-oss-120b: Modelo de código abierto, muy económico
 * - Alternativa: fireworks/llama-v3-70b-instruct
 * 
 * 💰 Costo aproximado: $0.15 USD por millón de tokens
 * Esto permite hacer pruebas sin gastar mucho saldo.
 */
const MODEL_ID = "openai/gpt-oss-120b";

/**
 * Endpoint base de la API de NEAR AI Cloud
 * ✅ VERIFICACIÓN: https://cloud-api.near.ai/v1/chat/completions
 */
const NEAR_AI_API_URL = "https://cloud-api.near.ai/v1/chat/completions";

/**
 * Ruta del archivo markdown local generado por LlamaParse
 */
const DEBUG_EXTRACTION_PATH = join(process.cwd(), 'debug_extraction.md');

/**
 * Analiza el documento markdown local usando la API de NEAR AI
 * 
 * Lee el archivo debug_extraction.md, lo envía a NEAR AI y devuelve la respuesta.
 * 
 * @returns Resultado del análisis con el contenido de la respuesta o error
 * 
 * @example
 * ```typescript
 * const result = await analyzeWithNearAI();
 * if (result.success) {
 *   console.log(result.content);
 * }
 * ```
 */
export async function analyzeWithNearAI(): Promise<AnalyzeNearResult> {
  // ✅ VERIFICACIÓN: Validar API Key
  const apiKey = process.env.NEAR_AI_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: NEAR_AI_API_KEY no está configurada");
    return {
      success: false,
      error: "API Key de NEAR AI no configurada. Por favor, configura NEAR_AI_API_KEY en tu archivo .env"
    };
  }

  try {
    console.log("═══════════════════════════════════════════════════");
    console.log("🚀 INICIANDO ANÁLISIS CON NEAR AI");
    console.log("═══════════════════════════════════════════════════");

    // Paso 1: Leer el archivo markdown local
    console.log("\n📂 [1/3] Leyendo archivo debug_extraction.md...");
    console.log(`   Ruta: ${DEBUG_EXTRACTION_PATH}`);

    let markdownContent: string;
    try {
      markdownContent = await readFile(DEBUG_EXTRACTION_PATH, 'utf-8');
    } catch (fileError: any) {
      if (fileError.code === 'ENOENT') {
        console.error("❌ El archivo debug_extraction.md no existe");
        return {
          success: false,
          error: "El archivo debug_extraction.md no existe. Por favor, primero extrae el PDF con LlamaParse."
        };
      }
      throw fileError;
    }

    // Validar que el contenido no esté vacío
    if (!markdownContent || markdownContent.trim().length === 0) {
      console.error("❌ El archivo debug_extraction.md está vacío");
      return {
        success: false,
        error: "El archivo debug_extraction.md está vacío. Por favor, verifica que LlamaParse haya extraído el contenido correctamente."
      };
    }

    console.log(`✅ Archivo leído exitosamente (${markdownContent.length} caracteres)`);

    // Paso 2: Construir el payload JSON
    console.log("\n📦 [2/3] Construyendo payload para NEAR AI...");
    console.log(`   Modelo: ${MODEL_ID}`);

    const SYSTEM_PROMPT = `
Eres un Asistente Médico Virtual experto en interpretación de análisis clínicos y hematología.
TU OBJETIVO: Analizar los datos extraídos del texto del PDF y ofrecer una interpretación clínica clara, directa y orientada al paciente.

REGLAS DE ORO:

🚫 NO describas el documento (no digas "el documento tiene una cabecera", "veo una tabla", etc.). Ve al grano.

🧬 DETECTA VALORES ANORMALES: Compara los valores encontrados con los rangos de referencia estándar si no están explícitos.

🧠 SINTETIZA: Si ves múltiples valores relacionados alterados (ej. Hemoglobina baja + Hematocrito bajo), agrúpalos en un diagnóstico lógico.

ESTRUCTURA DE RESPUESTA OBLIGATORIA (Usa Markdown):

🏥 Resumen del Paciente
(Breve mención de edad y género si están disponibles, y el estado general de los resultados).

⚠️ Hallazgos Críticos y Diagnóstico Sugerido
(El problema principal detectado. Ej: "Posible Anemia Severa").

🔍 Análisis de Resultados Anormales
[Nombre de la prueba]: Valor encontrado vs Referencia. Explicación sencilla de qué significa esto para la salud.

💡 Posibles Causas
(Lista 3 causas médicas comunes para estos resultados).
`;

    const payload = {
      model: MODEL_ID,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT.trim()
        },
        {
          role: "user",
          content: `Analiza el siguiente documento:\n\n${markdownContent}`
        }
      ],
      temperature: 0.5,
      max_tokens: 1000
    };

    console.log(`✅ Payload construido (${JSON.stringify(payload).length} bytes)`);

    // Paso 3: Enviar petición a NEAR AI
    console.log("\n🚀 INICIANDO CONEXIÓN A NEAR AI...");
    console.log("\n📦 PAYLOAD JSON GENERADO:");
    console.log(JSON.stringify(payload, null, 2));
    
    console.log(`\n📡 Enviando petición a ${NEAR_AI_API_URL}...`);
    console.log(`   ✅ Bearer Token: ${apiKey.substring(0, 10)}...`);

    const response = await fetch(NEAR_AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    // Manejar errores de la API
    if (!response.ok) {
      console.log(`\n❌ ERROR DE CONEXIÓN: Status ${response.status} ${response.statusText}`);
      
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        console.log("📋 Detalles del error (JSON):");
        console.log(JSON.stringify(errorData, null, 2));
        
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } catch {
        // Si no se puede parsear como JSON, usar el texto plano
        const errorText = await response.text();
        console.log("📋 Detalles del error (Texto):");
        console.log(errorText);
        
        if (errorText) {
          errorMessage = errorText;
        }
      }

      console.error(`❌ Error de API: ${errorMessage}`);
      
      // Errores comunes
      if (response.status === 401) {
        return {
          success: false,
          error: `Error de autenticación (401): ${errorMessage}. Verifica que tu API Key sea correcta.`
        };
      }
      if (response.status === 402) {
        return {
          success: false,
          error: `Error de pago (402): ${errorMessage}. Verifica que tengas saldo suficiente en tu cuenta de NEAR AI.`
        };
      }

      return {
        success: false,
        error: `Error de API (${response.status}): ${errorMessage}`
      };
    }

    // Parsear la respuesta exitosa
    console.log(`\n✅ RESPUESTA RECIBIDA (Status: ${response.status})`);
    
    const data: NearAIResponse = await response.json();
    
    console.log("📥 Respuesta parseada exitosamente");

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

    console.log("\n✅ Análisis completado exitosamente");
    if (data.usage) {
      console.log(`📊 Tokens usados: ${data.usage.total_tokens}`);
      console.log(`   - Prompt: ${data.usage.prompt_tokens} tokens`);
      console.log(`   - Completion: ${data.usage.completion_tokens} tokens`);
    }
    console.log("═══════════════════════════════════════════════════\n");

    return {
      success: true,
      content: content
    };

  } catch (error: any) {
    console.error("\n❌ ERROR DE CONEXIÓN:");
    console.error("   Tipo:", error.constructor.name);
    console.error("   Mensaje:", error.message);
    console.error("   Stack:", error.stack);
    
    // Manejar diferentes tipos de errores
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("   🔍 Diagnóstico: Error de red/fetch");
      return {
        success: false,
        error: "Error de conexión con la API de NEAR AI. Verifica tu conexión a internet."
      };
    }

    return {
      success: false,
      error: error.message || "Error desconocido al analizar el documento"
    };
  }
}
