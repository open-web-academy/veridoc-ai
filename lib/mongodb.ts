// lib/mongodb.ts
import mongoose from "mongoose";

// No validar MONGODB_URI aquí: Next.js evalúa módulos en build y Amplify no tiene .env en build.
// Validamos al conectar para que el build no falle.
function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Por favor define la variable MONGODB_URI en tu archivo .env.local (o en las variables de entorno de Amplify)."
    );
  }
  return uri;
}

// Interfaz para el caché global
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extender el objeto global para incluir mongoose
declare global {
  var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = getMongoUri();
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;