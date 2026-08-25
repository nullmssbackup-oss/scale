import { useEffect, useState } from 'react';
import { getTasks, getBots, createTask } from '../api/client';
import { Task, Bot } from '../types';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ bot_id: '', task_type: '', data: '' });

  useEffect(() => {
    loadTasks();
    getBots().then(setBots).catch(console.error);
  }, [currentPage, statusFilter]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: String(PAGE_SIZE),
      };
      if (statusFilter) params.status = statusFilter;
      const data = await getTasks(params);
      setTasks(data);
      setTotalPages(Math.ceil(data.length / PAGE_SIZE) || 1);
    } catch (e) {
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTask.bot_id || !newTask.task_type) return;
    try {
      await createTask(newTask.bot_id, { task_type: newTask.task_type, data: newTask.data });
      toast.success('Tarefa criada');
      setIsModalOpen(false);
      setNewTask({ bot_id: '', task_type: '', data: '' });
      loadTasks();
    } catch (e) {
      toast.error('Erro ao criar tarefa');
    }
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tarefas</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
          Nova Tarefa
        </button>
      </div>

      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">Todos status</option>
          <option value="waiting">Waiting</option>
          <option value="in_process">In Process</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr><th>ID</th><th>Bot ID</th><th>Tipo</th><th>Dados</th><th>Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {tasks.map(task => (
              <tr key={task.id}>
                <td className="px-6 py-4">{task.id}</td>
                <td className="px-6 py-4">{task.bot_id}</td>
                <td className="px-6 py-4">{task.task_type}</td>
                <td className="px-6 py-4">{task.data}</td>
                <td className="px-6 py-4">{task.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Tarefa">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Bot</label>
            <select
              value={newTask.bot_id}
              onChange={(e) => setNewTask({ ...newTask, bot_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Selecione...</option>
              {bots.map(bot => (
                <option key={bot.id} value={bot.bot_id}>{bot.bot_id} ({bot.tag})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <input
              type="text"
              value={newTask.task_type}
              onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dados</label>
            <input
              type="text"
              value={newTask.data}
              onChange={(e) => setNewTask({ ...newTask, data: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <button onClick={handleCreate} className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Criar
          </button>
        </div>
      </Modal>
    </div>
  );
}
