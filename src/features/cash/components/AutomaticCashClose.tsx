import React from 'react';
import { useCurrentCashSession, useCloseCashSession, useCashMovements } from '../../../hooks/useCashSessions';
import { useSales } from '../../../hooks/useSales';
import { useCompany } from '../../../hooks/useCompany';
import { useAuthStore } from '../../../store/useAuthStore';
import { useNotificationStore } from '../../../store/useNotificationStore';
import { generateCashReportPdf } from '../utils/generateCashReportPdf';
import type { Sale } from '../../../types';

export const AutomaticCashClose: React.FC = () => {
  const { data: session } = useCurrentCashSession();
  const { data: sales = [] } = useSales();
  const { data: movements = [] } = useCashMovements(session?.id);
  const closeCashSession = useCloseCashSession();
  const { data: company } = useCompany();
  const { activeBranch } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const closedSessionIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!session || !session.isOpen) return;

    const sessionSales = sales.filter((s) => s.cashSessionId === session.id && s.status === 'COMPLETED');

    const cashOf = (s: Sale) =>
      (s.payments || []).filter((p) => p.method === 'CASH').reduce((acc, p) => acc + (p.amount - (p.change || 0)), 0);

    const kioskCashSales = sessionSales.reduce((sum, s) => {
      const kioskTotal = s.items
        .filter((i) => i.product.cashBoxType === 'KIOSK' || !i.product.cashBoxType)
        .reduce((acc, i) => acc + i.total, 0);
      const share = s.subtotal > 0 ? kioskTotal / s.subtotal : 0;
      return sum + cashOf(s) * share;
    }, 0);

    const cigaretteCashSales = sessionSales.reduce((sum, s) => {
      const cigTotal = s.items
        .filter((i) => i.product.cashBoxType === 'CIGARRILLOS')
        .reduce((acc, i) => acc + i.total, 0);
      const share = s.subtotal > 0 ? cigTotal / s.subtotal : 0;
      return sum + cashOf(s) * share;
    }, 0);

    const netIncome = movements
      .filter((m) => m.status !== 'CANCELLED' && m.type === 'INCOME')
      .reduce((sum, m) => sum + m.amount, 0);
    const netWithdrawals = movements
      .filter((m) => m.status !== 'CANCELLED' && m.type === 'WITHDRAWAL')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalCashInDrawer =
      session.initialKioskAmount + session.initialCigaretteAmount + kioskCashSales + cigaretteCashSales + netIncome - netWithdrawals;

    const runAutoClose = () => {
      if (closedSessionIdRef.current === session.id) return;

      const now = new Date();
      const open = new Date(session.openedAt);
      const deadline = new Date(open.getFullYear(), open.getMonth(), open.getDate(), 23, 59, 0);
      if (now < deadline) return;

      closedSessionIdRef.current = session.id;
      const closedAt = now.toISOString();
      const closedSession = {
        ...session,
        isOpen: false,
        closedAt,
        finalAmount: totalCashInDrawer,
        calculatedTotal: totalCashInDrawer,
        difference: 0,
        notes: 'Cierre automático 23:59',
      };

      closeCashSession.mutate(
        {
          id: session.id,
          data: {
            isOpen: false,
            closedAt,
            finalAmount: totalCashInDrawer,
            calculatedTotal: totalCashInDrawer,
            difference: 0,
            notes: 'Cierre automático 23:59',
          },
        },
        {
          onSuccess: () => {
            generateCashReportPdf({
              company,
              session: closedSession as typeof session,
              sales: sessionSales,
              movements,
              branchName: activeBranch?.name,
              closingAmount: totalCashInDrawer,
              calculatedTotal: totalCashInDrawer,
              difference: 0,
            });
            addNotification({
              title: 'Cierre automático de caja',
              message: 'Se cerró la caja a las 23:59 y se generó el reporte PDF del cierre.',
              type: 'info',
            });
          },
        }
      );
    };

    runAutoClose();
    const interval = setInterval(runAutoClose, 60000);
    return () => clearInterval(interval);
  }, [session, sales, movements, company, activeBranch, closeCashSession, addNotification]);

  return null;
};
