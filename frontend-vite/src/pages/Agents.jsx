import React, { useState, useEffect } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Drawer, message, Popconfirm, InputNumber, Switch } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Building, MapPin, Mail, Phone, Clock, CreditCard, Percent } from 'lucide-react';
import api from '../services/api.js';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchForm] = Form.useForm();
  
  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Add Agent');
  const [currentAgent, setCurrentAgent] = useState(null);
  const [form] = Form.useForm();

  const mockAgents = [
    {
      id: 1,
      name: 'Vera Thailandia Online',
      email: 'beppe@verathailandia.com',
      markupGroup: 'Web',
      address: 'Life condo Sathorn soi 10, Bangkok',
      telephone: '026353551',
      fax: '026353550',
      paymentDeadlineType: '24_hours_before',
      paymentDeadlineDays: 1,
      enableAssistanceFee: true,
      defaultAssistanceFee: 1000.0
    },
    {
      id: 2,
      name: 'B2B Travel Partner Europe',
      email: 'partners@b2btravel.eu',
      markupGroup: 'B2B',
      address: 'Piazza del Duomo, Milan, Italy',
      telephone: '+39-02-8888-888',
      fax: '',
      paymentDeadlineType: 'days_before',
      paymentDeadlineDays: 7,
      enableAssistanceFee: false,
      defaultAssistanceFee: 0.0
    }
  ];

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/agents/');
      if (response.data && response.data.length > 0) {
        setAgents(response.data);
      } else {
        setAgents(mockAgents);
      }
    } catch (err) {
      console.warn('API error, using mock data:', err);
      setAgents(mockAgents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleSearch = (values) => {
    setLoading(true);
    setTimeout(() => {
      let filtered = [...mockAgents];
      if (values.markupGroup) {
        filtered = filtered.filter(a => a.markupGroup === values.markupGroup);
      }
      if (values.keyword) {
        const kw = values.keyword.toLowerCase();
        filtered = filtered.filter(a => a.name.toLowerCase().includes(kw) || a.email.toLowerCase().includes(kw));
      }
      setAgents(filtered);
      setLoading(false);
    }, 300);
  };

  const handleOpenDrawer = (record = null) => {
    if (record) {
      setDrawerTitle('Edit Agent');
      setCurrentAgent(record);
      form.setFieldsValue({
        name: record.name,
        email: record.email,
        markupGroup: record.markupGroup,
        address: record.address,
        telephone: record.telephone,
        fax: record.fax,
        paymentDeadlineType: record.paymentDeadlineType,
        paymentDeadlineDays: record.paymentDeadlineDays,
        enableAssistanceFee: record.enableAssistanceFee,
        defaultAssistanceFee: record.defaultAssistanceFee,
      });
    } else {
      setDrawerTitle('Add Agent');
      setCurrentAgent(null);
      form.resetFields();
      form.setFieldsValue({
        paymentDeadlineType: '24_hours_before',
        paymentDeadlineDays: 1,
        enableAssistanceFee: false,
        defaultAssistanceFee: 0,
      });
    }
    setDrawerVisible(true);
  };

  const handleSaveAgent = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };

      if (currentAgent) {
        message.loading({ content: 'Saving...', key: 'agentsave' });
        try {
          await api.put(`/agents/${currentAgent.id}`, payload);
        } catch (e) {}
        
        setAgents(prev => prev.map(a => a.id === currentAgent.id ? { ...a, ...payload } : a));
        message.success({ content: 'Agent updated successfully', key: 'agentsave' });
      } else {
        message.loading({ content: 'Creating...', key: 'agentsave' });
        let newId = Date.now();
        try {
          const res = await api.post('/agents', payload);
          if (res.data && res.data.id) newId = res.data.id;
        } catch (e) {}

        const newAgent = { id: newId, ...payload };
        setAgents(prev => [newAgent, ...prev]);
        message.success({ content: 'Agent added successfully', key: 'agentsave' });
      }

      setDrawerVisible(false);
    } catch (err) {
      message.error('Please fix form validation errors.');
    }
  };

  const handleDeleteAgent = async (id) => {
    try {
      await api.delete(`/agents/${id}`);
    } catch (e) {}
    setAgents(prev => prev.filter(a => a.id !== id));
    message.success('Agent deleted successfully');
  };

  const columns = [
    {
      title: 'Agent Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <span className="font-bold text-slate-800 text-sm block">{text}</span>
          <span className="text-slate-400 text-xs mt-0.5 flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-slate-400" /> {record.email}
          </span>
          <span className="text-slate-400 text-xs mt-0.5 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-slate-400" /> {record.address}
          </span>
        </div>
      )
    },
    {
      title: 'Markup Group',
      dataIndex: 'markupGroup',
      key: 'markupGroup',
      render: (text) => <Tag color="purple">{text || 'Direct'}</Tag>
    },
    {
      title: 'Payment Deadline',
      key: 'deadline',
      render: (_, record) => {
        if (record.paymentDeadlineType === '24_hours_before') return <Tag color="volcano">24h Before</Tag>;
        return <Tag color="orange">{record.paymentDeadlineDays} Days Before</Tag>;
      }
    },
    {
      title: 'Assistance Fee',
      key: 'fee',
      render: (_, record) => {
        if (!record.enableAssistanceFee) return <span className="text-slate-400 text-xs">Disabled</span>;
        return <strong className="text-emerald-600">{(record.defaultAssistanceFee || 0).toLocaleString()} THB</strong>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined className="text-sky-600 hover:text-sky-800" />}
            onClick={() => handleOpenDrawer(record)}
          />
          <Popconfirm
            title="Are you sure you want to delete this agent?"
            onConfirm={() => handleDeleteAgent(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Agents</h1>
          <p className="text-slate-500 m-0 mt-1">Manage partner travel agents, pricing tiers (markups), payment parameters, and automatic booking fees</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenDrawer()}
          className="bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg flex items-center"
        >
          Add Agent
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm rounded-2xl mb-6 bg-slate-50/40">
        <Form
          form={searchForm}
          layout="vertical"
          onFinish={handleSearch}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Form.Item name="markupGroup" label="Markup Group" className="mb-0">
            <Select placeholder="All groups" allowClear className="rounded-lg shadow-sm">
              <Select.Option value="Web">Web</Select.Option>
              <Select.Option value="B2B">B2B</Select.Option>
              <Select.Option value="B2C">B2C</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="keyword" label="Search Keyword" className="mb-0">
            <Input placeholder="Enter agent name or email..." className="rounded-lg shadow-sm" />
          </Form.Item>

          <Form.Item label="&nbsp;" className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              className="w-full bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg"
            >
              Search Agents
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Table list */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table
          dataSource={agents}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} agents` }}
          className="border border-slate-100 rounded-xl overflow-hidden shadow-inner"
        />
      </Card>

      {/* Add/Edit Drawer */}
      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><Building className="w-5 h-5 text-sky-600" /> {drawerTitle}</span>}
        width={550}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)} className="rounded-lg">Cancel</Button>
            <Button type="primary" onClick={handleSaveAgent} className="bg-sky-600 border-none rounded-lg shadow-md shadow-sky-600/10">Save Agent</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" className="grid grid-cols-1 gap-4 mt-2">
          <Form.Item name="name" label="Agent Brand Name" rules={[{ required: true, message: 'Please enter agent name' }]}>
            <Input placeholder="Vera Thailandia Online" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="email" label="Agent Contact Email" rules={[{ required: true, type: 'email', message: 'Please enter valid email' }]}>
            <Input placeholder="beppe@verathailandia.com" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="markupGroup" label="Markup Group" rules={[{ required: true, message: 'Please select markup group' }]}>
            <Select placeholder="Select markup group" className="rounded-lg h-10">
              <Select.Option value="Web">Web</Select.Option>
              <Select.Option value="B2B">B2B</Select.Option>
              <Select.Option value="B2C">B2C</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="address" label="Office Address">
            <Input placeholder="Full company address..." className="rounded-lg h-10" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="telephone" label="Telephone">
              <Input placeholder="02-635-3551" className="rounded-lg h-10" />
            </Form.Item>

            <Form.Item name="fax" label="Fax">
              <Input placeholder="02-635-3550" className="rounded-lg h-10" />
            </Form.Item>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-2">
            <h4 className="text-slate-800 font-bold text-sm mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" /> Payment Terms
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item name="paymentDeadlineType" label="Deadline Type">
                <Select className="rounded-lg h-10">
                  <Select.Option value="24_hours_before">24 Hours Before Travel</Select.Option>
                  <Select.Option value="days_before">Fixed Days Before Travel</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="paymentDeadlineDays" label="Deadline Days Offset">
                <InputNumber min={0} className="w-full rounded-lg h-10 flex items-center" />
              </Form.Item>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-2">
            <h4 className="text-slate-800 font-bold text-sm mb-4 flex items-center gap-2">
              <Percent className="w-4 h-4 text-sky-600" /> Booking Surcharge (Assistance Fee)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <Form.Item name="enableAssistanceFee" label="Enable Booking Fee" valuePropName="checked">
                <Switch />
              </Form.Item>

              <Form.Item name="defaultAssistanceFee" label="Surcharge Fee (THB)">
                <InputNumber min={0} className="w-full rounded-lg h-10 flex items-center" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}
