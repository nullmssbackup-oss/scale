import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBots, createTask } from '../services/api';
import { Bot } from '../types';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const PAGE_SIZE = 10;

export default function Bots() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ country: '', tag: '', status: '' });
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskType, setTaskType] = useState('');
  const [taskData, setTaskData] = useState('');

  useEffect(() => {
    loadBots();
  }, [currentPage, filters]);

  const loadBots = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: String(PAGE_SIZE),
        ...filters,
      };
      const data = await getBots(params);
      setBots(data);
      // Supondo que a API retorne também total de páginas no header ou no corpo;
      // aqui simplificamos calculando com base no retorno.
      setTotalPages(Math.ceil(data.length / PAGE_SIZE) || 1);
    } catch (error) {
      toast.error('Erro ao carregar bots');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const isOnline = (lastSeen: string) => {
    return Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000;
  };

  const openTaskModal = (bot: Bot) => {
    setSelectedBot(bot);
    setIsTaskModalOpen(true);
  };

  const submitTask = async () => {
    if (!selectedBot || !taskType) return;
    try {
      await createTask(selectedBot.bot_id, { task_type: taskType, data: taskData });
      toast.success('Tarefa criada');
      setIsTaskModalOpen(false);
      setTaskType('');
      setTaskData('');
    } catch (error) {
      toast.error('Erro ao criar tarefa');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Bots</h1>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          name="country"
          placeholder="Filtrar por país"
          value={filters.country}
          onChange={handleFilterChange}
          className="px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
        />
        <input
          type="text"
          name="tag"
          placeholder="Filtrar por tag"
          value={filters.tag}
          onChange={handleFilterChange}
          className="px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
        />
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">Todos status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10">Carregando...</div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Bot ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Modelo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">País</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Operadora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Última atividade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {bots.map((bot) => (
                  <tr key={bot.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{bot.bot_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{bot.tag}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{bot.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{bot.country}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{bot.operator}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatDistanceToNow(new Date(bot.last_seen), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${isOnline(bot.last_seen) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {isOnline(bot.last_seen) ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Link to={`/bots/${bot.bot_id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400">
                        Detalhes
                      </Link>
                      <button onClick={() => openTaskModal(bot)} className="text-green-600 hover:text-green-900 dark:text-green-400">
                        Tarefa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      {/* Modal de tarefa */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={`Nova Tarefa para ${selectedBot?.bot_id}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Tarefa</label>
            <input
              type="text"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              placeholder="ex: start_fg, register_again"
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dados</label>
            <input
              type="text"
              value={taskData}
              onChange={(e) => setTaskData(e.target.value)}
              placeholder="ex: true"
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <button
            onClick={submitTask}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Enviar
          </button>
        </div>
      </Modal>
    </div>
  );
}