import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { User } = db;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getConfig = async () => {
  const configPath = join(__dirname, '../config/config.json');
  const configFile = await readFile(configPath, 'utf8');
  return JSON.parse(configFile);
};

const EN_WHITELIST = ['admin', 'manager', 'employee', 'scanner'];

const AR_TO_EN = {
  'مدير': 'manager',
  'مشغل': 'employee',
  'ماسح': 'scanner',
  'مسؤول': 'admin',
  'مدير النظام': 'admin',
};

const EN_TO_AR = {
  admin: 'مدير النظام',
  manager: 'مدير',
  employee: 'مشغل',
  scanner: 'ماسح',
};

const normalizeRole = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  if (EN_WHITELIST.includes(lower)) return lower;           // English input
  if (AR_TO_EN[s]) return AR_TO_EN[s];                      // Arabic input
  return null;
};

const generateToken = async (user) => {
  const config = await getConfig();
  const env = process.env.NODE_ENV || 'development';
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role, // canonical English
    },
    config[env].jwtSecret,
    { expiresIn: '24h' }
  );
};

const register = async (req, res) => {
  try {
    console.log('Registration request:', req.body);
    const { email, password, role = 'employee', firstname, lastname } = req.body;

    if (!email || !password) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log('Email already registered:', email);
      return res.status(400).json({ message: 'Email already registered' });
    }

    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      console.log('Invalid role:', role);
      return res.status(400).json({ message: 'Invalid role' });
    }

    console.log('Creating user with role:', normalizedRole);
    const user = await User.create({
      email,
      password,
      role: normalizedRole,
      firstname,
          lastname
        });
    
        res.status(201).json({ message: 'User registered successfully', user });
      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error during registration', error: error.message });
      }
    }

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // If your DB has old Arabic roles, normalize them on the fly
    if (!EN_WHITELIST.includes(user.role)) {
      const fixed = normalizeRole(user.role);
      if (fixed) {
        user.role = fixed;
        await user.save();
      }
    }

    const token = await generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,               // EN
        role_ar: EN_TO_AR[user.role],  // AR label for UI
        firstname: user.firstname,
        lastname: user.lastname,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      ...user.toJSON(),
      role_ar: EN_TO_AR[user.role] || user.role, // convenience
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

export default {
  register,
  login,
  getProfile
};
