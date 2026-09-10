import React from 'react';
import type { OrderRecord } from '../../types';
import { Clock, CheckCircle2, Play, Flame, CheckCheck } from 'lucide-react';
import { Button } from '../common/Button';

interface KitchenOrderCardProps {
  order: OrderRecord;
  onAdvanceStatus: (orderId: string, nextStatus: string) => void;
}

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({ order, onAdvanceStatus }) => {
  const elapsed =
    order.elapsedMinutes !== undefined && !isNaN(order.elapsedMinutes)
      ? order.elapsedMinutes
      : order.createdAt
      ? Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60)))
      : 0;

  const isUrgent = elapsed > 15;

  const nextStatusConfig: Record<string, { label: string; next: string; icon: any; variant: any }> = {
    PENDING: { label: 'Accept Order', next: 'ACCEPTED', icon: CheckCircle2, variant: 'primary' },
    ACCEPTED: { label: 'Start Preparing', next: 'PREPARING', icon: Flame, variant: 'secondary' },
    PREPARING: { label: 'Mark Ready to Serve', next: 'READY', icon: Play, variant: 'primary' },
    READY: { label: 'Complete & Serve Order', next: 'COMPLETED', icon: CheckCheck, variant: 'primary' },
  };

  const config = nextStatusConfig[order.orderStatus];
  const itemsList = Array.isArray(order.items) ? order.items : [];

  return (
    <div
      className={`bg-white rounded-3xl p-4 border shadow-sm flex flex-col justify-between transition-all ${
        isUrgent ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-[#E2DCD5]'
      }`}
    >
      <div>
        {/* Card Header: Order Number & Table Badge */}
        <div className="flex items-center justify-between border-b border-[#E2DCD5] pb-3 mb-3">
          <div>
            <span className="text-[11px] font-bold text-stone-500">Order #{order.orderNumber}</span>
            <h3 className="text-lg font-black text-[#10B981] leading-tight">{order.tableNumber || 'Table'}</h3>
          </div>

          <div
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 border ${
              isUrgent
                ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                : 'bg-[#FAF7F2] text-stone-700 border-[#E2DCD5]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#10B981]" />
            {elapsed}m ago
          </div>
        </div>

        {/* Customer Info / Notes */}
        {order.customerName && order.customerName !== 'Guest Customer' && (
          <p className="text-xs font-bold text-stone-800 mb-2">Guest: {order.customerName}</p>
        )}

        {order.notes && (
          <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 font-medium">
            <strong className="text-emerald-800">Note:</strong> {order.notes}
          </div>
        )}

        {/* Itemized Order List */}
        <div className="space-y-2 mb-4">
          {itemsList.map((item, idx) => (
            <div key={item.id || idx} className="flex items-start justify-between text-xs">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-50 border border-emerald-200 text-[#10B981] font-black flex items-center justify-center text-[10px] shrink-0">
                  {item.quantity}x
                </span>
                <div>
                  <span className="font-extrabold text-stone-900">{item.productName}</span>
                  {item.specialNote && (
                    <p className="text-[11px] text-emerald-800 font-semibold">↳ {item.specialNote}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Status Transition Button */}
      {config && (
        <div className="pt-3 border-t border-[#E2DCD5]">
          <Button
            variant={config.variant}
            size="sm"
            className="w-full py-2.5 text-xs flex items-center justify-center gap-1.5 font-bold"
            onClick={() => onAdvanceStatus(order.id || order.orderToken, config.next)}
          >
            <config.icon className="w-4 h-4" />
            {config.label}
          </Button>
        </div>
      )}
    </div>
  );
};
