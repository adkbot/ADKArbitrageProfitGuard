import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  binanceApiKey?: string;
  binanceSecretKey?: string;
  maxTradeAmount?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  createdAt: Date;
  lastAccess: Date;
}

export interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

export class AuthManager {
  private static instance: AuthManager;
  private users: Map<string, UserProfile> = new Map();

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // 🎯 Criar novo usuário ou fazer login
  async createOrLoginUser(identifier: string, userData: Partial<UserProfile> = {}): Promise<{ token: string; user: UserProfile }> {
    let user = this.users.get(identifier);
    
    if (!user) {
      // Criar novo usuário
      user = {
        id: identifier,
        name: userData.name || `User_${identifier.slice(0, 8)}`,
        email: userData.email,
        binanceApiKey: userData.binanceApiKey,
        binanceSecretKey: userData.binanceSecretKey,
        maxTradeAmount: userData.maxTradeAmount || 100, // Default $100
        riskLevel: userData.riskLevel || 'medium',
        createdAt: new Date(),
        lastAccess: new Date()
      };
      this.users.set(identifier, user);
      console.log(`👤 Novo usuário criado: ${user.name} (${identifier})`);
    } else {
      // Update last access
      user.lastAccess = new Date();
      // Update user data if provided
      if (userData.binanceApiKey) user.binanceApiKey = userData.binanceApiKey;
      if (userData.binanceSecretKey) user.binanceSecretKey = userData.binanceSecretKey;
      if (userData.maxTradeAmount) user.maxTradeAmount = userData.maxTradeAmount;
      if (userData.riskLevel) user.riskLevel = userData.riskLevel;
    }

    const token = this.generateToken(user.id);
    return { token, user };
  }

  // 🔐 Gerar JWT token
  generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      JWT_SECRET,
      { expiresIn: '7d' } // Token válido por 7 dias
    );
  }

  // ✅ Verificar e validar token
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      
      // Verificar se usuário ainda existe
      const user = this.users.get(decoded.userId);
      if (!user) {
        console.log(`❌ Token válido mas usuário ${decoded.userId} não encontrado`);
        return null;
      }

      // Update last access
      user.lastAccess = new Date();
      return decoded;
    } catch (error) {
      console.log(`❌ Token inválido: ${error.message}`);
      return null;
    }
  }

  // 👤 Obter perfil do usuário
  getUser(userId: string): UserProfile | null {
    return this.users.get(userId) || null;
  }

  // 📊 Obter todos usuários (admin)
  getAllUsers(): UserProfile[] {
    return Array.from(this.users.values());
  }

  // 🗑️ Remover usuário
  removeUser(userId: string): boolean {
    return this.users.delete(userId);
  }

  // 📈 Estatísticas
  getStats() {
    const users = Array.from(this.users.values());
    return {
      totalUsers: users.length,
      activeToday: users.filter(u => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return u.lastAccess >= today;
      }).length,
      newThisWeek: users.filter(u => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return u.createdAt >= weekAgo;
      }).length
    };
  }
}

// 🛡️ Middleware de autenticação para Express
export function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.query.token || 
                req.body.token;

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acesso requerido',
      help: 'Adicione header: Authorization: Bearer YOUR_TOKEN'
    });
  }

  const auth = AuthManager.getInstance();
  const decoded = auth.verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      error: 'Token inválido ou expirado',
      help: 'Faça login novamente para obter novo token'
    });
  }

  // Adicionar dados do usuário ao request
  req.user = auth.getUser(decoded.userId);
  req.userId = decoded.userId;
  
  next();
}