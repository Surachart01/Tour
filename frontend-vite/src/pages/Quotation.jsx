import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Drawer, message, Popconfirm, InputNumber, Tabs, Divider, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined, CalculatorOutlined } from '@ant-design/icons';
import { BookOpen, User, PlusCircle, Trash, Hotel, Compass, Car, FileText } from 'lucide-react';
import api from '../services/api.js';

const { TabPane } = Tabs;

export default function Quotation() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([
    {
      id: 1,
      refNo: 'VT-2026-0001',
      title: 'Family Summer Trip in Bangkok & Phuket',
      agent: 'Vera Thailandia Online',
      clientName: 'Marco Rossi',
      paxCount: '4 Adults, 2 Children',
      totalCost: 85000,
      totalSelling: 102000,
      status: 'Pending'
    },
    {
      id: 2,
      refNo: 'VT-2026-0002',
      title: 'Bangkok Culture & Luxury Honeymoon',
      agent: 'B2B Travel Partner Europe',
      clientName: 'Jean Dupont',
      paxCount: '2 Adults',
      totalCost: 112000,
      totalSelling: 134400,
      status: 'Finalized'
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Create Quotation');
  const [currentQuotation, setCurrentQuotation] = useState(null);
  
  const [form] = Form.useForm();
  
  // Itinerary items builder state
  const [itineraryItems, setItineraryItems] = useState([]);

  // Mock inventories for builder drop-downs
  const mockHotels = [
    { name: 'Mandarin Oriental Bangkok', roomType: 'Deluxe Premier', cost: 12000 },
    { name: 'The Slate Phuket', roomType: 'Pearl Bed Suite', cost: 9500 }
  ];
  const mockExcursions = [
    { name: 'Thai Cooking Class & Market Tour', cost: 1500 },
    { name: 'Elephant Jungle Sanctuary Visit', cost: 2500 }
  ];
  const mockTransfers = [
    { name: 'BKK Airport to Bangkok Hotel', cost: 1200 },
    { name: 'Phuket Hotel to Pier Transfer', cost: 800 }
  ];

  const handleOpenDrawer = (record = null) => {
    if (record) {
      setDrawerTitle('Edit Quotation');
      setCurrentQuotation(record);
      form.setFieldsValue({
        title: record.title,
        agent: record.agent,
        clientName: record.clientName,
        clientEmail: record.clientEmail || 'client@travel.com',
        adults: record.adults || 2,
        children: record.children || 0,
      });
      // Load itinerary items (mocked)
      setItineraryItems(record.itineraryItems || [
        { key: 1, type: 'hotel', details: 'Mandarin Oriental Bangkok - Deluxe Premier', cost: 12000, qty: 3, markup: 15, selling: 13800 },
        { key: 2, type: 'excursion', details: 'Thai Cooking Class & Market Tour', cost: 1500, qty: 2, markup: 20, selling: 1800 }
      ]);
    } else {
      setDrawerTitle('Create Quotation');
      setCurrentQuotation(null);
      form.resetFields();
      setItineraryItems([]);
    }
    setDrawerVisible(true);
  };

  const handleAddItem = (type) => {
    let defaultItem = { key: Date.now(), type, details: '', cost: 0, qty: 1, markup: 15, selling: 0 };
    if (type === 'hotel') {
      defaultItem.details = `${mockHotels[0].name} (${mockHotels[0].roomType})`;
      defaultItem.cost = mockHotels[0].cost;
    } else if (type === 'excursion') {
      defaultItem.details = mockExcursions[0].name;
      defaultItem.cost = mockExcursions[0].cost;
    } else if (type === 'transfer') {
      defaultItem.details = mockTransfers[0].name;
      defaultItem.cost = mockTransfers[0].cost;
    }
    defaultItem.selling = Math.round(defaultItem.cost * (1 + defaultItem.markup / 100) * defaultItem.qty);
    setItineraryItems(prev => [...prev, defaultItem]);
  };

  const updateItineraryItem = (key, field, val) => {
    setItineraryItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: val };
      if (field === 'cost' || field === 'markup' || field === 'qty') {
        const cost = Number(updated.cost || 0);
        const markup = Number(updated.markup || 0);
        const qty = Number(updated.qty || 1);
        updated.selling = Math.round(cost * (1 + markup / 100) * qty);
      }
      return updated;
    }));
  };

  const deleteItineraryItem = (key) => {
    setItineraryItems(prev => prev.filter(item => item.key !== key));
  };

  const calculateTotals = () => {
    const totalCost = itineraryItems.reduce((acc, item) => acc + (Number(item.cost || 0) * Number(item.qty || 1)), 0);
    const totalSelling = itineraryItems.reduce((acc, item) => acc + Number(item.selling || 0), 0);
    const profit = totalSelling - totalCost;
    const margin = totalSelling > 0 ? ((profit / totalSelling) * 100).toFixed(1) : 0;
    return { totalCost, totalSelling, profit, margin };
  };

  const handleSaveQuotation = async () => {
    try {
      const values = await form.validateFields();
      const { totalCost, totalSelling } = calculateTotals();
      
      const payload = {
        ...values,
        refNo: currentQuotation?.refNo || `VT-${Date.now().toString().slice(-4)}`,
        paxCount: `${values.adults} Adults, ${values.children} Children`,
        totalCost,
        totalSelling,
        itineraryItems,
        status: currentQuotation?.status || 'Pending'
      };

      if (currentQuotation) {
        setQuotations(prev => prev.map(q => q.id === currentQuotation.id ? { ...q, ...payload } : q));
        message.success('Quotation updated successfully');
      } else {
        setQuotations(prev => [{ id: Date.now(), ...payload }, ...prev]);
        message.success('Quotation created successfully');
      }
      setDrawerVisible(false);
    } catch (e) {
      message.error('Validation failed');
    }
  };

  const handleDeleteQuotation = (id) => {
    setQuotations(prev => prev.filter(q => q.id !== id));
    message.success('Quotation removed');
  };

  const columns = [
    {
      title: 'Reference No.',
      dataIndex: 'refNo',
      key: 'refNo',
      render: (text) => <Tag color="blue" className="font-mono font-bold">{text}</Tag>
    },
    {
      title: 'Trip Details',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div>
          <span className="font-bold text-slate-800 text-sm block">{text}</span>
          <span className="text-slate-400 text-xs mt-0.5">Agent: {record.agent} | Client: {record.clientName}</span>
        </div>
      )
    },
    {
      title: 'Pax Group',
      dataIndex: 'paxCount',
      key: 'paxCount',
      render: (text) => <span className="text-xs text-slate-500 font-semibold">{text}</span>
    },
    {
      title: 'Financial Summary',
      key: 'financials',
      render: (_, record) => {
        const profit = record.totalSelling - record.totalCost;
        return (
          <Space direction="vertical" size={1} className="text-xs">
            <span>Selling: <strong className="text-emerald-600">{(record.totalSelling || 0).toLocaleString()} THB</strong></span>
            <span>Profit: <strong className="text-sky-600">{(profit || 0).toLocaleString()} THB</strong></span>
          </Space>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'gold';
        if (status === 'Finalized') color = 'green';
        if (status === 'Cancelled') color = 'red';
        return <Tag color={color} className="font-semibold uppercase">{status}</Tag>;
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
            title="Are you sure you want to delete this quote?"
            onConfirm={() => handleDeleteQuotation(record.id)}
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

  const { totalCost, totalSelling, profit, margin } = calculateTotals();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Quotation</h1>
          <p className="text-slate-500 m-0 mt-1">Configure client bookings, pricing markups, and construct day-by-day custom itinerary plans</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/quotation/add')}
          className="bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg flex items-center"
        >
          New Quotation
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table
          dataSource={quotations}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="border border-slate-100 rounded-xl overflow-hidden shadow-inner"
        />
      </Card>

      {/* Builder Slide-out Drawer */}
      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-sky-600" /> {drawerTitle}</span>}
        width={1000}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)} className="rounded-lg">Cancel</Button>
            <Button type="primary" onClick={handleSaveQuotation} className="bg-sky-600 border-none rounded-lg shadow-md shadow-sky-600/10">Save Quotation</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <Form.Item name="title" label="Trip Quotation Name" rules={[{ required: true, message: 'Please enter trip title' }]} className="col-span-2">
            <Input placeholder="Family Trip to Bangkok & Phuket" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="agent" label="Affiliated Agency Partner" rules={[{ required: true, message: 'Please select agency' }]}>
            <Select placeholder="Select agency">
              <Select.Option value="Vera Thailandia Online">Vera Thailandia Online</Select.Option>
              <Select.Option value="B2B Travel Partner Europe">B2B Travel Partner Europe</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="clientName" label="Primary Client Guest Name" rules={[{ required: true, message: 'Client name is required' }]}>
            <Input placeholder="Marco Rossi" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="clientEmail" label="Client Contact Email">
            <Input placeholder="client@gmail.com" className="rounded-lg h-10" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="adults" label="Adults pax count">
              <InputNumber min={1} className="w-full rounded-lg h-10 flex items-center" />
            </Form.Item>
            <Form.Item name="children" label="Children pax count">
              <InputNumber min={0} className="w-full rounded-lg h-10 flex items-center" />
            </Form.Item>
          </div>
        </Form>

        <Divider className="my-6 border-slate-100" />

        {/* Day-by-Day Itinerary Builder */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-slate-800 text-base m-0">Itinerary Component Planner</h3>
            <Space>
              <Button size="small" type="dashed" icon={<PlusCircle className="w-3.5 h-3.5 mr-1" />} onClick={() => handleAddItem('hotel')} className="rounded-lg flex items-center">Add Hotel</Button>
              <Button size="small" type="dashed" icon={<PlusCircle className="w-3.5 h-3.5 mr-1" />} onClick={() => handleAddItem('excursion')} className="rounded-lg flex items-center">Add Excursion</Button>
              <Button size="small" type="dashed" icon={<PlusCircle className="w-3.5 h-3.5 mr-1" />} onClick={() => handleAddItem('transfer')} className="rounded-lg flex items-center">Add Transfer</Button>
            </Space>
          </div>

          <Table
            dataSource={itineraryItems}
            pagination={false}
            className="border border-slate-100 rounded-xl overflow-hidden mb-6"
            columns={[
              {
                title: 'Service Class',
                dataIndex: 'type',
                width: 120,
                render: (type) => {
                  if (type === 'hotel') return <Tag color="blue" icon={<Hotel className="w-3 h-3 mr-1 inline" />}>Hotel</Tag>;
                  if (type === 'excursion') return <Tag color="green" icon={<Compass className="w-3 h-3 mr-1 inline" />}>Excursion</Tag>;
                  return <Tag color="cyan" icon={<Car className="w-3 h-3 mr-1 inline" />}>Transfer</Tag>;
                }
              },
              {
                title: 'Service Details',
                dataIndex: 'details',
                render: (val, record) => <Input value={val} onChange={(e) => updateItineraryItem(record.key, 'details', e.target.value)} placeholder="Service description..." className="rounded-lg" />
              },
              {
                title: 'Net Cost',
                dataIndex: 'cost',
                width: 120,
                render: (val, record) => <InputNumber min={0} value={val} onChange={(val) => updateItineraryItem(record.key, 'cost', val)} className="w-full rounded-lg" />
              },
              {
                title: 'Qty / Nights',
                dataIndex: 'qty',
                width: 100,
                render: (val, record) => <InputNumber min={1} value={val} onChange={(val) => updateItineraryItem(record.key, 'qty', val)} className="w-full rounded-lg" />
              },
              {
                title: 'Markup (%)',
                dataIndex: 'markup',
                width: 110,
                render: (val, record) => <InputNumber min={0} value={val} onChange={(val) => updateItineraryItem(record.key, 'markup', val)} className="w-full rounded-lg" />
              },
              {
                title: 'Selling Total',
                dataIndex: 'selling',
                width: 130,
                render: (val) => <span className="font-bold text-emerald-600 text-sm">{(val || 0).toLocaleString()} THB</span>
              },
              {
                title: '',
                key: 'delete',
                align: 'center',
                width: 60,
                render: (_, record) => <Button danger type="text" icon={<Trash className="w-4 h-4" />} onClick={() => deleteItineraryItem(record.key)} />
              }
            ]}
          />

          {/* Pricing Margin calculator box */}
          <Card className="bg-slate-50 border-none rounded-xl p-4">
            <h4 className="text-slate-800 font-bold text-sm mb-4 flex items-center gap-1.5"><CalculatorOutlined className="text-sky-600" /> Quotation Margin Summary</h4>
            <Row gutter={16}>
              <Col span={6}>
                <div className="text-xs text-slate-400 font-semibold mb-0.5">TOTAL NET COST</div>
                <div className="text-lg font-bold text-slate-700">{totalCost.toLocaleString()} THB</div>
              </Col>
              <Col span={6}>
                <div className="text-xs text-slate-400 font-semibold mb-0.5">TOTAL GROSS SELLING</div>
                <div className="text-lg font-bold text-emerald-600">{totalSelling.toLocaleString()} THB</div>
              </Col>
              <Col span={6}>
                <div className="text-xs text-slate-400 font-semibold mb-0.5">NET MARGIN PROFIT</div>
                <div className="text-lg font-bold text-sky-600">{profit.toLocaleString()} THB</div>
              </Col>
              <Col span={6}>
                <div className="text-xs text-slate-400 font-semibold mb-0.5">MARGIN RATIO (%)</div>
                <div className="text-lg font-bold text-purple-600">{margin}%</div>
              </Col>
            </Row>
          </Card>
        </div>
      </Drawer>
    </div>
  );
}
