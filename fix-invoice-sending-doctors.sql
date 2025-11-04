-- Script to fix existing invoices that are missing sending_doctor_id
-- This happens when invoices were created before we added the sending_doctor_id field

-- Update invoices by finding the sending doctor from the first invoice item's appointment
UPDATE public.invoices i
SET sending_doctor_id = (
  SELECT a.angiologist_id
  FROM public.invoice_items ii
  JOIN public.appointments a ON ii.appointment_id = a.id
  WHERE ii.invoice_id = i.id
  LIMIT 1
)
WHERE i.sending_doctor_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM public.invoice_items ii2
    WHERE ii2.invoice_id = i.id
  );

-- Verify the update
SELECT 
  i.id,
  i.invoice_number,
  i.sending_doctor_id,
  i.receiving_doctor_id,
  (SELECT COUNT(*) FROM public.invoice_items WHERE invoice_id = i.id) as items_count
FROM public.invoices i
ORDER BY i.created_at DESC
LIMIT 10;

