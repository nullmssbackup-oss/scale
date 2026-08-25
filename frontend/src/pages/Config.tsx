import { useEffect, useState } from 'react';
import { getConfig, updateConfig } from '../api/client';
import { Config } from '../types';
import Spinner from '../components/Spinner';
import { toast } from 'sonner';

export default function ConfigPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConfig().then(data => {
      setConfigs(data);
      const initial: Record<string, string> = {};
      data.forEach(c => (initial[c.name] = c.value));
      setEditedValues(initial);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (name: string) => {
    try {
      await updateConfig(name, editedValues[name]);
      toast.success(`Configuração ${name} salva`);
    } catch (e) {
      toast.error('Erro ao salvar');
    }
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Configurações</h1>
      <div className="space-y-4 max-w-3xl">
        {configs.map(config => (
          <div key={config.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="mb-2">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{config.name}</h2>
              {config.descr && <p className="text-sm text-gray-500 dark:text-gray-400">{config.descr}</p>}
              {config.placeholder && <p className="text-xs text-gray-400 dark:text-gray-500">Placeholder: {config.placeholder}</p>}
            </div>
            <div className="flex gap-2">
              <textarea
                value={editedValues[config.name] || ''}
                onChange={(e) => setEditedValues(prev => ({ ...prev, [config.name]: e.target.value }))}
                rows={3}
                className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
              <button
                onClick={() => handleSave(config.name)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 self-start"
              >
                Salvar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
