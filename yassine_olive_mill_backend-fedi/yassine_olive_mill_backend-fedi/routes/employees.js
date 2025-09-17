import express from 'express';
const router = express.Router();
import db from "../models/index.js"
const { Employee, QualityTest } = db;

// GET /api/employees - Get all employees
router.get('/', async (req, res) => {
  try {
    const { role, active } = req.query;
    
    const whereClause = {};
    if (role) whereClause.role = role;
    if (active !== undefined) whereClause.active = active === 'true';

    const employees = await Employee.findAll({
      where: whereClause,
      include: [{ model: QualityTest, as: 'qualityTests', attributes: ['id', 'test_date'] }],
      order: [['lastname', 'ASC'], ['firstname', 'ASC']]
    });

    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/employees - Create new employee
router.post('/', async (req, res) => {
  try {
    const { firstname, lastname, role, hire_date, phone } = req.body;
    
    const employee = await Employee.create({
      firstname,
      lastname,
      role,
      hire_date,
      phone,
      active: true
    });

    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await employee.update(req.body);
    res.json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
