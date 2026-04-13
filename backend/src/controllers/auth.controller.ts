import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';


const generateToken = (id: string, email: string) => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    // Check if user exists using pool
    const [existingUsers]: any = await pool.query('SELECT * FROM `user` WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const id = uuidv4();

    // Insert user using pool
    await pool.query(
      'INSERT INTO `user` (id, email, password, name, role, subStatus, scanLimit) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, email, hashedPassword, name, 'architect', 'free', 0]
    );

    res.status(201).json({
      id,
      name,
      email,
      token: generateToken(id, email),
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    
    // Check if it's a database error
    if (error.code && error.code.startsWith('ER_')) {
      return res.status(500).json({ 
        message: 'Database error. Please ensure the database is accessible and the user table is correctly set up.', 
        error: error.message 
      });
    }

    res.status(500).json({ 
      message: 'Registration failed. Please try again or contact support.', 
      error: 'Registration error' 
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const [users]: any = await pool.query('SELECT * FROM `user` WHERE email = ?', [email]);
    const user = users[0];

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        token: generateToken(user.id, user.email),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    console.error('Login Error:', error);
    if (error.code && error.code.startsWith('ER_')) {
      return res.status(500).json({ 
        message: 'Database connection failed. Please check your DB settings.', 
        error: error.message 
      });
    }
    res.status(500).json({ 
      message: 'Error logging in. Please check your credentials.', 
      error: 'Login error' 
    });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const [users]: any = await pool.query(
      'SELECT id, name, email, role, subStatus, createdAt FROM `user` WHERE id = ?',
      [req.user.id]
    );
    const user = users[0];
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error getting user profile' });
  }
};
