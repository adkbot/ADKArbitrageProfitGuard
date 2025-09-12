import { useState } from 'react';
import ConfigurationModal from '../ConfigurationModal';
import { Button } from '@/components/ui/button';

export default function ConfigurationModalExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [savedConfig, setSavedConfig] = useState(null);
  
  const handleSave = (config: any) => {
    setSavedConfig(config);
    console.log('Configuration saved:', config);
  };
  
  return (
    <div className="p-6 space-y-4">
      <Button onClick={() => setIsOpen(true)}>
        Abrir Configurações
      </Button>
      
      {savedConfig && (
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Última configuração salva:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(savedConfig, null, 2)}
          </pre>
        </div>
      )}
      
      <ConfigurationModal
        open={isOpen}
        onOpenChange={setIsOpen}
        onSave={handleSave}
      />
    </div>
  );
}