import { prisma } from '../index.js';

// Only 'approved' frees the assignee -- deliberately NOT 'submitted' too, even though a
// permit with no approval step would then never get a release event. A work-permit template
// is expected to always go through Send for Approval (see the assign trigger below), and if
// 'submitted' were also terminal, a plain "Submit Response" on the same request would assign
// then immediately free the same worker in one PATCH (assign fires on the awaiting_approval/
// submitted transition, release fires right after on the same status) -- silently defeating
// the whole feature. Keeping exactly one status in each list (awaiting_approval assigns,
// approved frees) keeps the two events from ever colliding in a single request.
const TERMINAL_STATUSES = ['approved'];

// Finds the FormField marked isTradeSelector on this form, reads its value out of the
// submitted values map, and resolves it to a Trade row by name (the dropdown's options are
// the trade names themselves, so the submitted value IS the trade name). Returns null if
// this form has no trade-selector field, or the value doesn't match a known trade -- callers
// treat that as "not a work-permit-style form" and skip auto-assignment entirely.
async function resolveTradeFromSubmission(formId: string, companyId: string, values: Record<string, unknown>) {
  const tradeField = await prisma.formField.findFirst({ where: { formId, isTradeSelector: true } });
  if (!tradeField) return null;
  const raw = values[tradeField.id];
  const tradeName = typeof raw === 'string' ? raw.trim() : '';
  if (!tradeName) return null;
  return prisma.trade.findUnique({ where: { companyId_name: { companyId, name: tradeName } } });
}

// Picks the least-recently-assigned free user holding the given trade (nulls-first, so
// someone who has never been assigned is preferred over someone assigned long ago -- both
// come before anyone assigned recently) and marks them assigned. Scoped to plantId when the
// response has one, so a multi-plant company doesn't hand a permit to someone at another
// site; falls back to company-wide if the response has no plant.
async function assignByTrade(companyId: string, tradeId: string, plantId: string | null): Promise<string | null> {
  const candidate = await prisma.user.findFirst({
    where: {
      companyId,
      status: 'active',
      availabilityStatus: 'free',
      ...(plantId ? { plantId } : {}),
      trades: { some: { tradeId } },
    },
    orderBy: [{ lastAssignedAt: { sort: 'asc', nulls: 'first' } }],
  });
  if (!candidate) return null;
  await prisma.user.update({
    where: { id: candidate.id },
    data: { availabilityStatus: 'assigned', lastAssignedAt: new Date() },
  });
  return candidate.id;
}

// Called whenever a response reaches "the permit has actually been raised" -- either created
// directly in that state (POST) or transitioned into it from a draft (PATCH; the common path,
// since the filler autosaves a draft first and Submit/Send for Approval then PATCHes that
// draft rather than creating a fresh response). If this form has a trade-selector field and
// the submitted value matches a real trade, finds the next free matching person (round-robin
// by lastAssignedAt) and returns their id so the caller can set it as autoAssignedUserId --
// deliberately NOT assignedToId, which is the separate approval-routing target (the manager
// reviewing the submission) and must never be overwritten by the worker's identity. Returns
// null for any form that isn't a work-permit-style form, or if no one matching is free.
export async function autoAssignByTrade(formId: string, companyId: string, plantId: string | null, values: Record<string, unknown>): Promise<string | null> {
  const trade = await resolveTradeFromSubmission(formId, companyId, values);
  if (!trade) return null;
  return assignByTrade(companyId, trade.id, plantId);
}

// Called when a response transitions into a terminal status (the permit's work is done --
// via approval for a permit form, since that's the convention this feature relies on). Frees
// the auto-assigned worker back to "free". No-op if this response was never auto-assigned
// (autoAssignedUserId null), so an ordinary response's status changes never touch anyone's
// availability.
export async function releaseAssigneeIfTerminal(responseId: string, newStatus: string) {
  if (!TERMINAL_STATUSES.includes(newStatus)) return;
  const response = await prisma.response.findUnique({ where: { id: responseId } });
  if (!response?.autoAssignedUserId) return;
  await prisma.user.update({
    where: { id: response.autoAssignedUserId },
    data: { availabilityStatus: 'free' },
  });
}
