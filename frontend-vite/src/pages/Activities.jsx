import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Button, Tag, Space, Timeline } from 'antd';
import { SearchOutlined, ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import { Calendar, User, Eye, Activity } from 'lucide-react';
import api from '../services/api.js';

export default function Activities() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const mockLogs = [
    { id: 1, user: 'superadmin', action: 'CREATE', resource: 'Hotel', resourceName: 'Mandarin Oriental Bangkok', time: '2026-06-10 14:41:00', details: 'Created hotel profile and room schedules' },
    { id: 2, user: 'superadmin', action: 'CREATE', resource: 'User', resourceName: 'agentadmin', time: '2026-06-10 14:41:41', details: 'Added new agency admin account' },
    { id: 3, user: 'agentadmin', action: 'LOGIN', resource: 'Session', resourceName: 'agentadmin', time: '2026-06-10 14:41:47', details: 'Auth token generated from IP 127.0.0.1' },
    { id: 4, user: 'superadmin', action: 'UPDATE', resource: 'Markup', resourceName: 'Web Group', time: '2026-06-10 09:10:00', details: 'Changed hotel markup percentage from 10% to 15%' }
  ];

  const fetchLogs = async () => {
    setLoading(true);
    // Real endpoint: api.get('/activities')
    setTimeout(() => {
      setLogs(mockLogs);
      setLoading(false);
    }, 400);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => {
      let filtered = [...mockLogs];
      if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter(l => l.user.toLowerCase().includes(kw) || l.details.toLowerCase().includes(kw) || l.resource.toLowerCase().includes(kw));
      }
      setLogs(filtered);
      setLoading(false);
    }, 300);
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'time',
      key: 'time',
      render: (text) => (
        <span className="text-slate-500 font-mono text-xs flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" /> {text}
        </span>
      )
    },
    {
      title: 'User Identity',
      dataIndex: 'user',
      key: 'user',
      render: (text) => (
        <span className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-sky-600" /> {text}
        </span>
      )
    },
    {
      title: 'Action Event',
      dataIndex: 'action',
      key: 'action',
      render: (action) => {
        let color = 'blue';
        if (action === 'CREATE') color = 'green';
        if (action === 'DELETE') color = 'red';
        if (action === 'UPDATE') color = 'orange';
        return <Tag color={color} className="font-bold">{action}</Tag>;
      }
    },
    {
      title: 'Entity Class',
      dataIndex: 'resource',
      key: 'resource',
      render: (text, record) => (
        <div>
          <span className="font-semibold text-slate-800 text-sm block">{text}</span>
          <span className="text-slate-400 text-xs mt-0.5">{record.resourceName}</span>
        </div>
      )
    },
    {
      title: 'Transaction Details',
      dataIndex: 'details',
      key: 'details',
      render: (text) => <span className="text-slate-500 text-xs font-semibold">{text}</span>
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Activities Log</h1>
          <p className="text-slate-500 m-0 mt-1">Audit log database tracking administrative user events, modifications, and access traces</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchLogs} className="rounded-lg shadow-sm">
          Refresh Logs
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl mb-6 bg-slate-50/40">
        <div className="flex gap-4 max-w-lg">
          <Input
            placeholder="Search by user, action, or remarks..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            className="rounded-lg h-10 shadow-sm"
          />
          <Button
            type="primary"
            onClick={handleSearch}
            icon={<SearchOutlined />}
            className="bg-sky-600 border-none rounded-lg h-10 px-6 font-semibold shadow-md shadow-sky-600/10"
          >
            Search
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table representation */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden lg:col-span-2">
          <Table
            dataSource={logs}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            className="border border-slate-100 rounded-xl overflow-hidden shadow-inner"
          />
        </Card>

        {/* Timeline View representation */}
        <Card title={<span className="font-bold text-slate-800 text-sm flex items-center gap-2"><HistoryOutlined className="text-sky-600" /> Recent Actions Timeline</span>} className="border-none shadow-sm rounded-2xl h-fit">
          <Timeline className="mt-4">
            {logs.map((log) => (
              <Timeline.Item key={log.id} color={log.action === 'CREATE' ? 'green' : log.action === 'DELETE' ? 'red' : 'blue'}>
                <div className="text-xs text-slate-400 font-mono mb-1">{log.time}</div>
                <div className="text-sm font-semibold text-slate-700">
                  <span className="text-sky-600">{log.user}</span> executed <Tag color={log.action === 'CREATE' ? 'green' : log.action === 'DELETE' ? 'red' : 'blue'} className="text-[10px] py-0 px-1.5 ml-1">{log.action}</Tag>
                </div>
                <div className="text-xs text-slate-500 mt-1">{log.details}</div>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      </div>
    </div>
  );
}
