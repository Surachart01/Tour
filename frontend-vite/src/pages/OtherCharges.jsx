import React, { useState } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Drawer, message, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { DollarSign, Layers } from 'lucide-react';

export default function OtherCharges() {
  const [charges, setCharges] = useState([
    { id: 1, code: 'VAT7', name: '7% Government VAT', type: 'Percentage', amount: 7, description: 'Standard Thai Government Value Added Tax' },
    { id: 2, code: 'CC3', name: 'Credit Card Fee Surcharge', type: 'Percentage', amount: 3, description: 'Merchant fee applied to credit card payments' },
    { id: 3, code: 'WIRE', name: 'International Bank Wire Surcharge', type: 'Fixed', amount: 500, description: 'Fixed processing surcharge for SWIFT transfers' }
  ]);
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Add Surcharge');
  const [currentCharge, setCurrentCharge] = useState(null);

  const handleOpenDrawer = (record = null) => {
    if (record) {
      setDrawerTitle('Edit Surcharge');
      setCurrentCharge(record);
      form.setFieldsValue({
        code: record.code,
        name: record.name,
        type: record.type,
        amount: record.amount,
        description: record.description
      });
    } else {
      setDrawerTitle('Add Surcharge');
      setCurrentCharge(null);
      form.resetFields();
      form.setFieldsValue({ type: 'Percentage' });
    }
    setDrawerVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (currentCharge) {
        setCharges(prev => prev.map(c => c.id === currentCharge.id ? { ...c, ...values } : c));
        message.success('Surcharge configuration updated');
      } else {
        const newCharge = { id: Date.now(), ...values };
        setCharges(prev => [newCharge, ...prev]);
        message.success('Surcharge configuration created');
      }
      setDrawerVisible(false);
    } catch (e) {
      message.error('Validation failed');
    }
  };

  const handleDelete = (id) => {
    setCharges(prev => prev.filter(c => c.id !== id));
    message.success('Surcharge configuration removed');
  };

  const columns = [
    {
      title: 'Fee Code',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <Tag color="blue" className="font-mono font-bold uppercase">{text}</Tag>
    },
    {
      title: 'Name & Details',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <span className="font-bold text-slate-800 text-sm block">{text}</span>
          <span className="text-slate-400 text-xs mt-0.5">{record.description}</span>
        </div>
      )
    },
    {
      title: 'Rate Surcharge',
      key: 'amount',
      render: (_, record) => {
        if (record.type === 'Percentage') {
          return <strong className="text-emerald-600 font-bold text-sm">{record.amount}%</strong>;
        }
        return <strong className="text-sky-600 font-bold text-sm">+{record.amount.toLocaleString()} THB</strong>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined className="text-sky-600" />} onClick={() => handleOpenDrawer(record)} />
          <Popconfirm title="Remove this administrative fee?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Other Charges</h1>
          <p className="text-slate-500 m-0 mt-1">Configure miscellaneous fee surcharges, government tax percentages, and transaction fees</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenDrawer()} className="bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg flex items-center">
          Add Charge
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table dataSource={charges} columns={columns} rowKey="id" pagination={false} className="border border-slate-100 rounded-xl overflow-hidden shadow-inner" />
      </Card>

      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><DollarSign className="w-5 h-5 text-sky-600" /> {drawerTitle}</span>}
        width={400}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
            <Button type="primary" onClick={handleSave} className="bg-sky-600 border-none">Save Charge</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="code" label="Fee / Charge Code" rules={[{ required: true, message: 'Fee code is required (e.g. VAT7)' }]}>
            <Input placeholder="VAT7" className="rounded-lg h-10 font-mono" />
          </Form.Item>

          <Form.Item name="name" label="Surcharge Name" rules={[{ required: true, message: 'Fee name is required' }]}>
            <Input placeholder="7% Government VAT" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="type" label="Charge Type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Percentage">Percentage (%)</Select.Option>
              <Select.Option value="Fixed">Fixed Surcharge (THB)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="amount" label="Fee Surcharge Amount" rules={[{ required: true, message: 'Amount is required' }]}>
            <InputNumber min={0} className="w-full h-10 flex items-center rounded-lg" />
          </Form.Item>

          <Form.Item name="description" label="Fee Description">
            <Input.TextArea placeholder="Internal booking fee remarks..." rows={3} className="rounded-lg" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
