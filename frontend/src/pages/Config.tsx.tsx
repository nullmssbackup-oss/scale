import { useEffect, useState } from 'react';
import { getConfig, updateConfig } from '../services/api';
import { Config } from '../types';
import { toast } from 'sonner';

export default function ConfigPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const data = await getConfig();
      setConfigs(data);
      const initial: Record<string, string> = {};
      data.forEach((c) => (initial[c.name] = c.value));
      setEditedValues(initial);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (name: string) => {
    try {
      await updateConfig(name, editedValues[name]);
      toast.success(`Configuração ${name} salva`);
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  if (loading) {
    return <div className="text-center py-10">Carregando...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Configurações</h1>

      <div className="space-y-4 max-w-3xl">
        {configs.map((config) => (
          <div key={config.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="mb-2">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{config.name}</h2>
              {config.descr && <p className="text-sm text-gray-500 dark:text-gray-400">{config.descr}</p>}
              {config.placeholder && <p className="text-xs text-gray-400 dark:text-gray-500">Placeholder: {config.placeholder}</p>}
            </div>
            <div className="flex gap-2">
              <textarea
                value={editedValues[config.name] || ''}
                onChange={(e) => handleChange(config.name, e.target.value)}
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