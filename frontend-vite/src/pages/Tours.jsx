import React, { useState, useEffect } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Modal, Drawer, Tabs, message, Popconfirm, InputNumber, Checkbox } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined, DollarOutlined, CalendarOutlined, CarOutlined } from '@ant-design/icons';
import { Map, MapPin, Tag as TagIcon, Compass, Users } from 'lucide-react';
import api from '../services/api.js';

const { TabPane } = Tabs;

export default function Tours() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchForm] = Form.useForm();
  
  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Add Tour');
  const [currentTour, setCurrentTour] = useState(null);
  const [form] = Form.useForm();

  // Child lists
  const [pricingTiers, setPricingTiers] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);

  // Mock Countries & Cities
  const countries = ['Thailand', 'Vietnam', 'Singapore'];
  const cities = {
    Thailand: ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Krabi'],
    Vietnam: ['Hanoi', 'Ho Chi Minh', 'Da Nang'],
    Singapore: ['Singapore City']
  };
  const [selectedCountry, setSelectedCountry] = useState(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const mockTours = [
    {
      id: 1,
      name: 'Grand Palace & Emerald Buddha Tour',
      code: 'BKK-T001',
      city: 'Bangkok',
      country: 'Thailand',
      duration: '1 Day',
      category: 'Standard',
      supplier: 'Bangkok Sightseeing Ltd.',
      basePrice: 1500,
      description: 'Visit the historic Grand Palace, home of the kings of Siam, and the Temple of the Emerald Buddha.',
      operatingDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
      pricingTiers: [
        { key: 1, minPax: 1, maxPax: 2, pricePerPax: 1800, childPrice: 1200 },
        { key: 2, minPax: 3, maxPax: 5, pricePerPax: 1500, childPrice: 1000 },
        { key: 3, minPax: 6, maxPax: 10, pricePerPax: 1200, childPrice: 800 }
      ]
    },
    {
      id: 2,
      name: 'Phi Phi Island Day Trip by Speedboat',
      code: 'HKT-T002',
      city: 'Phuket',
      country: 'Thailand',
      duration: '1 Day',
      category: 'Deluxe',
      supplier: 'Phuket Marine Tours',
      basePrice: 2800,
      description: 'Cruise to Phi Phi Don and Phi Phi Leh. Enjoy snorkeling at Maya Bay and lunch at the beach.',
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      pricingTiers: [
        { key: 1, minPax: 1, maxPax: 4, pricePerPax: 3000, childPrice: 2200 },
        { key: 2, minPax: 5, maxPax: 10, pricePerPax: 2800, childPrice: 2000 }
      ]
    }
  ];

  const fetchTours = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tours');
      if (response.data && response.data.length > 0) {
        setTours(response.data);
      } else {
        setTours(mockTours);
      }
    } catch (err) {
      console.warn('API error, using mock data:', err);
      setTours(mockTours);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  const handleSearch = (values) => {
    setLoading(true);
    setTimeout(() => {
      let filtered = [...mockTours];
      if (values.country) {
        filtered = filtered.filter(t => t.country === values.country);
      }
      if (values.city) {
        filtered = filtered.filter(t => t.city === values.city);
      }
      if (values.keyword) {
        const kw = values.keyword.toLowerCase();
        filtered = filtered.filter(t => t.name.toLowerCase().includes(kw) || t.code.toLowerCase().includes(kw));
      }
      setTours(filtered);
      setLoading(false);
    }, 400);
  };

  const handleOpenDrawer = (record = null) => {
    if (record) {
      setDrawerTitle('Edit Tour');
      setCurrentTour(record);
      form.setFieldsValue({
        name: record.name,
        code: record.code,
        country: record.country,
        city: record.city,
        duration: record.duration,
        category: record.category,
        supplier: record.supplier,
        basePrice: record.basePrice,
        description: record.description,
      });
      setSelectedCountry(record.country);
      setSelectedDays(record.operatingDays || []);
      setPricingTiers(record.pricingTiers || []);
    } else {
      setDrawerTitle('Add Tour');
      setCurrentTour(null);
      form.resetFields();
      setSelectedCountry(null);
      setSelectedDays(daysOfWeek); // default all days
      setPricingTiers([]);
    }
    setDrawerVisible(true);
  };

  const handleSaveTour = async () => {
    try {
      const values = await form.validateFields();
      const tourPayload = {
        ...values,
        operatingDays: selectedDays,
        pricingTiers,
      };

      if (currentTour) {
        message.loading({ content: 'Saving...', key: 'toursave' });
        try {
          await api.put(`/tours/${currentTour.id}`, tourPayload);
        } catch (e) {}
        
        setTours(prev => prev.map(t => t.id === currentTour.id ? { ...t, ...tourPayload } : t));
        message.success({ content: 'Tour updated successfully', key: 'toursave' });
      } else {
        message.loading({ content: 'Creating...', key: 'toursave' });
        let newId = Date.now();
        try {
          const res = await api.post('/tours', tourPayload);
          if (res.data && res.data.id) newId = res.data.id;
        } catch (e) {}

        const newTour = { id: newId, ...tourPayload };
        setTours(prev => [newTour, ...prev]);
        message.success({ content: 'Tour added successfully', key: 'toursave' });
      }

      setDrawerVisible(false);
    } catch (err) {
      message.error('Please fix form validation errors.');
    }
  };

  const handleDeleteTour = async (id) => {
    try {
      await api.delete(`/tours/${id}`);
    } catch (e) {}
    setTours(prev => prev.filter(t => t.id !== id));
    message.success('Tour deleted successfully');
  };

  const addTierRow = () => {
    setPricingTiers(prev => [...prev, { key: Date.now(), minPax: 1, maxPax: 2, pricePerPax: 0, childPrice: 0 }]);
  };
  const updateTierRow = (key, field, val) => {
    setPricingTiers(prev => prev.map(t => t.key === key ? { ...t, [field]: val } : t));
  };
  const deleteTierRow = (key) => {
    setPricingTiers(prev => prev.filter(t => t.key !== key));
  };

  const columns = [
    {
      title: 'Tour Details',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <span className="font-bold text-slate-800 text-sm block">{text}</span>
          <span className="text-slate-400 text-xs flex items-center gap-2 mt-0.5">
            <Tag color="cyan">{record.code}</Tag>
            <Compass className="w-3 h-3 text-slate-400" /> {record.duration} | {record.category}
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
      title: 'Base Price',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (val) => <span className="font-bold text-emerald-600">{(val || 0).toLocaleString()} THB</span>
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
            title="Are you sure you want to delete this tour?"
            onConfirm={() => handleDeleteTour(record.id)}
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
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Tours</h1>
          <p className="text-slate-500 m-0 mt-1">Manage single-day and multi-day tour programs and volume pricing packages</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenDrawer()}
          className="bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg flex items-center"
        >
          Add Tour
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
            <Input placeholder="Enter tour name or code..." className="rounded-lg shadow-sm" />
          </Form.Item>

          <Form.Item label="&nbsp;" className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              className="w-full bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg"
            >
              Search Tours
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Table list */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table
          dataSource={tours}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} tours` }}
          className="border border-slate-100 rounded-xl overflow-hidden shadow-inner"
        />
      </Card>

      {/* Add/Edit Drawer */}
      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><Map className="w-5 h-5 text-sky-600" /> {drawerTitle}</span>}
        width={850}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)} className="rounded-lg">Cancel</Button>
            <Button type="primary" onClick={handleSaveTour} className="bg-sky-600 border-none rounded-lg shadow-md shadow-sky-600/10">Save Tour</Button>
          </Space>
        }
        bodyStyle={{ paddingBottom: 80 }}
      >
        <Tabs defaultActiveKey="1">
          <TabPane tab={<span className="flex items-center gap-2"><InfoCircleOutlined />Basic Details</span>} key="1">
            <Form form={form} layout="vertical" className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <Form.Item name="name" label="Tour Name" rules={[{ required: true, message: 'Please enter tour name' }]} className="col-span-2">
                <Input placeholder="Grand Palace Tour" className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="code" label="Tour Code" rules={[{ required: true, message: 'Please enter tour code' }]}>
                <Input placeholder="BKK-T001" className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="duration" label="Duration" rules={[{ required: true, message: 'Please enter duration' }]}>
                <Select placeholder="Select duration" className="rounded-lg h-10">
                  <Select.Option value="Half Day">Half Day</Select.Option>
                  <Select.Option value="1 Day">1 Day</Select.Option>
                  <Select.Option value="2 Days 1 Night">2 Days 1 Night</Select.Option>
                  <Select.Option value="3 Days 2 Nights">3 Days 2 Nights</Select.Option>
                </Select>
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
                  <Select.Option value="Standard">Standard</Select.Option>
                  <Select.Option value="Deluxe">Deluxe</Select.Option>
                  <Select.Option value="VIP">VIP / Premium</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="basePrice" label="Base Cost Rate (THB)" rules={[{ required: true, message: 'Please enter base price' }]}>
                <InputNumber min={0} className="w-full rounded-lg h-10 flex items-center" />
              </Form.Item>

              <Form.Item name="supplier" label="Supplier" className="col-span-2">
                <Input placeholder="Enter supplier name..." className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="description" label="Tour Description" className="col-span-2">
                <Input.TextArea placeholder="Itinerary schedule and package description..." rows={4} className="rounded-lg" />
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab={<span className="flex items-center gap-2"><CalendarOutlined />Operation Days</span>} key="2">
            <div className="py-4">
              <p className="text-slate-500 mb-4 text-sm">Select the days of the week when this tour is operated:</p>
              <Checkbox.Group
                options={daysOfWeek}
                value={selectedDays}
                onChange={setSelectedDays}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4"
              />
            </div>
          </TabPane>

          <TabPane tab={<span className="flex items-center gap-2"><DollarOutlined />Group Pricing</span>} key="3">
            <div className="flex justify-between items-center mb-4 mt-2">
              <span className="text-slate-500 text-xs">Configure tiered pricing per pax according to the size of the group</span>
              <Button type="dashed" onClick={addTierRow} icon={<PlusOutlined />} className="rounded-lg">Add Tier</Button>
            </div>

            <Table
              dataSource={pricingTiers}
              pagination={false}
              className="border border-slate-100 rounded-lg overflow-hidden"
              columns={[
                {
                  title: 'Min Pax',
                  dataIndex: 'minPax',
                  render: (val, record) => <InputNumber min={1} value={val} onChange={(val) => updateTierRow(record.key, 'minPax', val)} className="w-full rounded-lg" />
                },
                {
                  title: 'Max Pax',
                  dataIndex: 'maxPax',
                  render: (val, record) => <InputNumber min={1} value={val} onChange={(val) => updateTierRow(record.key, 'maxPax', val)} className="w-full rounded-lg" />
                },
                {
                  title: 'Cost per Adult (THB)',
                  dataIndex: 'pricePerPax',
                  render: (val, record) => <InputNumber min={0} value={val} onChange={(val) => updateTierRow(record.key, 'pricePerPax', val)} className="w-full rounded-lg" />
                },
                {
                  title: 'Cost per Child (THB)',
                  dataIndex: 'childPrice',
                  render: (val, record) => <InputNumber min={0} value={val} onChange={(val) => updateTierRow(record.key, 'childPrice', val)} className="w-full rounded-lg" />
                },
                {
                  title: 'Delete',
                  key: 'delete',
                  align: 'center',
                  width: 80,
                  render: (_, record) => <Button danger type="text" icon={<DeleteOutlined />} onClick={() => deleteTierRow(record.key)} />
                }
              ]}
            />
          </TabPane>
        </Tabs>
      </Drawer>
    </div>
  );
}
