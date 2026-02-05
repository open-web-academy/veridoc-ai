'use server'

import { LlamaParse } from "llama-parse";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Prueba de concepto para LlamaParse
 * Extrae texto de un PDF local y lo devuelve en formato Markdown
 * 
 * @param filePath - Ruta relativa del archivo PDF desde la raíz del proyecto
 * @returns Objeto con el resultado del parsing o error
 */
export async function testLlamaParse(filePath: string) {
  const llamaCloudKey = process.env.LLAMA_CLOUD_API_KEY;

  if (!llamaCloudKey) {
    console.error("❌ Error: LLAMA_CLOUD_API_KEY no está configurada en las variables de entorno");
    return {
      success: false,
      error: "LLAMA_CLOUD_API_KEY no está configurada"
    };
  }

  try {
    console.log("--- INICIANDO PRUEBA DE LLAMAPARSE ---");
    console.log(`📄 Archivo: ${filePath}`);

    // Leer el archivo PDF desde el sistema de archivos
    const fullPath = join(process.cwd(), filePath);
    console.log(`📂 Ruta completa: ${fullPath}`);

    const fileBuffer = await readFile(fullPath);
    console.log(`📊 Tamaño del archivo: ${fileBuffer.length} bytes`);

    // Instanciar LlamaParse
    const parser = new LlamaParse({
      apiKey: llamaCloudKey,
    });

    console.log("🔄 Procesando PDF con LlamaParse...");

    // Convertir el Buffer a Blob para LlamaParse
    // En Node.js 18+, Blob está disponible globalmente
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });

    // Parsear el archivo (parseFile acepta File | Blob)
    const result = await parser.parseFile(blob);

    console.log(`✅ Procesamiento completado.`);
    console.log(`📊 Páginas procesadas: ${result.job_metadata.job_pages}`);
    console.log(`💳 Créditos usados: ${result.job_metadata.credits_used}`);

    const markdownText = result.markdown;

    console.log("\n--- RESULTADO MARKDOWN (Primeros 500 caracteres) ---");
    console.log(markdownText.substring(0, 500));
    console.log("...\n");

    console.log(`📏 Longitud total del texto: ${markdownText.length} caracteres`);

    return {
      success: true,
      markdown: markdownText,
      length: markdownText.length,
      metadata: result.job_metadata
    };

  } catch (error: any) {
    console.error("❌ Error en testLlamaParse:", error);
    return {
      success: false,
      error: error.message || "Error desconocido al procesar el PDF",
      details: error.toString()
    };
  }
}
