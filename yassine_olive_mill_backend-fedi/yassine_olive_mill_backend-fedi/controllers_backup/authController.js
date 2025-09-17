import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getConfig = async () => {
    const configPath = join(__dirname, '../config/config.json');
    const configFile = await readFile(configPath, 'utf8');
    return JSON.parse(configFile);
};

const generateToken = async (user) => {
    const config = await getConfig();
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email,
            role: user.role 
        },
        config.development.jwtSecret,
        { expiresIn: '24h' }
    );
};

const register = async (req, res) => {
    try {
        const { email, password, role, firstname, lastname } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const user = await User.create({
            email,
            password,
            role,
            firstname,
            lastname
        });

        const token = await generateToken(user);

        res.status(201).json({
            id: user.id,
            email: user.email,
            role: user.role,
            token
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = await generateToken(user);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error during login', error: error.message });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
};

export {
    register,
    login,
    getProfile
};
