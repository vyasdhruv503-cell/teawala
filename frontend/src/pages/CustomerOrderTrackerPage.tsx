import React, { useEffect, useState } from 'react';
import type { OrderRecord } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react';

interface CustomerOrderTrackerPageProps {
  orderToken: string;
  onBackToMenu: () => void;
}

export const CustomerOrderTrackerPage: React.FC<CustomerOrderTrackerPageProps> = ({
  orderToken,
  onBackToMenu,
}) => {
  const getInitialOrder = (): OrderRecord | null => {
    try {
      const storedOrdersObj = JSON.parse(localStorage.getItem('cafeqr_customer_orders_data') || '{}');
      if (storedOrdersObj[orderToken]) {
        return storedOrdersObj[orderToken];
      }
    } catch {
      // Fall through to network fetch
    }
    return null;
  };

  const [order, setOrder] = useState<OrderRecord | null>(getInitialOrder);
  const [isLoading, setIsLoading] = useState<boolean>(() => !getInitialOrder());

  const fetchOrderStatus = async () => {
    try {
      const data = await api.trackOrder(orderToken);
      if (data && data.orderNumber) {
        setOrder(data);
        setIsLoading(false);
      }
    } catch (err) {
      console.warn('API order track error:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderStatus();
    const interval = setInterval(fetchOrderStatus, 5000);
    return () => clearInterval(interval);
  }, [orderToken]);

  const steps = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];
  const currentStepIndex = order ? Math.max(0, steps.indexOf(order.orderStatus)) : 0;

  return (
    <div className="min-h-screen bg-[#140D0B] text-white p-4 max-w-lg mx-auto font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between py-4">
        <button
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 text-xs font-bold text-[#00F5D4] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 stroke-[3]" />
          Back to Menu
        </button>
        <button
          onClick={() => {
            setIsLoading(true);
            fetchOrderStatus();
          }}
          className="p-2 text-stone-400 hover:text-[#00F5D4] rounded-xl transition-colors"
          title="Refresh Status"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#00F5D4]' : ''}`} />
        </button>
      </div>

      {/* Main Order Card */}
      {!order ? (
        <div className="bg-[#1F1512] rounded-3xl p-8 border border-[#38241D] shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 bg-[#281A15] border border-[#483027] rounded-full flex items-center justify-center mx-auto box-glow-green animate-pulse">
            <RefreshCw className="w-7 h-7 text-[#00F5D4] animate-spin" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white">Connecting to Kitchen...</h2>
            <p className="text-xs text-stone-400">Loading your real-time order receipt & status.</p>
          </div>
        </div>
      ) : (
        <div className="bg-[#1F1512] rounded-3xl p-6 border border-[#38241D] shadow-2xl space-y-6 animate-fadeIn">
        {/* Header info */}
        <div className="text-center pb-4 border-b border-[#33221B]">
          <div className="h-16 px-4 bg-[#281A15] border border-[#483027] rounded-2xl inline-flex items-center justify-center mx-auto mb-3 box-glow-green">
            <img src="/logo.png" alt="TeaWala Logo" className="h-12 w-auto object-contain mx-auto" />
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-glow-green font-black text-xl">tea</span>
            <span className="text-glow-white font-black text-xl">wala</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-2">Order #{order.orderNumber}</h1>
          <p className="text-xs text-[#00F5D4] font-semibold mt-1">{order.tableNumber}</p>
        </div>

        {/* Live Status Progress Stepper */}
        <div className="py-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00F5D4]">Live Status</span>
            <StatusBadge status={order.orderStatus} />
          </div>

          <div className="relative flex items-center justify-between px-2">
            {/* Progress line */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-[#2C1D18] -z-0" />
            <div
              className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-[#00F5D4] to-[#10B981] transition-all duration-500 -z-0 box-glow-green"
              style={{
                width: `${Math.max(0, (currentStepIndex / (steps.length - 1)) * 100)}%`,
              }}
            />

            {steps.map((step, idx) => {
              const isDone = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-[#00F5D4] text-[#140D0B] box-glow-green ring-4 ring-[#00F5D4]/20'
                        : 'bg-[#2B1C17] border-2 border-[#482F26] text-stone-400'
                    } ${isCurrent ? 'animate-bounce' : ''}`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4 stroke-[3]" /> : idx + 1}
                  </div>
                  <span className="text-[10px] font-bold text-stone-300 mt-2 capitalize">
                    {step.toLowerCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details Breakdown */}
        <div className="bg-[#170E0B] rounded-2xl p-4 border border-[#38241D] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#00F5D4]">Ordered Items</h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-xs font-semibold text-[#F8FAFC]">
                <span>
                  {item.quantity}x {item.productName}
                </span>
                <span className="text-[#00F5D4]">₹{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#38241D] space-y-1 text-xs font-medium text-stone-300">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>₹{order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-[#38241D]">
              <span>Total Amount</span>
              <span className="text-[#00F5D4]">₹{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
