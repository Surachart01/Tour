import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Drawer, Tabs, message, Popconfirm, InputNumber, Checkbox, DatePicker } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined, DollarOutlined, CalendarOutlined, CopyOutlined } from '@ant-design/icons';
import { Map, MapPin, Compass } from 'lucide-react';
import dayjs from 'dayjs';
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

  // Dynamic API data
  const [countries, setCountries] = useState([]); // [{code, name}]
  const [countryNames, setCountryNames] = useState([]); // string[]
  const [citiesByCountry, setCitiesByCountry] = useState({});
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Child lists
  const [pricingTiers, setPricingTiers] = useState([]);
  const [validDays, setValidDays] = useState([]);

  const dayOptions = [
    { label: 'Mon', value: 'mon' },
    { label: 'Tue', value: 'tue' },
    { label: 'Wed', value: 'wed' },
    { label: 'Thu', value: 'thu' },
    { label: 'Fri', value: 'fri' },
    { label: 'Sat', value: 'sat' },
    { label: 'Sun', value: 'sun' },
  ];

  // Load countries from API
  const fetchCountries = useCallback(async () => {
    try {
      const res = await api.get('/locations/countries');
      const data = res.data?.countries || (Array.isArray(res.data) ? res.data : []);
      setCountries(data);
      setCountryNames(data.map(c => c.name || c));
    } catch {
      const fallback = [
        { code: 'TH', name: 'Thailand' }, { code: 'VN', name: 'Vietnam' },
        { code: 'SG', name: 'Singapore' }, { code: 'MY', name: 'Malaysia' },
        { code: 'ID', name: 'Indonesia' }
      ];
      setCountries(fallback);
      setCountryNames(fallback.map(c => c.name));
    }
  }, []);

  // Load cities for a country from API (uses country code)
  const fetchCities = useCallback(async (countryName) => {
    if (!countryName) return;
    if (citiesByCountry[countryName]) return;
    const countryObj = countries.find(c => c.name === countryName);
    const code = countryObj?.code || countryName;
    try {
      const res = await api.get(`/locations/countries/${code}/cities`);
      const list = res.data?.cities || (Array.isArray(res.data) ? res.data : []);
      setCitiesByCountry(prev => ({ ...prev, [countryName]: list.map(c => c.city || c.name || c) }));
    } catch {
      const fallback = {
        Thailand: ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Krabi'],
        Vietnam: ['Hanoi', 'Ho Chi Minh', 'Da Nang'],
        Singapore: ['Singapore City']
      };
      setCitiesByCountry(prev => ({ ...prev, [countryName]: fallback[countryName] || [] }));
    }
  }, [citiesByCountry, countries]);

  const fetchTours = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tours');
      setTours(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.warn('API error:', err);
      setTours([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
    fetchCountries();
  }, []);

  useEffect(() => {
    if (selectedCountry) fetchCities(selectedCountry);
  }, [selectedCountry]);

  const handleSearch = async (values) => {
    setLoading(true);
    try {
      let params = {};
      if (values.keyword) params.keyword = values.keyword;
      const response = await api.get('/tours', { params });
      let results = Array.isArray(response.data) ? response.data : [];
      if (values.country) {
        results = results.filter(t => t.country === values.country);
      }
      if (values.city) {
        results = results.filter(t => t.city === values.city);
      }
      if (values.keyword) {
        const kw = values.keyword.toLowerCase();
        results = results.filter(t =>
          t.name?.toLowerCase().includes(kw) ||
          t.code?.toLowerCase().includes(kw)
        );
      }
      setTours(results);
    } catch {
      setTours([]);
    } finally {
      setLoading(false);
    }
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
        departures: record.departures,
        route: record.route,
        description: record.description,
        display_order: record.display_order || 0,
      });
      setSelectedCountry(record.country);
      // Parse valid_days from DB string
      let days = [];
      if (record.valid_days) {
        try {
          if (record.valid_days.trim().startsWith('{')) {
            const obj = JSON.parse(record.valid_days);
            if (obj.mon) days.push('mon');
            if (obj.tue) days.push('tue');
            if (obj.wed) days.push('wed');
            if (obj.thu) days.push('thu');
            if (obj.fri) days.push('fri');
            if (obj.sat) days.push('sat');
            if (obj.sun) days.push('sun');
          } else {
            days = record.valid_days.split(',').map(d => d.trim().toLowerCase());
          }
        } catch {
          days = [];
        }
      }
      setValidDays(days);
      // Parse pricing tiers from tour_pricing
      const tiers = (record.tour_pricing || []).map((p, i) => ({
        key: p.id || Date.now() + i,
        start_date: p.start_date,
        end_date: p.end_date,
        single_room_price: p.single_room_price ? parseFloat(p.single_room_price) : 0,
        double_room_price: p.double_room_price ? parseFloat(p.double_room_price) : 0,
        triple_room_price: p.triple_room_price ? parseFloat(p.triple_room_price) : 0,
        currency_id: p.currency_id,
      }));
      setPricingTiers(tiers);
    } else {
      setDrawerTitle('Add Tour');
      setCurrentTour(null);
      form.resetFields();
      setSelectedCountry(null);
      setValidDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']); // all days by default
      setPricingTiers([]);
    }
    setDrawerVisible(true);
  };

  const handleSaveTour = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name,
        code: values.code || null,
        category: values.category,
        description: values.description || null,
        duration: parseInt(values.duration) || 1,
        route: values.route || null,
        departures: values.departures || '',
        city: values.city || null,
        country: values.country || 'Thailand',
        valid_days: JSON.stringify({
          mon: validDays.includes('mon'),
          tue: validDays.includes('tue'),
          wed: validDays.includes('wed'),
          thu: validDays.includes('thu'),
          fri: validDays.includes('fri'),
          sat: validDays.includes('sat'),
          sun: validDays.includes('sun'),
        }),
        display_order: values.display_order || 0,
        pricing: pricingTiers.map(p => ({
          start_date: p.start_date,
          end_date: p.end_date,
          single_room_price: parseFloat(p.single_room_price) || 0,
          double_room_price: parseFloat(p.double_room_price) || 0,
          triple_room_price: parseFloat(p.triple_room_price) || 0,
          currency_id: p.currency_id || null,
        })),
      };

      if (currentTour) {
        message.loading({ content: 'Saving...', key: 'toursave' });
        await api.put(`/tours/${currentTour.id}`, payload);
        message.success({ content: 'Tour updated successfully', key: 'toursave' });
      } else {
        message.loading({ content: 'Creating...', key: 'toursave' });
        await api.post('/tours', payload);
        message.success({ content: 'Tour added successfully', key: 'toursave' });
      }
      setDrawerVisible(false);
      fetchTours();
    } catch (err) {
      if (err.errorFields) {
        message.error('Please fix form validation errors.');
      } else {
        message.error('Failed to save tour: ' + (err.response?.data || err.message));
      }
    }
  };

  const handleDeleteTour = async (id) => {
    try {
      await api.delete(`/tours/${id}`);
      message.success('Tour deleted successfully');
      fetchTours();
    } catch {
      message.error('Failed to delete tour');
    }
  };

  // Pricing tier handlers
  const addTierRow = () => {
    setPricingTiers(prev => [...prev, {
      key: Date.now(),
      start_date: dayjs().format('YYYY-MM-DD'),
      end_date: dayjs().add(1, 'year').format('YYYY-MM-DD'),
      single_room_price: 0,
      double_room_price: 0,
      triple_room_price: 0,
      currency_id: null
    }]);
  };
  const duplicateTierRow = (row) => {
    setPricingTiers(prev => [...prev, { ...row, key: Date.now() }]);
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
            {record.code && <Tag color="cyan">{record.code}</Tag>}
            <Compass className="w-3 h-3 text-slate-400" /> {record.duration} day{record.duration > 1 ? 's' : ''} | {record.category}
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
          <MapPin className="w-3.5 h-3.5 text-sky-600" /> {text || '-'}, {record.country}
        </span>
      )
    },
    {
      title: 'Departures',
      dataIndex: 'departures',
      key: 'departures',
      render: (text) => <span className="text-slate-500 text-xs">{text || '-'}</span>
    },
    {
      title: 'Valid Days',
      dataIndex: 'valid_days',
      key: 'valid_days',
      render: (text) => {
        if (!text) return <Tag color="green">All Days</Tag>;
        let days = [];
        try {
          if (text.trim().startsWith('{')) {
            const obj = JSON.parse(text);
            if (obj.mon) days.push('Mon');
            if (obj.tue) days.push('Tue');
            if (obj.wed) days.push('Wed');
            if (obj.thu) days.push('Thu');
            if (obj.fri) days.push('Fri');
            if (obj.sat) days.push('Sat');
            if (obj.sun) days.push('Sun');
          } else {
            const dayMap = { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat', 'sun': 'Sun', 'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu', 'fri': 'Fri', 'sat': 'Sat' };
            days = text.split(',').map(d => dayMap[d.trim().toLowerCase()] || d);
          }
        } catch {
          days = [];
        }
        if (days.length === 0) return <Tag color="red">None</Tag>;
        if (days.length === 7) return <Tag color="green">All Days</Tag>;
        return (
          <Space size={2} wrap>
            {days.map(d => <Tag key={d} color="blue" className="text-xs">{d}</Tag>)}
          </Space>
        );
      }
    },
    {
      title: 'Pricing',
      key: 'pricing_count',
      render: (_, record) => {
        const count = record.tour_pricing?.length || 0;
        return <Tag color={count > 0 ? 'green' : 'default'}>{count} tier{count !== 1 ? 's' : ''}</Tag>;
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
            title="Are you sure you want to delete this tour?"
            onConfirm={() => handleDeleteTour(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const pricingColumns = [
    {
      title: 'Date From',
      dataIndex: 'start_date',
      width: 160,
      render: (val, record) => (
        <DatePicker
          value={val ? dayjs(val) : null}
          onChange={(d) => updateTierRow(record.key, 'start_date', d ? d.format('YYYY-MM-DD') : null)}
          className="w-full rounded-lg"
          format="YYYY-MM-DD"
        />
      )
    },
    {
      title: 'Date To',
      dataIndex: 'end_date',
      width: 160,
      render: (val, record) => (
        <DatePicker
          value={val ? dayjs(val) : null}
          onChange={(d) => updateTierRow(record.key, 'end_date', d ? d.format('YYYY-MM-DD') : null)}
          className="w-full rounded-lg"
          format="YYYY-MM-DD"
        />
      )
    },
    {
      title: 'Single Room Price',
      dataIndex: 'single_room_price',
      width: 140,
      render: (val, record) => <InputNumber min={0} step={0.01} value={val} onChange={(v) => updateTierRow(record.key, 'single_room_price', v)} className="w-full rounded-lg" />
    },
    {
      title: 'Double Room Price',
      dataIndex: 'double_room_price',
      width: 140,
      render: (val, record) => <InputNumber min={0} step={0.01} value={val} onChange={(v) => updateTierRow(record.key, 'double_room_price', v)} className="w-full rounded-lg" />
    },
    {
      title: 'Triple Room Price',
      dataIndex: 'triple_room_price',
      width: 140,
      render: (val, record) => <InputNumber min={0} step={0.01} value={val} onChange={(v) => updateTierRow(record.key, 'triple_room_price', v)} className="w-full rounded-lg" />
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<CopyOutlined />} onClick={() => duplicateTierRow(record)} title="Duplicate" />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => deleteTierRow(record.key)} />
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
              showSearch
              onChange={(val) => {
                setSelectedCountry(val);
                searchForm.setFieldsValue({ city: undefined });
              }}
              className="rounded-lg shadow-sm"
            >
              {countryNames.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
            </Select>
          </Form.Item>
          
          <Form.Item name="city" label="City" className="mb-0">
            <Select
              placeholder="Select city"
              allowClear
              showSearch
              disabled={!selectedCountry}
              className="rounded-lg shadow-sm"
            >
              {(citiesByCountry[selectedCountry] || []).map(city => (
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
        width={900}
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

              <Form.Item name="code" label="Tour Code">
                <Input placeholder="BKK-T001" className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="duration" label="Duration (Days)" rules={[{ required: true, message: 'Please enter duration' }]}>
                <InputNumber min={1} placeholder="1" className="w-full rounded-lg h-10 flex items-center" />
              </Form.Item>

              <Form.Item name="country" label="Country" rules={[{ required: true, message: 'Please select country' }]}>
                <Select
                  placeholder="Select country"
                  showSearch
                  onChange={(val) => {
                    setSelectedCountry(val);
                    form.setFieldsValue({ city: undefined });
                  }}
                  className="rounded-lg h-10"
                >
                  {countryNames.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
              </Form.Item>

              <Form.Item name="city" label="City">
                <Select placeholder="Select city" showSearch allowClear disabled={!selectedCountry} className="rounded-lg h-10">
                  {(citiesByCountry[selectedCountry] || []).map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
              </Form.Item>

              <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select category' }]}>
                <Select placeholder="Select category" className="rounded-lg h-10">
                  <Select.Option value="Standard">Standard</Select.Option>
                  <Select.Option value="Deluxe">Deluxe</Select.Option>
                  <Select.Option value="VIP">VIP / Premium</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="departures" label="Departures" rules={[{ required: true, message: 'Please enter departures' }]}>
                <Input placeholder="Daily / Mon, Wed, Fri" className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="route" label="Route" className="col-span-2">
                <Input placeholder="Bangkok - Ayutthaya - Bangkok" className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="display_order" label="Display Order">
                <InputNumber min={0} placeholder="0" className="w-full rounded-lg h-10 flex items-center" />
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
                options={dayOptions}
                value={validDays}
                onChange={setValidDays}
                className="grid grid-cols-4 sm:grid-cols-7 gap-4"
              />
              <div className="mt-4 flex gap-2">
                <Button size="small" onClick={() => setValidDays(['mon','tue','wed','thu','fri','sat','sun'])}>Select All</Button>
                <Button size="small" onClick={() => setValidDays([])}>Clear All</Button>
                <Button size="small" onClick={() => setValidDays(['mon','tue','wed','thu','fri'])}>Weekdays Only</Button>
                <Button size="small" onClick={() => setValidDays(['sat','sun'])}>Weekends Only</Button>
              </div>
            </div>
          </TabPane>

          <TabPane tab={<span className="flex items-center gap-2"><DollarOutlined />Room Pricing</span>} key="3">
            <div className="flex justify-between items-center mb-4 mt-2">
              <span className="text-slate-500 text-xs">Configure date-based room pricing (single, double, triple)</span>
              <Button type="dashed" onClick={addTierRow} icon={<PlusOutlined />} className="rounded-lg">Add Tier</Button>
            </div>

            <Table
              dataSource={pricingTiers}
              columns={pricingColumns}
              pagination={false}
              rowKey="key"
              size="small"
              className="border border-slate-100 rounded-lg overflow-hidden"
              locale={{ emptyText: 'No pricing tiers added. Click "Add Tier" to add one.' }}
              scroll={{ x: 900 }}
            />
          </TabPane>
        </Tabs>
      </Drawer>
    </div>
  );
}
