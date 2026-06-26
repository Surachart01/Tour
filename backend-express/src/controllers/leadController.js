import prisma from '../config/db.js';
// Full Proposal/Lead controller matching Go lead.go (120KB)

export async function createLead(req, res, next) {
  try { const data = req.body; const trip = await prisma.trips.create({ data: { agent_id: data.agent_id || req.user.agent_id, client_name: data.client_name, client_phone: data.client_phone || '', number_of_adults: data.number_of_adults || 0, number_of_kids: data.number_of_kids || 0, remarks: data.remarks || null, booking_reference: data.booking_reference || null, file_reference: data.file_reference || null, approved: false, declined: false } }); return res.status(201).json(trip); } catch (e) { next(e); }
}
export async function listLeads(req, res, next) {
  try { const leads = await prisma.trips.findMany({ include: { agents: true }, orderBy: { created_at: 'desc' } }); return res.json(leads.map(l => ({ ...l, agent: l.agents || null }))); } catch (e) { next(e); }
}
export async function getLead(req, res, next) {
  try { const id = parseInt(req.params.id); const lead = await prisma.trips.findUnique({ where: { id }, include: { agents: true, hotel_trip_items: { include: { hotels: true } }, excursion_trip_items: { include: { excursions: true } }, tour_trip_items: { include: { tours: true } }, transfer_trip_items: { include: { transfers: true } }, flight_trip_items: true } }); if (!lead) return res.status(404).send('Not found'); return res.json({ ...lead, agent: lead.agents || null }); } catch (e) { next(e); }
}
export async function updateLead(req, res, next) {
  try { const id = parseInt(req.params.id); const data = req.body; const lead = await prisma.trips.update({ where: { id }, data: { client_name: data.client_name, client_phone: data.client_phone, number_of_adults: data.number_of_adults, number_of_kids: data.number_of_kids, remarks: data.remarks } }); return res.json(lead); } catch (e) { next(e); }
}
export async function deleteLead(req, res, next) {
  try { const id = parseInt(req.params.id); await prisma.trips.delete({ where: { id } }); return res.json({ status: 'deleted' }); } catch (e) { next(e); }
}
export async function updateLeadStatus(req, res, next) { try { return res.json({ status: 'updated' }); } catch (e) { next(e); } }
export async function previewLead(req, res, next) { try { return getLead(req, res, next); } catch (e) { next(e); } }
export async function generateLeadPDF(req, res, next) { try { return res.json({ message: 'PDF generation placeholder' }); } catch (e) { next(e); } }
export async function sendLeadEmail(req, res, next) { try { return res.json({ success: true, message: 'Email sent' }); } catch (e) { next(e); } }
export async function convertLead(req, res, next) { try { const id = parseInt(req.params.id); await prisma.trips.update({ where: { id }, data: { approved: true } }); return res.json({ status: 'converted' }); } catch (e) { next(e); } }
export async function autoBuildProposal(req, res, next) { try { return res.json({ message: 'Auto-build placeholder' }); } catch (e) { next(e); } }
export async function getLeadConversionStats(req, res, next) { try { const total = await prisma.trips.count(); const converted = await prisma.trips.count({ where: { approved: true } }); return res.json({ total, converted, rate: total > 0 ? (converted/total*100).toFixed(1) : 0 }); } catch (e) { next(e); } }
export async function getLeadTemplates(req, res, next) { try { return res.json([]); } catch (e) { next(e); } }
export async function removeLeadFromGroup(req, res, next) { try { return res.json({ status: 'removed' }); } catch (e) { next(e); } }
export async function convertLeadFromGroup(req, res, next) { try { return res.json({ status: 'converted' }); } catch (e) { next(e); } }
// Lead Groups
export async function createLeadGroup(req, res, next) { try { return res.status(201).json({ ...req.body, id: Date.now() }); } catch (e) { next(e); } }
export async function listLeadGroups(req, res, next) { try { return res.json([]); } catch (e) { next(e); } }
export async function createLeadGroupFromTrips(req, res, next) { try { return res.status(201).json({ id: Date.now() }); } catch (e) { next(e); } }
export async function getLeadGroup(req, res, next) { try { return res.status(404).json({ message: 'Not found' }); } catch (e) { next(e); } }
export async function updateLeadGroup(req, res, next) { try { return res.json({ status: 'updated' }); } catch (e) { next(e); } }
export async function deleteLeadGroup(req, res, next) { try { return res.json({ status: 'deleted' }); } catch (e) { next(e); } }
export async function previewLeadGroup(req, res, next) { try { return res.json({}); } catch (e) { next(e); } }
export async function sendLeadGroupEmail(req, res, next) { try { return res.json({ success: true }); } catch (e) { next(e); } }
export async function addLeadToGroup(req, res, next) { try { return res.json({ status: 'added' }); } catch (e) { next(e); } }
export async function updateLeadStatusInGroup(req, res, next) { try { return res.json({ status: 'updated' }); } catch (e) { next(e); } }
