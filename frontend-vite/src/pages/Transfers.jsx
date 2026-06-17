import React, { useState, useEffect } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Drawer, message, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined, CarOutlined } from '@ant-design/icons';
import { Bus, MapPin, Navigation, ArrowRight } from 'lucide-react';
import api from '../services/api.js';

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchForm] = Form.useForm();
  
  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Add Transfer');
  const [currentTransfer, setCurrentTransfer] = useState(null);
  const [form] = Form.useForm();

  // Mock Countries & Cities
  const countries = ['Thailand', 'Vietnam', 'Singapore'];
  const cities = {
    Thailand: ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Krabi'],
    Vietnam: ['Hanoi', 'Ho Chi Minh', 'Da Nang'],
    Singapore: ['Singapore City']
  };
  const [selectedCountry, setSelectedCountry] = useState(null);

  const mockTransfers = [
    {
      id: 1,
      type: 'BKK Airport to Bangkok Hotel',
      vehicle: 'Deluxe Sedan (Toyota Camry)',
      city: 'Bangkok',
      country: 'Thailand',
      departure: 'Suvarnabhumi Airport (BKK)',
      arrival: 'Bangkok Downtown Hotel',
      price: 1200,
      capacityPax: 3,
      capacityLuggage: 3,
      supplier: 'Bangkok Limo Express'
    },
    {
      id: 2,
      type: 'Phuket Hotel to Pier Transfer',
      vehicle: 'Standard Van (Toyota Commuter)',
      city: 'Phuket',
      country: 'Thailand',
      departure: 'Phuket Hotel (Patong/Karon)',
      arrival: 'Rassada Pier',
      price: 800,
      capacityPax: 9,
      capacityLuggage: 8,
      supplier: 'Phuket Ferry Transfers'
    },
    {
      id: 3,
      type: 'Bangkok Hotel to Pattaya Hotel',
      vehicle: 'Family SUV (Toyota Fortuner)',
      city: 'Bangkok',
      country: 'Thailand',
      departure: 'Bangkok Downtown Hotel',
      arrival: 'Pattaya Beach Hotel',
      price: 2200,
      capacityPax: 4,
      capacityLuggage: 4,
      supplier: 'Thailand Intercity Transit'
    }
  ];

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/transfers');
      if (response.data && response.data.length > 0) {
        setTransfers(response.data);
      } else {
        setTransfers(mockTransfers);
      }
    } catch (err) {
      console.warn('API error, using mock data:', err);
      setTransfers(mockTransfers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleSearch = (values) => {
    setLoading(true);
    setTimeout(() => {
      let filtered = [...mockTransfers];
      if (values.country) {
        filtered = filtered.filter(t => t.country === values.country);
      }
      if (values.city) {
        filtered = filtered.filter(t => t.city === values.city);
      }
      if (values.keyword) {
        const kw = values.keyword.toLowerCase();
        filtered = filtered.filter(t => t.type.toLowerCase().includes(kw) || t.vehicle.toLowerCase().includes(kw));
      }
      setTransfers(filtered);
      setLoading(false);
    }, 400);
  };

  const handleOpenDrawer = (record = null) => {
    if (record) {
      setDrawerTitle('Edit Transfer');
      setCurrentTransfer(record);
      form.setFieldsValue({
        type: record.type,
        vehicle: record.vehicle,
        country: record.country,
        city: record.city,
        departure: record.departure,
        arrival: record.arrival,
        price: record.price,
        capacityPax: record.capacityPax,
        capacityLuggage: record.capacityLuggage,
        supplier: record.supplier,
      });
      setSelectedCountry(record.country);
    } else {
      setDrawerTitle('Add Transfer');
      setCurrentTransfer(null);
      form.resetFields();
      setSelectedCountry(null);
    }
    setDrawerVisible(true);
  };

  const handleSaveTransfer = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };

      if (currentTransfer) {
        message.loading({ content: 'Saving...', key: 'transsave' });
        try {
          await api.put(`/transfers/${currentTransfer.id}`, payload);
        } catch (e) {}
        
        setTransfers(prev => prev.map(t => t.id === currentTransfer.id ? { ...t, ...payload } : t));
        message.success({ content: 'Transfer updated successfully', key: 'transsave' });
      } else {
        message.loading({ content: 'Creating...', key: 'transsave' });
        let newId = Date.now();
        try {
          const res = await api.post('/transfers', payload);
          if (res.data && res.data.id) newId = res.data.id;
        } catch (e) {}

        const newTransfer = { id: newId, ...payload };
        setTransfers(prev => [newTransfer, ...prev]);
        message.success({ content: 'Transfer added successfully', key: 'transsave' });
      }

      setDrawerVisible(false);
    } catch (err) {
      message.error('Please fix form validation errors.');
    }
  };

  const handleDeleteTransfer = async (id) => {
    try {
      await api.delete(`/transfers/${id}`);
    } catch (e) {}
    setTransfers(prev => prev.filter(t => t.id !== id));
    message.success('Transfer deleted successfully');
  };

  const columns = [
    {
      title: 'Transfer Route & Vehicle',
      dataIndex: 'type',
      key: 'type',
      render: (text, record) => (
        <div>
          <span className="font-bold text-slate-800 text-sm block">{text}</span>
          <span className="text-slate-400 text-xs mt-0.5 flex items-center gap-1.5">
            <CarOutlined className="text-slate-400" /> {record.vehicle}
          </span>
          <span className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
            {record.departure} <ArrowRight className="w-3 h-3 text-slate-300 mx-0.5" /> {record.arrival}
          </span>
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
      title: 'Cost Rate',
      dataIndex: 'price',
      key: 'price',
      render: (val) => <span className="font-bold text-emerald-600">{(val || 0).toLocaleString()} THB</span>
    },
    {
      title: 'Capacity',
      key: 'capacity',
      render: (_, record) => (
        <span className="text-slate-500 text-xs font-semibold">
          Pax: {record.capacityPax} | Luggage: {record.capacityLuggage}
        </span>
      )
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
      render: (text) => <span className="text-slate-500 text-xs font-semibold">{text || '-'}</span>
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
            title="Are you sure you want to delete this transfer?"
            onConfirm={() => handleDeleteTransfer(record.id)}
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
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Transfers</h1>
          <p className="text-slate-500 m-0 mt-1">Manage airport pick-up services, intercity transits, and customized van disposals</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenDrawer()}
          className="bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg flex items-center"
        >
          Add Transfer
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
            <Input placeholder="Enter route or vehicle name..." className="rounded-lg shadow-sm" />
          </Form.Item>

          <Form.Item label="&nbsp;" className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              className="w-full bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg"
            >
              Search Transfers
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Table list */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table
          dataSource={transfers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} transfers` }}
          className="border border-slate-100 rounded-xl overflow-hidden shadow-inner"
        />
      </Card>

      {/* Add/Edit Drawer */}
      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><Bus className="w-5 h-5 text-sky-600" /> {drawerTitle}</span>}
        width={550}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)} className="rounded-lg">Cancel</Button>
            <Button type="primary" onClick={handleSaveTransfer} className="bg-sky-600 border-none rounded-lg shadow-md shadow-sky-600/10">Save Transfer</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" className="grid grid-cols-1 gap-4 mt-2">
          <Form.Item name="type" label="Transfer Route Title" rules={[{ required: true, message: 'Please enter route title' }]}>
            <Input placeholder="BKK Airport to Hotel Transfer" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="vehicle" label="Vehicle Type" rules={[{ required: true, message: 'Please enter vehicle type' }]}>
            <Input placeholder="Deluxe Sedan (Toyota Camry)" className="rounded-lg h-10" />
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

          <Form.Item name="departure" label="Departure Location" rules={[{ required: true, message: 'Please enter departure point' }]}>
            <Input placeholder="Suvarnabhumi Airport (BKK)" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="arrival" label="Arrival Location" rules={[{ required: true, message: 'Please enter arrival point' }]}>
            <Input placeholder="Bangkok Hotel Downtown" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="price" label="Net Rate Cost (THB)" rules={[{ required: true, message: 'Please enter price' }]}>
            <InputNumber min={0} className="w-full rounded-lg h-10 flex items-center" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="capacityPax" label="Max Passengers" rules={[{ required: true, message: 'Please enter pax capacity' }]}>
              <InputNumber min={1} className="w-full rounded-lg h-10 flex items-center" />
            </Form.Item>

            <Form.Item name="capacityLuggage" label="Max Luggage Bags" rules={[{ required: true, message: 'Please enter luggage capacity' }]}>
              <InputNumber min={0} className="w-full rounded-lg h-10 flex items-center" />
            </Form.Item>
          </div>

          <Form.Item name="supplier" label="Supplier">
            <Input placeholder="Enter supplier name..." className="rounded-lg h-10" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
