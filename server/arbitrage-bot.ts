// Arquivo temporário para resolver imports
export class ArbitrageBot {
  static instance: ArbitrageBot;
  
  static getInstance(): ArbitrageBot {
    if (!ArbitrageBot.instance) {
      ArbitrageBot.instance = new ArbitrageBot();
    }
    return ArbitrageBot.instance;
  }
  
  async start() {
    console.log('🤖 ArbitrageBot started');
  }
  
  async stop() {
    console.log('🤖 ArbitrageBot stopped');
  }
}