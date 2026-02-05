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

/** Estructura que debe devolver el LLM para llenar el paso 3 */
export type NearReport = {
  summary: string;
  keyItems: string[];
  nextSteps: string[];
  questions: string[];
  extraInfo?: string;
};

type AnalyzeNearResult = {
  success: boolean;
  report?: NearReport;
  error?: string;
};

/** Convierte newlines literales dentro de strings JSON en \\n para que JSON.parse no falle */
function fixNewlinesInJsonStrings(s: string): string {
  let result = "";
  let inString = false;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"') {
      let back = 0;
      let j = i - 1;
      while (j >= 0 && s[j] === "\\") {
        back++;
        j--;
      }
      if (back % 2 === 0) inString = !inString;
      result += c;
      i++;
      continue;
    }
    if (inString && (c === "\n" || c === "\r")) {
      result += "\\n";
      if (c === "\r" && s[i + 1] === "\n") i++;
      i++;
      continue;
    }
    result += c;
    i++;
  }
  return result;
}

/** Extrae el primer objeto JSON con llaves balanceadas (por si hay texto extra) */
function extractBalancedJson(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) return text;
  let depth = 0;
  let inString = false;
  let escape = false;
  let quote = "";
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if ((c === '"' || c === "'") && !inString) {
      inString = true;
      quote = c;
      continue;
    }
    if (c === quote) {
      inString = false;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

/** Cuando JSON.parse falla, intenta extraer campos del texto con regex */
function extractReportFromText(raw: string): NearReport | null {
  const summaryMatch = raw.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const summary = summaryMatch ? summaryMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : "";

  const extraMatch = raw.match(/"extraInfo"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const extraInfo = extraMatch ? extraMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : undefined;

  const keyItems: string[] = [];
  const keyArrMatch = raw.match(/"keyItems"\s*:\s*\[([\s\S]*?)\]/);
  if (keyArrMatch) {
    const arrContent = keyArrMatch[1];
    const strMatches = arrContent.matchAll(/"((?:[^"\\]|\\.)*)"/g);
    for (const m of strMatches) keyItems.push(m[1].replace(/\\"/g, '"'));
  }

  const nextSteps: string[] = [];
  const nextArrMatch = raw.match(/"nextSteps"\s*:\s*\[([\s\S]*?)\]/);
  if (nextArrMatch) {
    const arrContent = nextArrMatch[1];
    const strMatches = arrContent.matchAll(/"((?:[^"\\]|\\.)*)"/g);
    for (const m of strMatches) nextSteps.push(m[1].replace(/\\"/g, '"'));
  }

  const questions: string[] = [];
  const qArrMatch = raw.match(/"questions"\s*:\s*\[([\s\S]*?)\]/);
  if (qArrMatch) {
    const arrContent = qArrMatch[1];
    const strMatches = arrContent.matchAll(/"((?:[^"\\]|\\.)*)"/g);
    for (const m of strMatches) questions.push(m[1].replace(/\\"/g, '"'));
  }

  if (!summary && keyItems.length === 0 && nextSteps.length === 0 && questions.length === 0) return null;
  return {
    summary: summary || "Summary could not be extracted from the response.",
    keyItems: keyItems.length > 0 ? keyItems : ["Review the lab values with your clinician.", "Note any out-of-range results."],
    nextSteps: nextSteps.length > 0 ? nextSteps : ["Discuss these results with your doctor.", "Keep a copy for your records."],
    questions: questions.length > 0 ? questions : ["Which results need follow-up?", "Are any medications affecting these values?"],
    extraInfo,
  };
}

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
You are a Medical Assistant expert in interpreting clinical and lab results.
Analyze the patient document and respond ONLY with a valid JSON object, no text before or after.
Write all content in English.

RULES:
- Do NOT describe the document (e.g. "the document has a header"). Get to the point.
- DETECT abnormal values and compare them to reference ranges when available.
- SYNTHESIZE: group related abnormal values into a logical interpretation.

Respond with exactly this JSON (use double quotes, escape strings properly):

{
  "summary": "A short paragraph: overall state of results, age/gender if available.",
  "keyItems": ["Item 1 to review", "Item 2", "Item 3"],
  "nextSteps": ["Next step 1", "Next step 2", "Next step 3"],
  "questions": ["Question for your clinician 1", "Question 2", "Question 3"],
  "extraInfo": "Optional free text: critical findings, suggested interpretation, explanation of abnormal results, possible causes. Use \\n for line breaks."
}

- summary: 2-4 sentences in English.
- keyItems: 3-5 key points for the patient to review (abnormal values, panels, etc.).
- nextSteps: 3-4 recommended actions (e.g. repeat test, see specialist).
- questions: 3-5 concrete questions to ask the clinician.
- extraInfo: additional prose in English (critical findings, suggested interpretation, abnormal values explanation, possible causes). If nothing relevant, use empty string "".
Respond with ONLY the JSON, no \`\`\` or explanations.
- Do not use trailing commas after the last element in arrays or objects.
- Use \\n for line breaks inside long strings (e.g. extraInfo).
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
      temperature: 0.3,
      max_tokens: 1500
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

    if (!content || !content.trim()) {
      return {
        success: false,
        error: "La respuesta de la API está vacía"
      };
    }

    // Extraer JSON (puede venir dentro de ``` ... ``` o en bruto, con texto antes/después)
    let jsonStr = content.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }
    jsonStr = extractBalancedJson(jsonStr);

    // Sanitizar: comas finales y saltos de línea dentro de strings (el modelo a veces los pone literales)
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    jsonStr = fixNewlinesInJsonStrings(jsonStr);
    jsonStr = jsonStr.replace(/[\u0000-\u001F]/g, (c) => (c === '\n' || c === '\r' || c === '\t' ? c : ' '));

    let report: NearReport;
    try {
      const parsed = JSON.parse(jsonStr);
      report = {
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        keyItems: Array.isArray(parsed.keyItems) ? parsed.keyItems.filter((x: unknown) => typeof x === 'string') : [],
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.filter((x: unknown) => typeof x === 'string') : [],
        questions: Array.isArray(parsed.questions) ? parsed.questions.filter((x: unknown) => typeof x === 'string') : [],
        extraInfo: typeof parsed.extraInfo === 'string' ? parsed.extraInfo : undefined,
      };
    } catch (parseError) {
      console.warn("JSON.parse failed, trying fallback extraction:", parseError);
      const fallback = extractReportFromText(content);
      if (fallback) {
        console.log("Fallback extraction succeeded, using extracted report.");
        report = fallback;
      } else {
        console.error("Contenido recibido (primeros 800 chars):", content.slice(0, 800));
        return {
          success: false,
          error: "The model response could not be read as valid data. Please try again."
        };
      }
    }

    console.log("\n✅ Análisis completado exitosamente");
    if (data.usage) {
      console.log(`📊 Tokens usados: ${data.usage.total_tokens}`);
    }
    console.log("═══════════════════════════════════════════════════\n");

    return {
      success: true,
      report
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
