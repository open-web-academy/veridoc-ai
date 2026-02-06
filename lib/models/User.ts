import mongoose, { Schema, Document } from "mongoose";

/**
 * Modelo de Usuario para Veridoc
 * Almacena información del usuario y su saldo en USDT
 */
export interface ITransaction {
  type: string;
  status: string;
  amount?: number;
  createdAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface IUser extends Document {
  accountId: string; // NEAR account ID (ej: "user.near")
  email?: string; // Email del usuario (opcional, para búsqueda)
  balance: number; // Saldo en USDT (con 6 decimales, almacenado como número)
  transactions: ITransaction[]; // Historial de transacciones
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    type: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

const UserSchema = new Schema<IUser>(
  {
    accountId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      index: true,
      trim: true,
      lowercase: true,
      sparse: true, // Permite múltiples documentos sin email
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    transactions: {
      type: [TransactionSchema],
      default: [],
    },
  },
  {
    timestamps: true, // Crea createdAt y updatedAt automáticamente
  }
);

// Índice compuesto para búsquedas rápidas
UserSchema.index({ accountId: 1 });

// Exportar el modelo (usar el existente si ya está compilado)
const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
