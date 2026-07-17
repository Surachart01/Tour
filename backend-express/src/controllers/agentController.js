import prisma from '../config/db.js';

export async function createAgent(req, res, next) {
  try {
    const data = req.body;
    const agent = await prisma.agent.create({
      data: {
        name: data.name,
        markupGroup: data.markup_group || data.markupgroup || null,
        address: data.address || null,
        email: data.email,
        telephone: data.telephone || null,
        fax: data.tax_id || data.fax || null,
        paymentDeadlineType: data.payment_deadline_type || '24_hours_before',
        paymentDeadlineDays: data.payment_deadline_days || null,
        enableAssistanceFee: data.enable_assistance_fee !== undefined ? data.enable_assistance_fee : true,
        defaultAssistanceFee: data.default_assistance_fee !== undefined ? data.default_assistance_fee : 1000,
        userId: data.user_id ? parseInt(data.user_id) : null
      }
    });
    return res.status(201).json({ ...agent, tax_id: agent.fax });
  } catch (err) { next(err); }
}

export async function deleteAgent(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid agent ID');
    await prisma.agent.delete({ where: { id } });
    return res.status(200).send('Agent deleted successfully');
  } catch (err) { next(err); }
}

export async function updateAgent(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid agent ID');
    const data = req.body;
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        name: data.name,
        markupGroup: data.markup_group || data.markupgroup,
        address: data.address,
        email: data.email,
        telephone: data.telephone,
        fax: data.tax_id !== undefined ? data.tax_id : data.fax,
        paymentDeadlineType: data.payment_deadline_type,
        paymentDeadlineDays: data.payment_deadline_days,
        enableAssistanceFee: data.enable_assistance_fee,
        defaultAssistanceFee: data.default_assistance_fee,
        userId: data.user_id !== undefined ? (data.user_id ? parseInt(data.user_id) : null) : undefined
      }
    });
    return res.json({ ...agent, tax_id: agent.fax });
  } catch (err) { next(err); }
}

export async function getAgent(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid agent ID');
    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) return res.status(404).send('Agent not found');
    return res.json({ ...agent, tax_id: agent.fax });
  } catch (err) { next(err); }
}

export async function listAgentNames(req, res, next) {
  try {
    const agents = await prisma.agent.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
    return res.json(agents);
  } catch (err) { next(err); }
}

export async function listAgents(req, res, next) {
  try {
    const agents = await prisma.agent.findMany({ orderBy: { name: 'asc' } });
    const response = agents.map(a => ({
      id: a.id,
      name: a.name,
      markupgroup: a.markupGroup,
      address: a.address,
      email: a.email,
      telephone: a.telephone,
      tax_id: a.fax,
      fax: a.fax,
      payment_deadline_type: a.paymentDeadlineType,
      payment_deadline_days: a.paymentDeadlineDays,
      enable_assistance_fee: a.enableAssistanceFee,
      default_assistance_fee: a.defaultAssistanceFee ? parseFloat(a.defaultAssistanceFee.toString()) : null
    }));
    return res.json(response);
  } catch (err) { next(err); }
}

export async function updateAssistanceFeeConfig(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid agent ID');
    const { enable_assistance_fee, default_assistance_fee } = req.body;
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        enableAssistanceFee: enable_assistance_fee,
        defaultAssistanceFee: default_assistance_fee
      }
    });
    return res.json(agent);
  } catch (err) { next(err); }
}
