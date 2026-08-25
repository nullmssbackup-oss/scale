import { useEffect, useState } from 'react';
import { getBots, getTasks, getSmsList } from '../api/client';
import { Bot, Task, Sms } from '../types';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Spinner from '../components/Spinner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sms, setSms] = useState<Sms[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [b, t, s] = await Promise.all([getBots(), getTasks(), getSmsList()]);
        setBots(b); setTasks(t); setSms(s);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const online = bots.filter(b => Date.now() - new Date(b.last_seen).getTime() < 10 * 60 * 1000).length;
  const pending = tasks.filter(t => t.status === 'waiting' || t.status === 'in_process').length;

  const stats = [
    { label: 'Total de Bots', value: bots.length },
    { label: 'Online', value: online },
    { label: 'Offline', value: bots.length - online },
    { label: 'Tarefas Pendentes', value: pending },
    { label: 'SMS', value: sms.length },
  ];

  // Dados para gráfico (últimos 7 dias - placeholder)
  const chartData = [
    { day: 'Seg', bots: 4 },
    { day: 'Ter', bots: 6 },
    { day: 'Qua', bots: 5 },
    { day: 'Qui', bots: 8 },
    { day: 'Sex', bots: 7 },
    { day: 'Sáb', bots: 9 },
    { day: 'Dom', bots: 10 },
  ];

  if (loading) {
    return <Spinner size="lg" />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Bots Online (últimos 7 dias)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="bots" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold">Últimos Bots Conectados</h2>
          </div>
          <div className="divide-y dark:divide-gray-700">
            {bots.slice(0, 5).map(bot => (
              <Link
                key={bot.id}
                to={`/bots/${bot.bot_id}`}
                className="flex justify-between items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{bot.tag || bot.bot_id}</span>
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{bot.country}</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(bot.last_seen), { addSuffix: true })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
