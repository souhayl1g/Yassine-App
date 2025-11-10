import { Op } from 'sequelize';
import db from '../models/index.js';

const { OilSale, Client, User, Price } = db;

export const createOilSale = async (req, res) => {
  try {
    const { clientId, weightKg, unitPrice } = req.body;
    if (!clientId || !weightKg) {
      return res.status(400).json({ error: 'clientId و weightKg مطلوبان' });
    }
    const weight = parseFloat(weightKg);
    const pricePerKg = parseFloat(unitPrice) || 0;
    if (isNaN(weight) || weight <= 0) {
      return res.status(400).json({ error: 'وزن غير صالح' });
    }
    if (isNaN(pricePerKg) || pricePerKg <= 0) {
      return res.status(400).json({ error: 'سعر غير صالح' });
    }

    const total = weight * pricePerKg;
    const userId = req.user?.id || null;

    const sale = await OilSale.create({
      clientId,
      userId,
      weight_kg: weight,
      unit_price: pricePerKg,
      total_amount: total,
    });

    const client = await Client.findByPk(clientId);

    return res.json({
      sale: {
        id: sale.id,
        clientId: sale.clientId,
        clientName: client ? `${client.firstname} ${client.lastname}` : 'عميل',
        weightKg: sale.weight_kg,
        unitPrice: sale.unit_price,
        totalAmount: sale.total_amount,
        createdAt: sale.createdAt,
      },
    });
  } catch (e) {
    console.error('Error creating oil sale:', e);
    return res.status(500).json({ error: 'خطأ في إنشاء عملية بيع الزيت' });
  }
};

export const listOilSales = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20', 10);
    const page = parseInt(req.query.page || '1', 10);
    const offset = (page - 1) * limit;

    const { rows, count } = await OilSale.findAndCountAll({
      include: [
        { model: Client, as: 'client' },
        { model: User, as: 'user', attributes: ['id', 'firstname', 'lastname'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const sales = rows.map((sale) => ({
      id: sale.id,
      clientId: sale.clientId,
      clientName: sale.client ? `${sale.client.firstname} ${sale.client.lastname}` : 'عميل',
      weightKg: sale.weight_kg,
      unitPrice: sale.unit_price,
      totalAmount: sale.total_amount,
      createdAt: sale.createdAt,
    }));

    return res.json({
      oilSales: sales,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit) || 1,
      },
    });
  } catch (e) {
    console.error('Error listing oil sales:', e);
    return res.status(500).json({ error: 'فشل في تحميل عمليات بيع الزيت' });
  }
};
