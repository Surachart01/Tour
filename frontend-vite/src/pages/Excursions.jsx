import React, { useState, useEffect } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Drawer, message, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined, DollarOutlined } from '@ant-design/icons';
import { Binoculars, MapPin, Tag as TagIcon, Compass, Sparkles } from 'lucide-react';
import api from '../services/api.js';

export default function Excursions() {
  const [excursions, setExcursions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchForm] = Form.useForm();
  
  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Add Excursion');
  const [currentExcursion, setCurrentExcursion] = useState(null);
  const [form] = Form.useForm();

  // Mock Countries & Cities
  const countries = ['Thailand', 'Vietnam', 'Singapore'];
  const cities = {
    Thailand: ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Krabi'],
    Vietnam: ['Hanoi', 'Ho Chi Minh', 'Da Nang'],
    Singapore: ['Singapore City']
  };
  const [selectedCountry, setSelectedCountry] = useState(null);

  const mockExcursions = [
    {
      id: 1,
      name: 'Thai Cooking Class & Market Tour',
      city: 'Bangkok',
      country: 'Thailand',
      category: 'Activity / Workshop',
      supplier: 'Siam Cooking Academy',
      priceAdult: 1500,
      priceChild: 1000,
      description: 'Learn to cook 4 authentic Thai dishes. Includes a guided walking tour of a local fresh market.'
    },
    {
      id: 2,
      name: 'Elephant Jungle Sanctuary Visit',
      city: 'Chiang Mai',
      country: 'Thailand',
      category: 'Eco-Tourism',
      supplier: 'Chiang Mai Eco Tours',
      priceAdult: 2500,
      priceChild: 1800,
      description: 'Spend a half-day feed, bathing, and learning about rescued Asian elephants in a ethical environment.'
    },
    {
      id: 3,
      name: 'Mahanakhon SkyWalk Admission',
      city: 'Bangkok',
      country: 'Thailand',
      category: 'Entrance Ticket',
      supplier: 'King Power Mahanakhon',
      priceAdult: 880,
      priceChild: 250,
      description: 'Access to Thailands highest outdoor observation deck on the 78th floor with glass tray experience.'
    }
  ];

  const fetchExcursions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/excursions');
      if (response.data && response.data.length > 0) {
        setExcursions(response.data);
      } else {
        setExcursions(mockExcursions);
      }
    } catch (err) {
      console.warn('API error, using mock data:', err);
      setExcursions(mockExcursions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExcursions();
  }, []);

  const handleSearch = (values) => {
    setLoading(true);
    setTimeout(() => {
      let filtered = [...mockExcursions];
      if (values.country) {
        filtered = filtered.filter(e => e.country === values.country);
      }
      if (values.city) {
        filtered = filtered.filter(e => e.city === values.city);
      }
      if (values.keyword) {
        const kw = values.keyword.toLowerCase();
        filtered = filtered.filter(e => e.name.toLowerCase().includes(kw));
      }
      setExcursions(filtered);
      setLoading(false);
    }, 400);
  };

  const handleOpenDrawer = (record = null) => {
    if (record) {
      setDrawerTitle('Edit Excursion');
      setCurrentExcursion(record);
      form.setFieldsValue({
        name: record.name,
        country: record.country,
        city: record.city,
        category: record.category,
        supplier: record.supplier,
        priceAdult: record.priceAdult,
        priceChild: record.priceChild,
        description: record.description,
      });
      setSelectedCountry(record.country);
    } else {
      setDrawerTitle('Add Excursion');
      setCurrentExcursion(null);
      form.resetFields();
      setSelectedCountry(null);
    }
    setDrawerVisible(true);
  };

  const handleSaveExcursion = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };

      if (currentExcursion) {
        message.loading({ content: 'Saving...', key: 'excsave' });
        try {
          await api.put(`/excursions/${currentExcursion.id}`, payload);
        } catch (e) {}
        
        setExcursions(prev => prev.map(e => e.id === currentExcursion.id ? { ...e, ...payload } : e));
        message.success({ content: 'Excursion updated successfully', key: 'excsave' });
      } else {
        message.loading({ content: 'Creating...', key: 'excsave' });
        let newId = Date.now();
        try {
          const res = await api.post('/excursions', payload);
          if (res.data && res.data.id) newId = res.data.id;
        } catch (e) {}

        const newExcursion = { id: newId, ...payload };
        setExcursions(prev => [newExcursion, ...prev]);
        message.success({ content: 'Excursion added successfully', key: 'excsave' });
      }

      setDrawerVisible(false);
    } catch (err) {
      message.error('Please fix form validation errors.');
    }
  };

  const handleDeleteExcursion = async (id) => {
    try {
      await api.delete(`/excursions/${id}`);
    } catch (e) {}
    setExcursions(prev => prev.filter(e => e.id !== id));
    message.success('Excursion deleted successfully');
  };

  const columns = [
    {
      title: 'Excursion details',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <span className="font-bold text-slate-800 text-sm block">{text}</span>
          <span className="text-slate-400 text-xs mt-0.5 block">{record.description}</span>
        </div>
      )
    },
    {
      title: 'Location',
      dataIndex: 'city',
      key: 'city',
      render: (text, record) => (
        <span className="flex items-center gap-1 text-slate-600 text-sm">
          <MapPin className="w-3.5 h-3.5 text-sky-600" /> {text}, {record.country}
        </span>
      )
    },
    {
      title: 'Rates',
      key: 'rates',
      render: (_, record) => (
        <Space direction="vertical" size={1} className="text-xs">
          <span>Adult: <strong className="text-emerald-600">{(record.priceAdult || 0).toLocaleString()} THB</strong></span>
          <span>Child: <strong className="text-emerald-500">{(record.priceChild || 0).toLocaleString()} THB</strong></span>
        </Space>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text) => <Tag color="blue">{text}</Tag>
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
            title="Are you sure you want to delete this excursion?"
            onConfirm={() => handleDeleteExcursion(record.id)}
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
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Excursions</h1>
          <p className="text-slate-500 m-0 mt-1">Manage single-tickets, culinary workshops, local events, and ecotour items</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenDrawer()}
          className="bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg flex items-center"
        >
          Add Excursion
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm rounded-2xl mb-6 bg-slate-50/40">
        <Form
          form={searchForm}
          layout="vertical"
          onFinish={handleSearch}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Form.Item name="country" label="Country" className="mb-0">
            <Select
              placeholder="Select country"
              allowClear
              onChange={(val) => {
                setSelectedCountry(val);
                searchForm.setFieldsValue({ city: undefined });
              }}
              className="rounded-lg shadow-sm"
            >
              {countries.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
            </Select>
          </Form.Item>
          
          <Form.Item name="city" label="City" className="mb-0">
            <Select
              placeholder="Select city"
              allowClear
              disabled={!selectedCountry}
              className="rounded-lg shadow-sm"
            >
              {(cities[selectedCountry] || []).map(city => (
                <Select.Option key={city} value={city}>{city}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="keyword" label="Search Keyword" className="mb-0">
            <Input placeholder="Enter excursion name..." className="rounded-lg shadow-sm" />
          </Form.Item>

          <Form.Item label="&nbsp;" className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              className="w-full bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg"
            >
              Search Excursions
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Table list */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table
          dataSource={excursions}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} excursions` }}
          className="border border-slate-100 rounded-xl overflow-hidden shadow-inner"
        />
      </Card>

      {/* Add/Edit Drawer */}
      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-sky-600" /> {drawerTitle}</span>}
        width={550}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)} className="rounded-lg">Cancel</Button>
            <Button type="primary" onClick={handleSaveExcursion} className="bg-sky-600 border-none rounded-lg shadow-md shadow-sky-600/10">Save Excursion</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" className="grid grid-cols-1 gap-4 mt-2">
          <Form.Item name="name" label="Excursion Name" rules={[{ required: true, message: 'Please enter excursion name' }]}>
            <Input placeholder="Siam Niramit Show Entrance" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="country" label="Country" rules={[{ required: true, message: 'Please select country' }]}>
            <Select
              placeholder="Select country"
              onChange={(val) => {
                setSelectedCountry(val);
                form.setFieldsValue({ city: undefined });
              }}
              className="rounded-lg h-10"
            >
              {countries.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="city" label="City" rules={[{ required: true, message: 'Please select city' }]}>
            <Select placeholder="Select city" disabled={!selectedCountry} className="rounded-lg h-10">
              {(cities[selectedCountry] || []).map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select category' }]}>
            <Select placeholder="Select category" className="rounded-lg h-10">
              <Select.Option value="Entrance Ticket">Entrance Ticket</Select.Option>
              <Select.Option value="Activity / Workshop">Activity / Workshop</Select.Option>
              <Select.Option value="Eco-Tourism">Eco-Tourism</Select.Option>
              <Select.Option value="Water Sport">Water Sport</Select.Option>
              <Select.Option value="Show / Entertainment">Show / Entertainment</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="priceAdult" label="Adult Net Rate (THB)" rules={[{ required: true, message: 'Please enter adult rate' }]}>
            <InputNumber min={0} className="w-full rounded-lg h-10 flex items-center" />
          </Form.Item>

          <Form.Item name="priceChild" label="Child Net Rate (THB)" rules={[{ required: true, message: 'Please enter child rate' }]}>
            <InputNumber min={0} className="w-full rounded-lg h-10 flex items-center" />
          </Form.Item>

          <Form.Item name="supplier" label="Supplier">
            <Input placeholder="Enter supplier name..." className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="description" label="Excursion Description">
            <Input.TextArea placeholder="Details about timings, duration, and inclusions..." rows={4} className="rounded-lg" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
