-- Support cards "Deal processing" and "Direct deposit info" are now backed by
-- the existing resource_kit_items table (no schema change required).
-- Two new kit keys are introduced: 'deal-processing' and 'direct-deposit'.
--
-- Admins manage these under Admin Panel > "Deal processing" / "Direct deposit info".
-- Agents see the active items in a dialog when they click the matching Support card.
--
-- Starter templates are seeded as is_active = false so agents don't see empty /
-- incomplete entries. The admin fills in the text, attaches a file or link,
-- then toggles the item Active to publish it.

INSERT INTO public.resource_kit_items (kit, title, description, icon, sort_order, is_active) VALUES
  ('deal-processing', 'Deal submission checklist', 'Step-by-step checklist for submitting a deal to the brokerage.', 'file', 0, false),
  ('deal-processing', 'Required documents', 'Forms and paperwork needed to process a deal (APS, FINTRAC, etc.).', 'file', 1, false),
  ('deal-processing', 'Deal sheet', 'Standard deal sheet to complete for every transaction.', 'file', 2, false)
ON CONFLICT DO NOTHING;

INSERT INTO public.resource_kit_items (kit, title, description, icon, sort_order, is_active) VALUES
  ('direct-deposit', 'Direct deposit form', 'Banking form to set up commission direct deposit.', 'file', 0, false),
  ('direct-deposit', 'Void cheque instructions', 'What to submit and where to send it.', 'file', 1, false),
  ('direct-deposit', 'Commission payout process', 'How and when commissions are paid out.', 'file', 2, false)
ON CONFLICT DO NOTHING;
