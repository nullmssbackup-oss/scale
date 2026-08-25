import { useEffect, useState } from 'react';
import { getSmarts, createSmart, updateSmart, deleteSmart } from '../api/client';
import { Smart } from '../types';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Spinner from '../components/Spinner';
import { toast } from 'sonner';

interface SmartForm {
  stype: string;
  sgroup: string;
  package: string;
  data: string;
  cap_data: string;
  is_active: boolean;
  iconBase64?: string; // base64 do ícone
}

export default function Smarts() {
  const [smarts, setSmarts] = useState<Smart[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSmart, setEditingSmart] = useState<Smart | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<SmartForm>({
    stype: 'html',
    sgroup: '',
    package: '',
    data: '',
    cap_data: '',
    is_active: true,
    iconBase64: '',
  });

  useEffect(() => {
    loadSmarts();
  }, []);

  const loadSmarts = async () => {
    try {
      const data = await getSmarts();
      setSmarts(data);
    } catch (e) {
      toast.error('Erro ao carregar injeta');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSmart(null);
    setForm({ stype: 'html', sgroup: '', package: '', data: '', cap_data: '', is_active: true, iconBase64: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (smart: Smart) => {
    setEditingSmart(smart);
    setForm({
      stype: smart.stype,
      sgroup: smart.sgroup,
      package: smart.package,
      data: smart.data,
      cap_data: smart.cap_data,
      is_active: smart.is_active,
      iconBase64: typeof smart.icon === 'string' ? smart.icon : '',
    });
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix
      setForm(prev => ({ ...prev, iconBase64: base64.split(',')[1] }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        stype: form.stype,
        sgroup: form.sgroup,
        package: form.package,
        data: form.data,
        cap_data: form.cap_data,
        is_active: form.is_active,
        icon: form.iconBase64 || undefined,
      };
      if (editingSmart) {
        await updateSmart(editingSmart.id, payload);
        toast.success('Injeta atualizado');
      } else {
        await createSmart(payload);
        toast.success('Injeta criado');
      }
      setIsModalOpen(false);
      loadSmarts();
    } catch (e) {
      toast.error('Erro ao salvar injeta');
    }
  };

  const handleDelete = async () => {
    if (confirmDeleteId === null) return;
    try {
      await deleteSmart(confirmDeleteId);
      toast.success('Injeta excluído');
      setConfirmDeleteId(null);
      loadSmarts();
    } catch (e) {
      toast.error('Erro ao excluir');
    }
  };

  const toggleActive = async (smart: Smart) => {
    try {
      await updateSmart(smart.id, { is_active: !smart.is_active });
      loadSmarts();
    } catch (e) {
      toast.error('Erro ao alternar status');
    }
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Injects (Smarts)</h1>
        <button onClick={openCreateModal} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
          Novo Injeta
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th>ID</th><th>Pacote</th><th>Grupo</th><th>Tipo</th><th>Ativo</th><th>Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {smarts.map(smart => (
              <tr key={smart.id}>
                <td className="px-6 py-4">{smart.id}</td>
                <td className="px-6 py-4">{smart.package}</td>
                <td className="px-6 py-4">{smart.sgroup}</td>
                <td className="px-6 py-4">{smart.stype}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleActive(smart)}
                    className={`px-2 py-1 rounded-full text-xs ${smart.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}
                  >
                    {smart.is_active ? 'Sim' : 'Não'}
                  </button>
                </td>
                <td className="px-6 py-4 space-x-2">
                  <button onClick={() => openEditModal(smart)} className="text-indigo-600 hover:text-indigo-900">Editar</button>
                  <button onClick={() => setConfirmDeleteId(smart.id)} className="text-red-600 hover:text-red-900">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSmart ? 'Editar Injeta' : 'Novo Injeta'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select value={form.stype} onChange={(e) => setForm({ ...form, stype: e.target.value })} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
              <option value="html">HTML</option>
              <option value="url">URL</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Grupo</label>
            <input value={form.sgroup} onChange={(e) => setForm({ ...form, sgroup: e.target.value })} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pacote</label>
            <input value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dados (HTML/URL)</label>
            <textarea value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cap Data</label>
            <textarea value={form.cap_data} onChange={(e) => setForm({ ...form, cap_data: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ícone (PNG)</label>
            <input type="file" accept="image/png" onChange={handleFileChange} className="w-full text-sm" />
            {form.iconBase64 && (
              <img src={`data:image/png;base64,${form.iconBase64}`} alt="Preview" className="mt-2 h-10 w-10 object-contain border" />
            )}
          </div>
          <label className="flex items-center">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="mr-2" />
            Ativo
          </label>
          <button onClick={handleSubmit} className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Salvar
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir este injeta?"
      />
    </div>
  );
}
