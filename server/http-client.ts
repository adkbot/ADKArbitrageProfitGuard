// 🚨 HTTP CLIENT COM KILL-SWITCH AUTOMÁTICO PARA BLOQUEIO GEOGRÁFICO
import axios from "axios";

export const http = axios.create({ timeout: 7000 });

http.interceptors.response.use(
  r => r,
  err => {
    const code = err?.response?.status;
    if (code === 451 || code === 403) {
      console.error("[NET] Bloqueio geográfico detectado (", code, "). Pare o bot ou troque de região (VPS/WireGuard).");
      // 🚨 KILL-SWITCH AUTOMÁTICO - Desativa arbitragem quando detecta bloqueio
      process.env.ARBITRAGE_ENABLED = "false";
      console.error("🚨 SISTEMA DESATIVADO AUTOMATICAMENTE - Bloqueio geográfico detectado!");
    }
    return Promise.reject(err);
  }
);