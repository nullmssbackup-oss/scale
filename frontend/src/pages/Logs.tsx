import { useEffect, useState } from 'react';
import { getSmartsData } from '../api/client';
import { SmartsData } from '../types';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';

const PAGE_SIZE = 10;

export default function Logs() {
  const [logs, setLogs] = useState<SmartsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ bot_id: '', smart_id: '' });

  useEffect(() => {
    loadLogs();
  }, [currentPage, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: String(PAGE_SIZE),
        ...filters,
      };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      const data = await getSmartsData(params);
      setLogs(data);
      setTotalPages(Math.ceil(data.length / PAGE_SIZE) || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatData = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Logs de Injects</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Filtrar por bot_id"
          value={filters.bot_id}
          onChange={(e) => { setFilters({ ...filters, bot_id: e.target.value }); setCurrentPage(1); }}
          className="w-full sm:w-48 px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
        />
        <input
          type="text"
          placeholder="Filtrar por smart_id"
          value={filters.smart_id}
          onChange={(e) => { setFilters({ ...filters, smart_id: e.target.value }); setCurrentPage(1); }}
          className="w-full sm:w-48 px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      {loading ? (
        <Spinner size="lg" />
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr><th>ID</th><th>Bot ID</th><th>Smart ID</th><th>Data</th><th>Conteúdo</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="px-6 py-4">{log.id}</td>
                    <td className="px-6 py-4">{log.bot_id}</td>
                    <td className="px-6 py-4">{log.smart_id}</td>
                    <td className="px-6 py-4">{new Date(Number(log.time) * 1000).toLocaleString()}</td>
                    <td className="px-6 py-4 max-w-md">
                      <pre className="whitespace-pre-wrap break-all">{formatData(log.data)}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  );
}
