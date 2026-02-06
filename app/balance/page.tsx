"use client";

import { useState } from "react";
import { DepositIntent } from "@/components/veridoc/DepositIntent";

type Transaction = {
  id: string;
  date: string;
  concept: string;
  amount: string;
  type: "deposit" | "withdrawal";
};

export default function BalancePage() {
  const [balance, setBalance] = useState("0.00");
  const [transactions, setTransactions] = useState<Transaction[]>([
    // Example data - in production would come from an API
  ]);

  const handleDepositSuccess = (amount: string) => {
    // Update balance
    setBalance((prev) => (parseFloat(prev) + parseFloat(amount)).toFixed(2));

    // Add transaction to history
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      concept: `Deposit with Chain Abstraction`,
      amount: `+${amount} USDT`,
      type: "deposit",
    };

    setTransactions((prev) => [newTransaction, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#f5fbfb] text-slate-900">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 right-0 h-80 w-80 rounded-full bg-gradient-to-br from-teal-200/50 via-sky-200/40 to-white blur-3xl" />
        <div className="pointer-events-none absolute left-0 top-32 h-72 w-72 rounded-full bg-gradient-to-tr from-cyan-200/40 via-emerald-200/30 to-white blur-3xl" />

        <main className="relative mx-auto w-full max-w-5xl px-6 pb-16 pt-8 sm:px-8 lg:px-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Balance</h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage your balance and make deposits using Chain Abstraction
            </p>
          </div>

          {/* Main Balance Card - Glassmorphism */}
          <div className="mb-8 rounded-3xl border border-white/70 bg-gradient-to-br from-white/90 via-white/75 to-white/60 p-8 shadow-lg backdrop-blur-xl">
            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-sm font-medium text-slate-600">Current Balance</p>
              <div className="text-center">
                <p className="text-5xl font-bold text-slate-900">
                  ${balance} <span className="text-2xl text-slate-600">USDT</span>
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                <span className="text-xs font-medium text-teal-700">Available</span>
              </div>
            </div>
          </div>

          {/* Deposit Component with NEAR Intents */}
          <div className="mb-8">
            <DepositIntent onDepositSuccess={handleDepositSuccess} />
          </div>

          {/* Transaction History */}
          <div className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm backdrop-blur sm:p-8">
            <h2 className="mb-6 text-xl font-semibold text-slate-900">Transaction History</h2>

            {transactions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-8 text-center">
                <p className="text-sm text-slate-600">No transactions yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Transactions will appear here after making deposits
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="transition hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm text-slate-700">{tx.date}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{tx.concept}</td>
                        <td
                          className={`px-4 py-3 text-right text-sm font-semibold ${
                            tx.type === "deposit" ? "text-teal-600" : "text-rose-600"
                          }`}
                        >
                          {tx.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
