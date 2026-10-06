ALTER TABLE "DriverAccountingEntry" DROP CONSTRAINT "DriverAccountingEntry_kind_check";
ALTER TABLE "DriverAccountingEntry" ADD CONSTRAINT "DriverAccountingEntry_kind_check"
  CHECK ("kind" IN ('PAYMENT', 'DEDUCTION', 'INSTALLMENT_OFFSET'));
