'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface Customer {
  userId: string;
  ltvCents: number;
}

interface TopCustomersV2Props {
  customers: Customer[];
}

export default function TopCustomersV2({ customers }: TopCustomersV2Props) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const sortedCustomers = [...customers].sort((a, b) => 
    sortOrder === 'desc' ? b.ltvCents - a.ltvCents : a.ltvCents - b.ltvCents
  );

  const maxLTV = sortedCustomers.length > 0 ? Math.max(...sortedCustomers.map(c => c.ltvCents)) : 1;

  const handleSort = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="ember-card p-6 overflow-hidden"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--amber-400)] tracking-tight flex items-center gap-2">
            <span className="w-1 h-5 bg-[var(--amber-500)] rounded-full" style={{ boxShadow: 'var(--glow-amber)' }} />
            Top Customers
          </h3>
          <button
            onClick={handleSort}
            className="text-xs text-[var(--text-2)] hover:text-[var(--amber-400)] transition-colors flex items-center gap-1 focus:ring-2 focus:ring-[var(--amber-500)]/50"
          >
            <span>Sort by LTV</span>
            <motion.svg
              animate={{ rotate: sortOrder === 'asc' ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </motion.svg>
          </button>
        </div>

        <div className="space-y-2">
          {sortedCustomers && sortedCustomers.length > 0 ? (
            sortedCustomers.map((customer, index) => {
              const ltvPercent = (customer.ltvCents / maxLTV) * 100;
              
              return (
                <motion.div
                  key={customer.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ x: 4, scale: 1.02 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-2)] hover:bg-[#221a14] transition-all soft-border group hover:border-[var(--amber-500)]/50 hover:shadow-[0_0_15px_rgba(255,122,0,0.15)]"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Profile icon placeholder */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--amber-500)] flex items-center justify-center text-xs font-bold text-white">
                      {customer.userId.slice(-2).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-[var(--text-0)] truncate">{customer.userId}</div>
                      {/* LTV Progress Bar with hover expansion */}
                      <div className="mt-1.5 h-1.5 bg-[var(--bg-1)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${ltvPercent}%` }}
                          whileHover={{ scaleY: 1.5 }}
                          transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                          className="h-full bg-[var(--amber-500)] origin-left"
                          style={{ boxShadow: 'var(--glow-amber)' }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 ml-4">
                    <span className="font-bold text-[var(--amber-300)] tabular-nums">
                      ${(customer.ltvCents / 100).toFixed(2)}
                    </span>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-[var(--text-2)] text-sm text-center py-8">No customer data</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

