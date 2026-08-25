import { useEffect, useState } from 'react';
import { getSmsList } from '../api/client';
import { Sms } from '../types';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import { formatDistanceToNow } from 'date-fns';

const PAGE_SIZE = 10;

export default function SmsPage() {
  const [sms, setSms] = useState<Sms[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [botFilter, setBotFilter] = useState('');

  useEffect(() => {
    loadSms();
  }, [currentPage, search, botFilter]);

  const loadSms = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: String(PAGE_SIZE),
      };
      if (search) params.search = search;
      if (botFilter) params.bot_id = botFilter;
      const data = await getSmsList(params);
      setSms(data);
      setTotalPages(Math.ceil(data.length / PAGE_SIZE) || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">SMS</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por conteúdo"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
        />
        <input
          type="text"
          placeholder="Filtrar por bot_id"
          value={botFilter}
          onChange={(e) => { setBotFilter(e.target.value); setCurrentPage(1); }}
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
                <tr><th>Bot ID</th><th>Número</th><th>Mensagem</th><th>Data</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sms.map(s => (
                  <tr key={s.id}>
                    <td className="px-6 py-4">{s.bot_id}</td>
                    <td className="px-6 py-4">{s.number}</td>
                    <td className="px-6 py-4">{s.msg}</td>
                    <td className="px-6 py-4">{formatDistanceToNow(new Date(Number(s.time) * 1000), { addSuffix: true })}</td>
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
