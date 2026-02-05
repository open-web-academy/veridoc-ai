'use server'

import { writeFile } from "fs/promises";
import { join } from "path";

const LLAMA_API_URL = "https://api.cloud.llamaindex.ai/api/parsing";

export async function analyzeMedicalRecord(formData: FormData) {
  const file = formData.get('file') as File;
  const llamaKey = process.env.LLAMA_CLOUD_API_KEY;

  if (!file || !llamaKey) {
    return { success: false, message: 'Faltan archivos o API Key de LlamaParse.' };
  }

  try {
    console.log("═══════════════════════════════════════════════════");
    console.log("🚀 INICIANDO PROCESO CON LLAMAPARSE");
    console.log("═══════════════════════════════════════════════════");
    console.log(`📄 Archivo: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    
    // Paso 1: Subir Archivo
    console.log("\n📤 [1/3] Subiendo archivo a LlamaParse...");
    const uploadForm = new FormData();
    uploadForm.append("file", file);

    const uploadRes = await fetch(`${LLAMA_API_URL}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${llamaKey}` },
      body: uploadForm, 
    });

    if (!uploadRes.ok) throw new Error(`Error subida LlamaParse: ${uploadRes.statusText}`);
    const { id: jobId } = await uploadRes.json();
    console.log(`✅ Archivo subido exitosamente. Job ID: ${jobId}`);

    // Paso 2: Polling (Esperar a que termine)
    console.log("\n⏳ [2/3] LlamaParse está procesando el PDF...");
    console.log("   (Esto puede tomar unos segundos)");
    let markdown = "";
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000)); // Esperar 1 seg
      attempts++;
      
      const checkRes = await fetch(`${LLAMA_API_URL}/job/${jobId}`, {
         headers: { Authorization: `Bearer ${llamaKey}` },
      });
      const jobData = await checkRes.json();
      
      // Log del estado actual
      if (jobData.status && jobData.status !== "SUCCESS" && jobData.status !== "FAILED") {
        console.log(`   ⏳ Intento ${attempts}/${maxAttempts} - Estado: ${jobData.status}...`);
      }
      
      if (jobData.status === "SUCCESS") {
        console.log(`\n✅ ¡LlamaParse completó el procesamiento! (${attempts} segundos)`);
        
        // Paso 3: Obtener Markdown
        console.log("📥 [3/3] Descargando resultado en formato Markdown...");
        const resultRes = await fetch(`${LLAMA_API_URL}/job/${jobId}/result/markdown`, {
            headers: { Authorization: `Bearer ${llamaKey}` },
        });
        const resultData = await resultRes.json();
        markdown = resultData.markdown;
        console.log("✅ Markdown descargado exitosamente");
        break;
      } else if (jobData.status === "FAILED") {
        throw new Error("LlamaParse falló al procesar el PDF.");
      }
    }

    if (!markdown) throw new Error("Tiempo de espera agotado en LlamaParse.");
    
    console.log("\n═══════════════════════════════════════════════════");
    console.log("📝 TEXTO EXTRAÍDO POR LLAMAPARSE");
    console.log("═══════════════════════════════════════════════════");
    console.log(`📊 Longitud total: ${markdown.length} caracteres`);
    console.log(`📄 Primeros 200 caracteres:`);
    console.log("─".repeat(50));
    console.log(markdown.substring(0, 200));
    console.log("─".repeat(50));

    if (markdown.length < 50) {
      return { success: false, message: 'El PDF no contiene suficiente texto legible.' };
    }

    // Guardar el markdown en un archivo físico
    console.log("\n💾 Guardando markdown en archivo local...");
    const debugFilePath = join(process.cwd(), 'debug_extraction.md');
    await writeFile(debugFilePath, markdown, 'utf-8');
    console.log(`✅ Archivo guardado exitosamente en:`);
    console.log(`   📁 ${debugFilePath}`);
    console.log(`   📊 Tamaño: ${(markdown.length / 1024).toFixed(2)} KB`);

    // Paso 4: Análisis con Gemini (COMENTADO - Ya no se usa por ahora)
    /*
    console.log("--- 2. ANALIZANDO CON GEMINI ---");
    const genAI = new GoogleGenerativeAI(googleKey);
    
    const prompt = `
      Actúa como asistente médico. Analiza este expediente (Markdown) y extrae un JSON.
      
      REGLAS:
      - Devuelve SOLO un JSON válido.
      - Si hay tablas en el markdown, interprétalas correctamente.
      - Si el texto NO parece un documento médico (es una tarea escolar, una factura de luz, o texto sin sentido), marca "is_medical_record" como false.
      
      ESTRUCTURA JSON:
      {
        "is_medical_record": boolean,
        "summary": "Resumen breve",
        "detected_diagnosis": "Diagnóstico principal",
        "missing_info_warnings": ["Datos faltantes"]
      }

      DOCUMENTO:
      ${markdown.substring(0, 50000)}
    `;

    let model;
    let result;
    
    try {
      console.log("Intentando con gemini-1.5-flash-latest...");
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      result = await model.generateContent(prompt);
    } catch (e: any) {
      console.warn("Flash falló, intentando con gemini-pro...", e.message);
      model = genAI.getGenerativeModel({ model: "gemini-pro" });
      result = await model.generateContent(prompt);
    }

    let text = result.response.text();

    // Limpieza
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
       text = text.substring(firstBrace, lastBrace + 1);
    }

    const analysis = JSON.parse(text);
    
    // Validar que tenga la estructura esperada
    const validatedAnalysis = {
      is_medical_record: analysis.is_medical_record !== undefined ? analysis.is_medical_record : true,
      summary: analysis.summary || 'No se pudo generar un resumen.',
      detected_diagnosis: analysis.detected_diagnosis || 'No especificado',
      missing_info_warnings: Array.isArray(analysis.missing_info_warnings) 
        ? analysis.missing_info_warnings 
        : []
    };

    console.log("¡Análisis Exitoso!");

    return { 
      success: true, 
      analysis: validatedAnalysis 
    };
    */

    // Devolver el markdown directamente
    console.log("\n═══════════════════════════════════════════════════");
    console.log("✨ PROCESO COMPLETADO EXITOSAMENTE");
    console.log("═══════════════════════════════════════════════════");
    console.log("✅ LlamaParse extrajo el texto correctamente");
    console.log("✅ Archivo markdown guardado en la raíz del proyecto");
    console.log("✅ Markdown listo para ser devuelto al cliente");
    console.log("═══════════════════════════════════════════════════\n");

    return { 
      success: true, 
      markdown: markdown 
    };

  } catch (error: any) {
    console.error("Error Pipeline:", error.message);
    return { success: false, message: 'Error procesando documento.' };
  }
}
