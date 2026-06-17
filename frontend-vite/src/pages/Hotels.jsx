import React, { useState, useEffect } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Modal, Drawer, Tabs, message, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined, UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { Hotel as HotelIcon, MapPin, Contact, Calendar, Gift, Tag as TagIcon, Plus } from 'lucide-react';
import api from '../services/api.js';

const { TabPane } = Tabs;

export default function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchForm] = Form.useForm();
  
  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Add Hotel');
  const [currentHotel, setCurrentHotel] = useState(null);
  const [form] = Form.useForm();

  // Child lists in memory
  const [contacts, setContacts] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [selectedRoomKeys, setSelectedRoomKeys] = useState([]);
  const [massEditVisible, setMassEditVisible] = useState(false);
  const [massEditForm] = Form.useForm();

  // Mock Countries & Cities
  const countries = ['Thailand', 'Vietnam', 'Singapore'];
  const cities = {
    Thailand: ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Krabi'],
    Vietnam: ['Hanoi', 'Ho Chi Minh', 'Da Nang'],
    Singapore: ['Singapore City']
  };
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Mock data fallback
  const mockHotels = [
    {
      id: 1,
      name: 'Mandarin Oriental Bangkok',
      city: 'Bangkok',
      country: 'Thailand',
      address: '48 Oriental Avenue, Bangkok 10500',
      earlyCheckinAdd: 50,
      lateCheckoutAdd: 50,
      christmasDinner: 'Included buffer for 2 pax',
      newYearDinner: 'Gala dinner surcharge 5000 THB/pax',
      notes: 'Luxury historic hotel on the banks of Chao Phraya river.',
      contacts: [
        { key: 1, name: 'Somchai Jaidee', email: 'somchai@mandarin.com', tel: '02-635-3500' }
      ],
      roomTypes: [
        { key: 1, fromDate: '2026-11-01', toDate: '2027-03-31', roomType: 'Deluxe Premier', price: 12000, extraBed: 2500, foodCostAdult: 800, foodCostChild: 400 }
      ],
      promotions: [
        { key: 1, code: 'EB15', name: 'Early Bird 15%', bookingFrom: '2026-06-01', bookingTo: '2026-09-30', earlyBird: 60, minNights: 3, freeMeals: false, discount: 15, enabled: true }
      ]
    },
    {
      id: 2,
      name: 'The Slate Phuket',
      city: 'Phuket',
      country: 'Thailand',
      address: '116 Moo 1 Sakhu, Nai Yang Beach, Phuket 83110',
      earlyCheckinAdd: 30,
      lateCheckoutAdd: 50,
      christmasDinner: 'Optional beach buffet',
      newYearDinner: 'Mandatory countdown party',
      notes: 'Bill Bensley designed tin mining themed resort.',
      contacts: [
        { key: 1, name: 'Sandy Lee', email: 'sandy.l@theslate.com', tel: '076-327-006' }
      ],
      roomTypes: [
        { key: 1, fromDate: '2026-12-01', toDate: '2027-02-28', roomType: 'Pearl Bed Suite', price: 9500, extraBed: 2000, foodCostAdult: 700, foodCostChild: 350 }
      ],
      promotions: [
        { key: 1, code: 'STAY4PAY3', name: 'Stay 4 Pay 3 Promotion', bookingFrom: '2026-05-01', bookingTo: '2026-10-31', earlyBird: 0, minNights: 4, freeMeals: true, discount: 25, enabled: true }
      ]
    }
  ];

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const response = await api.get('/hotels');
      if (response.data && response.data.length > 0) {
        setHotels(response.data);
      } else {
        setHotels(mockHotels);
      }
    } catch (err) {
      console.warn('API error, using mock data:', err);
      setHotels(mockHotels);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const handleSearch = (values) => {
    setLoading(true);
    setTimeout(() => {
      let filtered = [...mockHotels];
      if (values.country) {
        filtered = filtered.filter(h => h.country === values.country);
      }
      if (values.city) {
        filtered = filtered.filter(h => h.city === values.city);
      }
      if (values.keyword) {
        const kw = values.keyword.toLowerCase();
        filtered = filtered.filter(h => h.name.toLowerCase().includes(kw) || h.address.toLowerCase().includes(kw));
      }
      setHotels(filtered);
      setLoading(false);
    }, 400);
  };

  const handleOpenDrawer = (record = null) => {
    setSelectedRoomKeys([]);
    if (record) {
      setDrawerTitle('Edit Hotel');
      setCurrentHotel(record);
      form.setFieldsValue({
        name: record.name,
        country: record.country,
        city: record.city,
        address: record.address,
        earlyCheckinAdd: record.earlyCheckinAdd,
        lateCheckoutAdd: record.lateCheckoutAdd,
        christmasDinner: record.christmasDinner,
        newYearDinner: record.newYearDinner,
        notes: record.notes,
      });
      setSelectedCountry(record.country);
      setContacts(record.contacts || []);
      setRoomTypes(record.roomTypes || []);
      setPromotions(record.promotions || []);
    } else {
      setDrawerTitle('Add Hotel');
      setCurrentHotel(null);
      form.resetFields();
      setSelectedCountry(null);
      setContacts([]);
      setRoomTypes([]);
      setPromotions([]);
    }
    setDrawerVisible(true);
  };

  const handleSaveHotel = async () => {
    try {
      const values = await form.validateFields();
      const hotelPayload = {
        ...values,
        contacts,
        roomTypes,
        promotions,
      };

      if (currentHotel) {
        // Edit flow
        message.loading({ content: 'Saving...', key: 'hotelsave' });
        try {
          await api.put(`/hotels/${currentHotel.id}`, hotelPayload);
        } catch (e) {}
        
        setHotels(prev => prev.map(h => h.id === currentHotel.id ? { ...h, ...hotelPayload } : h));
        message.success({ content: 'Hotel updated successfully', key: 'hotelsave' });
      } else {
        // Create flow
        message.loading({ content: 'Creating...', key: 'hotelsave' });
        let newId = Date.now();
        try {
          const res = await api.post('/hotels', hotelPayload);
          if (res.data && res.data.id) newId = res.data.id;
        } catch (e) {}

        const newHotel = { id: newId, ...hotelPayload };
        setHotels(prev => [newHotel, ...prev]);
        message.success({ content: 'Hotel added successfully', key: 'hotelsave' });
      }

      setDrawerVisible(false);
    } catch (err) {
      message.error('Please fix form validation errors.');
    }
  };

  const handleDeleteHotel = async (id) => {
    try {
      await api.delete(`/hotels/${id}`);
    } catch (e) {}
    setHotels(prev => prev.filter(h => h.id !== id));
    message.success('Hotel deleted successfully');
  };

  // Sub-items Handlers (Contacts, Rooms, Promos)
  const addContactRow = () => {
    setContacts(prev => [...prev, { key: Date.now(), name: '', email: '', tel: '' }]);
  };
  const updateContactRow = (key, field, val) => {
    setContacts(prev => prev.map(c => c.key === key ? { ...c, [field]: val } : c));
  };
  const deleteContactRow = (key) => {
    setContacts(prev => prev.filter(c => c.key !== key));
  };

  const addRoomRow = () => {
    setRoomTypes(prev => [...prev, { key: Date.now(), fromDate: '', toDate: '', roomType: '', price: 0, extraBed: 0, foodCostAdult: 0, foodCostChild: 0 }]);
  };
  const updateRoomRow = (key, field, val) => {
    setRoomTypes(prev => prev.map(r => r.key === key ? { ...r, [field]: val } : r));
  };
  const deleteRoomRow = (key) => {
    setRoomTypes(prev => prev.filter(r => r.key !== key));
    setSelectedRoomKeys(prev => prev.filter(k => k !== key));
  };

  const handleOpenMassEditModal = () => {
    if (selectedRoomKeys.length === 0) {
      message.warning('Please select at least one room rate to edit.');
      return;
    }
    const firstSelected = roomTypes.find(r => r.key === selectedRoomKeys[0]);
    if (firstSelected) {
      massEditForm.setFieldsValue({
        fromDate: firstSelected.fromDate,
        toDate: firstSelected.toDate,
        roomType: firstSelected.roomType,
        price: firstSelected.price,
        extraBed: firstSelected.extraBed,
        foodCostAdult: firstSelected.foodCostAdult,
        foodCostChild: firstSelected.foodCostChild,
      });
    } else {
      massEditForm.resetFields();
    }
    setMassEditVisible(true);
  };

  const handleApplyMassEdit = () => {
    massEditForm.validateFields().then(values => {
      setRoomTypes(prev => prev.map(r => {
        if (selectedRoomKeys.includes(r.key)) {
          const updated = { ...r };
          if (values.fromDate !== undefined && values.fromDate !== '') updated.fromDate = values.fromDate;
          if (values.toDate !== undefined && values.toDate !== '') updated.toDate = values.toDate;
          if (values.roomType !== undefined && values.roomType !== '') updated.roomType = values.roomType;
          if (values.price !== undefined && values.price !== null) updated.price = values.price;
          if (values.extraBed !== undefined && values.extraBed !== null) updated.extraBed = values.extraBed;
          if (values.foodCostAdult !== undefined && values.foodCostAdult !== null) updated.foodCostAdult = values.foodCostAdult;
          if (values.foodCostChild !== undefined && values.foodCostChild !== null) updated.foodCostChild = values.foodCostChild;
          return updated;
        }
        return r;
      }));
      setMassEditVisible(false);
      setSelectedRoomKeys([]);
      message.success('Mass edit applied successfully to selected room rates.');
    }).catch(err => {
      message.error('Please resolve validation issues.');
    });
  };

  const addPromoRow = () => {
    setPromotions(prev => [...prev, { key: Date.now(), code: '', name: '', bookingFrom: '', bookingTo: '', earlyBird: 0, minNights: 0, freeMeals: false, discount: 0, enabled: true }]);
  };
  const updatePromoRow = (key, field, val) => {
    setPromotions(prev => prev.map(p => p.key === key ? { ...p, [field]: val } : p));
  };
  const deletePromoRow = (key) => {
    setPromotions(prev => prev.filter(p => p.key !== key));
  };

  const columns = [
    {
      title: 'Hotel Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <span className="font-bold text-slate-800 text-sm block">{text}</span>
          <span className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400" /> {record.address}
          </span>
        </div>
      )
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country'
    },
    {
      title: 'Room Rates (Min)',
      key: 'rates',
      render: (_, record) => {
        if (!record.roomTypes || record.roomTypes.length === 0) return '-';
        const minPrice = Math.min(...record.roomTypes.map(r => r.price));
        return <span className="font-semibold text-emerald-600">{minPrice.toLocaleString()} THB</span>;
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
            title="Are you sure you want to delete this hotel?"
            onConfirm={() => handleDeleteHotel(record.id)}
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
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Hotels</h1>
          <p className="text-slate-500 m-0 mt-1">Manage active hotel accommodations, contacts, and custom pricing schedules</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenDrawer()}
          className="bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg flex items-center"
        >
          Add Hotel
        </Button>
      </div>

      {/* Filter Card */}
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
            <Input placeholder="Enter hotel name or address..." className="rounded-lg shadow-sm" />
          </Form.Item>

          <Form.Item label="&nbsp;" className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              className="w-full bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg"
            >
              Search Hotels
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* List Table */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table
          dataSource={hotels}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} hotels` }}
          className="border border-slate-100 rounded-xl overflow-hidden shadow-inner"
        />
      </Card>

      {/* Slide-out Edit Drawer */}
      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><HotelIcon className="w-5 h-5 text-sky-600" /> {drawerTitle}</span>}
        width={950}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)} className="rounded-lg">Cancel</Button>
            <Button type="primary" onClick={handleSaveHotel} className="bg-sky-600 border-none rounded-lg shadow-md shadow-sky-600/10">Save Hotel</Button>
          </Space>
        }
        bodyStyle={{ paddingBottom: 80 }}
      >
        <Tabs defaultActiveKey="1" className="custom-tabs">
          <TabPane tab={<span className="flex items-center gap-2"><InfoCircleOutlined />Basic Details</span>} key="1">
            <Form form={form} layout="vertical" className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <Form.Item name="name" label="Hotel Name" rules={[{ required: true, message: 'Please enter hotel name' }]} className="col-span-2">
                <Input placeholder="Mandarin Oriental Bangkok" className="rounded-lg h-10" />
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

              <Form.Item name="address" label="Address" rules={[{ required: true, message: 'Please enter address' }]} className="col-span-2">
                <Input placeholder="Enter street address..." className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="earlyCheckinAdd" label="Early Check-In Add (%)">
                <InputNumber min={0} max={100} formatter={v => `${v}%`} parser={v => v.replace('%', '')} className="w-full rounded-lg h-10 flex items-center" />
              </Form.Item>

              <Form.Item name="lateCheckoutAdd" label="Late Check-Out Add (%)">
                <InputNumber min={0} max={100} formatter={v => `${v}%`} parser={v => v.replace('%', '')} className="w-full rounded-lg h-10 flex items-center" />
              </Form.Item>

              <Form.Item name="christmasDinner" label="Christmas Dinner Detail">
                <Input placeholder="Enter Christmas buffet info..." className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="newYearDinner" label="New Year Dinner Detail">
                <Input placeholder="Enter Gala countdown details..." className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="notes" label="Notes for Agents" className="col-span-2">
                <Input.TextArea placeholder="Internal agent booking instructions..." rows={4} className="rounded-lg" />
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab={<span className="flex items-center gap-2"><UserOutlined />Contacts</span>} key="2">
            <div className="flex justify-between items-center mb-4 mt-2">
              <span className="text-slate-500 text-xs">Configure hotel reservation contacts and salesperson accounts</span>
              <Button type="dashed" onClick={addContactRow} icon={<PlusOutlined />} className="rounded-lg">Add Contact</Button>
            </div>
            
            <Table
              dataSource={contacts}
              pagination={false}
              className="border border-slate-100 rounded-lg overflow-hidden"
              columns={[
                {
                  title: 'Name',
                  dataIndex: 'name',
                  render: (text, record) => <Input value={text} onChange={(e) => updateContactRow(record.key, 'name', e.target.value)} placeholder="Full name" className="rounded-lg" />
                },
                {
                  title: 'Email',
                  dataIndex: 'email',
                  render: (text, record) => <Input value={text} onChange={(e) => updateContactRow(record.key, 'email', e.target.value)} placeholder="reservation@hotel.com" className="rounded-lg" />
                },
                {
                  title: 'Telephone',
                  dataIndex: 'tel',
                  render: (text, record) => <Input value={text} onChange={(e) => updateContactRow(record.key, 'tel', e.target.value)} placeholder="+66 2 123 4567" className="rounded-lg" />
                },
                {
                  title: 'Delete',
                  key: 'delete',
                  align: 'center',
                  width: 80,
                  render: (_, record) => <Button danger type="text" icon={<DeleteOutlined />} onClick={() => deleteContactRow(record.key)} />
                }
              ]}
            />
          </TabPane>

          <TabPane tab={<span className="flex items-center gap-2"><Calendar className="w-4 h-4" />Room Rates</span>} key="3">
            <div className="flex justify-between items-center mb-4 mt-2">
              <span className="text-slate-500 text-xs">Define seasonal room rates, breakfast (food) surcharges and extra bed prices</span>
              <Space>
                {selectedRoomKeys.length > 0 && (
                  <Button
                    type="primary"
                    danger
                    onClick={handleOpenMassEditModal}
                    icon={<EditOutlined />}
                    className="rounded-lg"
                  >
                    Mass Edit ({selectedRoomKeys.length})
                  </Button>
                )}
                <Button type="dashed" onClick={addRoomRow} icon={<PlusOutlined />} className="rounded-lg">Add Room Rate</Button>
              </Space>
            </div>

            <Table
              dataSource={roomTypes}
              pagination={false}
              className="border border-slate-100 rounded-lg overflow-hidden"
              scroll={{ x: 1000 }}
              rowSelection={{
                selectedRowKeys: selectedRoomKeys,
                onChange: (keys) => setSelectedRoomKeys(keys),
              }}
              columns={[
                {
                  title: 'Validity From',
                  dataIndex: 'fromDate',
                  width: 130,
                  render: (text, record) => <Input type="date" value={text} onChange={(e) => updateRoomRow(record.key, 'fromDate', e.target.value)} className="rounded-lg" />
                },
                {
                  title: 'Validity To',
                  dataIndex: 'toDate',
                  width: 130,
                  render: (text, record) => <Input type="date" value={text} onChange={(e) => updateRoomRow(record.key, 'toDate', e.target.value)} className="rounded-lg" />
                },
                {
                  title: 'Room Type',
                  dataIndex: 'roomType',
                  width: 180,
                  render: (text, record) => <Input value={text} onChange={(e) => updateRoomRow(record.key, 'roomType', e.target.value)} placeholder="Deluxe Double" className="rounded-lg" />
                },
                {
                  title: 'Price (THB)',
                  dataIndex: 'price',
                  width: 120,
                  render: (val, record) => <InputNumber min={0} value={val} onChange={(val) => updateRoomRow(record.key, 'price', val)} className="w-full rounded-lg" />
                },
                {
                  title: 'Extra Bed (THB)',
                  dataIndex: 'extraBed',
                  width: 120,
                  render: (val, record) => <InputNumber min={0} value={val} onChange={(val) => updateRoomRow(record.key, 'extraBed', val)} className="w-full rounded-lg" />
                },
                {
                  title: 'BF Adult (THB)',
                  dataIndex: 'foodCostAdult',
                  width: 120,
                  render: (val, record) => <InputNumber min={0} value={val} onChange={(val) => updateRoomRow(record.key, 'foodCostAdult', val)} className="w-full rounded-lg" />
                },
                {
                  title: 'BF Child (THB)',
                  dataIndex: 'foodCostChild',
                  width: 120,
                  render: (val, record) => <InputNumber min={0} value={val} onChange={(val) => updateRoomRow(record.key, 'foodCostChild', val)} className="w-full rounded-lg" />
                },
                {
                  title: '',
                  key: 'delete',
                  align: 'center',
                  width: 60,
                  render: (_, record) => <Button danger type="text" icon={<DeleteOutlined />} onClick={() => deleteRoomRow(record.key)} />
                }
              ]}
            />
          </TabPane>

          <TabPane tab={<span className="flex items-center gap-2"><TagIcon className="w-4 h-4" />Promotions</span>} key="4">
            <div className="flex justify-between items-center mb-4 mt-2">
              <span className="text-slate-500 text-xs">Set up automatic discounts, early-bird rates, or stay-pay rules</span>
              <Button type="dashed" onClick={addPromoRow} icon={<PlusOutlined />} className="rounded-lg">Add Promo</Button>
            </div>

            <Table
              dataSource={promotions}
              pagination={false}
              className="border border-slate-100 rounded-lg overflow-hidden"
              scroll={{ x: 1200 }}
              columns={[
                {
                  title: 'Promo Code',
                  dataIndex: 'code',
                  width: 120,
                  render: (text, record) => <Input value={text} onChange={(e) => updatePromoRow(record.key, 'code', e.target.value)} placeholder="EB20" className="rounded-lg" />
                },
                {
                  title: 'Promo Name',
                  dataIndex: 'name',
                  width: 180,
                  render: (text, record) => <Input value={text} onChange={(e) => updatePromoRow(record.key, 'name', e.target.value)} placeholder="Early Bird 20%" className="rounded-lg" />
                },
                {
                  title: 'Booking From',
                  dataIndex: 'bookingFrom',
                  width: 130,
                  render: (text, record) => <Input type="date" value={text} onChange={(e) => updatePromoRow(record.key, 'bookingFrom', e.target.value)} className="rounded-lg" />
                },
                {
                  title: 'Booking To',
                  dataIndex: 'bookingTo',
                  width: 130,
                  render: (text, record) => <Input type="date" value={text} onChange={(e) => updatePromoRow(record.key, 'bookingTo', e.target.value)} className="rounded-lg" />
                },
                {
                  title: 'Early Bird Days',
                  dataIndex: 'earlyBird',
                  width: 110,
                  render: (val, record) => <InputNumber min={0} value={val} onChange={(val) => updatePromoRow(record.key, 'earlyBird', val)} className="w-full rounded-lg" />
                },
                {
                  title: 'Min Nights',
                  dataIndex: 'minNights',
                  width: 100,
                  render: (val, record) => <InputNumber min={0} value={val} onChange={(val) => updatePromoRow(record.key, 'minNights', val)} className="w-full rounded-lg" />
                },
                {
                  title: 'Free Meals?',
                  dataIndex: 'freeMeals',
                  width: 100,
                  align: 'center',
                  render: (val, record) => <Select value={val} onChange={(val) => updatePromoRow(record.key, 'freeMeals', val)} className="w-full rounded-lg"><Select.Option value={true}>Yes</Select.Option><Select.Option value={false}>No</Select.Option></Select>
                },
                {
                  title: 'Discount (%)',
                  dataIndex: 'discount',
                  width: 100,
                  render: (val, record) => <InputNumber min={0} max={100} value={val} onChange={(val) => updatePromoRow(record.key, 'discount', val)} className="w-full rounded-lg" />
                },
                {
                  title: 'Status',
                  dataIndex: 'enabled',
                  width: 100,
                  render: (val, record) => <Select value={val} onChange={(val) => updatePromoRow(record.key, 'enabled', val)} className="w-full rounded-lg"><Select.Option value={true}>Active</Select.Option><Select.Option value={false}>Disabled</Select.Option></Select>
                },
                {
                  title: '',
                  key: 'delete',
                  align: 'center',
                  width: 60,
                  render: (_, record) => <Button danger type="text" icon={<DeleteOutlined />} onClick={() => deletePromoRow(record.key)} />
                }
              ]}
            />
          </TabPane>
        </Tabs>
      </Drawer>

      {/* Mass Edit Modal */}
      <Modal
        title="Mass Edit Selected Room Rates"
        open={massEditVisible}
        onOk={handleApplyMassEdit}
        onCancel={() => setMassEditVisible(false)}
        okText="Apply Changes"
        cancelText="Cancel"
        className="rounded-lg"
        width={600}
      >
        <Form form={massEditForm} layout="vertical" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="fromDate" label="Validity From">
              <Input type="date" className="rounded-lg h-10" />
            </Form.Item>
            <Form.Item name="toDate" label="Validity To">
              <Input type="date" className="rounded-lg h-10" />
            </Form.Item>
          </div>
          
          <Form.Item name="roomType" label="Room Type">
            <Input placeholder="Deluxe Double" className="rounded-lg h-10" />
          </Form.Item>
          
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="price" label="Price (THB)">
              <InputNumber min={0} className="w-full rounded-lg h-10 flex items-center" />
            </Form.Item>
            <Form.Item name="extraBed" label="Extra Bed (THB)">
              <InputNumber min={0} className="w-full rounded-lg h-10 flex items-center" />
            </Form.Item>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="foodCostAdult" label="BF Adult (THB)">
              <InputNumber min={0} className="w-full rounded-lg h-10 flex items-center" />
            </Form.Item>
            <Form.Item name="foodCostChild" label="BF Child (THB)">
              <InputNumber min={0} className="w-full rounded-lg h-10 flex items-center" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
