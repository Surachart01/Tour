import React, { useState } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Drawer, message, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Percent, Settings, Compass, Layers } from 'lucide-react';

export default function Markups() {
  const [markups, setMarkups] = useState([
    { id: 1, group: 'Web', serviceType: 'Hotels', valueType: 'Percentage', value: 15, city: 'All' },
    { id: 2, group: 'B2B', serviceType: 'Hotels', valueType: 'Percentage', value: 8, city: 'Phuket' },
    { id: 3, group: 'Web', serviceType: 'Tours', valueType: 'Percentage', value: 20, city: 'All' },
    { id: 4, group: 'B2C', serviceType: 'Transfers', valueType: 'Fixed', value: 200, city: 'Bangkok' }
  ]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Add Markup');
  const [currentMarkup, setCurrentMarkup] = useState(null);

  const handleOpenDrawer = (record = null) => {
    if (record) {
      setDrawerTitle('Edit Markup');
      setCurrentMarkup(record);
      form.setFieldsValue({
        group: record.group,
        serviceType: record.serviceType,
        valueType: record.valueType,
        value: record.value,
        city: record.city
      });
    } else {
      setDrawerTitle('Add Markup');
      setCurrentMarkup(null);
      form.resetFields();
      form.setFieldsValue({ valueType: 'Percentage', city: 'All' });
    }
    setDrawerVisible(true);
  };

  const handleSaveMarkup = async () => {
    try {
      const values = await form.validateFields();
      if (currentMarkup) {
        setMarkups(prev => prev.map(m => m.id === currentMarkup.id ? { ...m, ...values } : m));
        message.success('Markup updated successfully');
      } else {
        const newMarkup = { id: Date.now(), ...values };
        setMarkups(prev => [newMarkup, ...prev]);
        message.success('Markup added successfully');
      }
      setDrawerVisible(false);
    } catch (e) {
      message.error('Validation failed');
    }
  };

  const handleDelete = (id) => {
    setMarkups(prev => prev.filter(m => m.id !== id));
    message.success('Markup removed successfully');
  };

  const columns = [
    {
      title: 'Markup Group',
      dataIndex: 'group',
      key: 'group',
      render: (text) => <Tag color="purple" className="font-semibold uppercase">{text}</Tag>
    },
    {
      title: 'Service Type',
      dataIndex: 'serviceType',
      key: 'serviceType',
      render: (text) => <strong className="text-slate-700">{text}</strong>
    },
    {
      title: 'Rate Surcharge',
      key: 'value',
      render: (_, record) => {
        if (record.valueType === 'Percentage') {
          return <span className="font-bold text-emerald-600">{record.value}%</span>;
        }
        return <span className="font-bold text-sky-600">+{record.value.toLocaleString()} THB</span>;
      }
    },
    {
      title: 'Destination Applicability',
      dataIndex: 'city',
      key: 'city',
      render: (text) => <Tag color={text === 'All' ? 'blue' : 'cyan'}>{text}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined className="text-sky-600" />} onClick={() => handleOpenDrawer(record)} />
          <Popconfirm title="Delete this markup rule?" onConfirm={() => handleDelete(record.id)}>
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
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Markups</h1>
          <p className="text-slate-500 m-0 mt-1">Configure pricing markups for B2B/B2C/Web groups, applied dynamically to bookings</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenDrawer()} className="bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg flex items-center">
          Add Markup
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table dataSource={markups} columns={columns} rowKey="id" pagination={false} className="border border-slate-100 rounded-xl overflow-hidden shadow-inner" />
      </Card>

      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><Percent className="w-5 h-5 text-sky-600" /> {drawerTitle}</span>}
        width={400}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
            <Button type="primary" onClick={handleSaveMarkup} className="bg-sky-600 border-none">Save</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="group" label="Markup Group" rules={[{ required: true, message: 'Select markup group' }]}>
            <Select placeholder="Select group">
              <Select.Option value="Web">Web</Select.Option>
              <Select.Option value="B2B">B2B</Select.Option>
              <Select.Option value="B2C">B2C</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="serviceType" label="Service Type" rules={[{ required: true, message: 'Select service type' }]}>
            <Select placeholder="Select service">
              <Select.Option value="Hotels">Hotels</Select.Option>
              <Select.Option value="Tours">Tours</Select.Option>
              <Select.Option value="Excursions">Excursions</Select.Option>
              <Select.Option value="Transfers">Transfers</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="valueType" label="Surcharge Calculation Type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Percentage">Percentage (%)</Select.Option>
              <Select.Option value="Fixed">Fixed Surcharge (THB)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="value" label="Markup Value" rules={[{ required: true, message: 'Enter value' }]}>
            <InputNumber min={0} className="w-full h-10 flex items-center rounded-lg" />
          </Form.Item>

          <Form.Item name="city" label="City Applicability" rules={[{ required: true }]}>
            <Select placeholder="Destination specificity">
              <Select.Option value="All">All Cities</Select.Option>
              <Select.Option value="Bangkok">Bangkok</Select.Option>
              <Select.Option value="Phuket">Phuket</Select.Option>
              <Select.Option value="Chiang Mai">Chiang Mai</Select.Option>
              <Select.Option value="Pattaya">Pattaya</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
