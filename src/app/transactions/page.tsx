"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

import { TransactionList } from "~/components/transactions/transaction-list";
import { AppShell } from "~/components/layout/app-shell";

function TransactionsContent() {
  const searchParams = useSearchParams();
  const transactionType = searchParams.get("type");
  
  useEffect(() => {
    // Получаем элемент вкладки для активации 
    if (transactionType) {
      const tab = document.querySelector(`[data-value="${transactionType}"]`) as HTMLButtonElement;
      if (tab) {
        tab.click();
      }
    }
  }, [transactionType]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Транзакции</h1>
        <p className="text-muted-foreground">Просмотр и фильтрация всех транзакций</p>
      </div>
      
      <TransactionList />
    </motion.div>
  );
}

export default function TransactionsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div>Загрузка...</div>}>
        <TransactionsContent />
      </Suspense>
    </AppShell>
  );
}