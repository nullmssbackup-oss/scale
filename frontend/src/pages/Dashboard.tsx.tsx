import { useEffect, useState } from 'react';
import { getBots, getTasks, getSmsList } from '../services/api';
import { Bot, Task, Sms } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sms, setSms] = useState<Sms[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [botsData, tasksData, smsData] = await Promise.all([
          getBots(),
          getTasks(),
          getSmsList(),
        ]);
        setBots(botsData);
        setTasks(tasksData);
        setSms(smsData);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const onlineBots = bots.filter((bot) => {
    const lastSeen = new Date(bot.last_seen);
    const diff = Date.now() - lastSeen.getTime();
    return diff < 10 * 60 * 1000; // online se último ping < 10 min
  }).length;

  const pendingTasks = tasks.filter((t) => t.status === 'waiting' || t.status === 'in_process').length;

  const stats = [
    { label: 'Total de Bots', value: bots.length },
    { label: 'Bots Online', value: onlineBots },
    { label: 'Bots Offline', value: bots.length - onlineBots },
    { label: 'Tarefas Pendentes', value: pendingTasks },
    { label: 'SMS Recebidos', value: sms.length },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard</h1>
      {loading ? (
        <div className="text-center">Carregando...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Últimos bots conectados */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Últimos Bots Conectados</h2>
            </div>
            <div className="divide-y dark:divide-gray-700">
              {bots.slice(0, 5).map((bot) => (
                <Link
                  key={bot.id}
                  to={`/bots/${bot.bot_id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
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
        </>
      )}
    </div>
  );
}