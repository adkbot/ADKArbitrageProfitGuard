
// 🌐 Simple HTTP Proxy Server for Geo-blocking Bypass
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PROXY_PORT || 8080;
const AUTH_USER = process.env.PROXY_AUTH_USER || 'proxy';
const AUTH_PASS = process.env.PROXY_AUTH_PASS || 'secure123';

// Basic authentication middleware
const basicAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Proxy"');
    return res.status(401).send('Authentication required');
  }
  
  const credentials = Buffer.from(auth.slice(6), 'base64').toString();
  const [username, password] = credentials.split(':');
  
  if (username === AUTH_USER && password === AUTH_PASS) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Proxy"');
    return res.status(401).send('Invalid credentials');
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Proxy middleware with authentication
app.use('/proxy', basicAuth, createProxyMiddleware({
  target: 'https://api.binance.com',
  changeOrigin: true,
  pathRewrite: {
    '^/proxy': '', // Remove /proxy prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add headers to bypass geo-blocking
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
    proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9');
    proxyReq.setHeader('Cache-Control', 'no-cache');
    proxyReq.setHeader('Pragma', 'no-cache');
    
    console.log(`Proxying request: ${req.method} ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}));

// Generic proxy for other exchanges
app.use('/proxy-okx', basicAuth, createProxyMiddleware({
  target: 'https://www.okx.com',
  changeOrigin: true,
  pathRewrite: { '^/proxy-okx': '' },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
    proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9');
  }
}));

app.use('/proxy-bybit', basicAuth, createProxyMiddleware({
  target: 'https://api.bybit.com',
  changeOrigin: true,
  pathRewrite: { '^/proxy-bybit': '' },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
    proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9');
  }
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Proxy server running on port ${PORT}`);
  console.log(`🔐 Authentication: ${AUTH_USER}:${AUTH_PASS}`);
});
