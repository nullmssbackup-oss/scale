import { useEffect, useState } from 'react';
import { getSmarts, createSmart, updateSmart, deleteSmart } from '../services/api';
import { Smart } from '../types';
import Modal from '../components/Modal';
import { toast } from 'sonner';

export default function Smarts() {
  const [smarts, setSmarts] = useState<Smart[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSmart, setEditingSmart] = useState<Smart | null>(null);
  const [form, setForm] = useState({ stype: 'html', sgroup: '', package: '', data: '', cap_data: '', is_active: true });

  useEffect(() => {
    loadSmarts();
  }, []);

  const loadSmarts = async () => {
    try {
      const data = await getSmarts();
      setSmarts(data);
    } catch (error) {
      toast.error('Erro ao carregar injeta');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSmart(null);
    setForm({ stype: 'html', sgroup: '', package: '', data: '', cap_data: '', is_active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (smart: Smart) => {
    setEditingSmart(smart);
    setForm({ stype: smart.stype, sgroup: smart.sgroup, package: smart.package, data: smart.data, cap_data: smart.cap_data, is_active: smart.is_active });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingSmart) {
        await updateSmart(editingSmart.id, form);
        toast.success('Injeta atualizado');
      } else {
        await createSmart(form);
        toast.success('Injeta criado');
      }
      setIsModalOpen(false);
      loadSmarts();
    } catch (error) {
      toast.error('Erro ao salvar injeta');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este injeta?')) {
      try {
        await deleteSmart(id);
        toast.success('Injeta excluído');
        loadSmarts();
      } catch (error) {
        toast.error('Erro ao excluir');
      }
    }
  };

  const toggleActive = async (smart: Smart) => {
    try {
      await updateSmart(smart.id, { is_active: !smart.is_active });
      loadSmarts();
    } catch (error) {
      toast.error('Erro ao alternar status');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Injects (Smarts)</h1>
        <button onClick={openCreateModal} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
          Novo Injeta
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Carregando...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th>ID</th>
                <th>Pacote</th>
                <th>Grupo</th>
                <th>Tipo</th>
                <th>Ativo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {smarts.map((smart) => (
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
                    <button onClick={() => handleDelete(smart.id)} className="text-red-600 hover:text-red-900">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSmart ? 'Editar Injeta' : 'Novo Injeta'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={form.stype}
              onChange={(e) => setForm({ ...form, stype: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="html">HTML</option>
              <option value="url">URL</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Grupo</label>
            <input
              type="text"
              value={form.sgroup}
              onChange={(e) => setForm({ ...form, sgroup: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pacote</label>
            <input
              type="text"
              value={form.package}
              onChange={(e) => setForm({ ...form, package: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dados (HTML ou URL)</label>
            <textarea
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cap Data</label>
            <textarea
              value={form.cap_data}
              onChange={(e) => setForm({ ...form, cap_data: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="mr-2"
            />
            Ativo
          </label>
          <button onClick={handleSubmit} className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Salvar
          </button>
        </div>
      </Modal>
    </div>
  );
}