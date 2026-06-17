import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Drawer, message, Popconfirm, InputNumber, Tabs, Checkbox, DatePicker, Divider, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined, DollarOutlined, CalendarOutlined, CopyOutlined } from '@ant-design/icons';
import { Binoculars, MapPin, Tag as TagIcon, Compass, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import api from '../services/api.js';

const { TabPane } = Tabs;

export default function Excursions() {
  const [excursions, setExcursions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchForm] = Form.useForm();
  
  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Add Excursion');
  const [currentExcursion, setCurrentExcursion] = useState(null);
  const [form] = Form.useForm();

  // Dynamic API data
  const [countries, setCountries] = useState([]); // [{code, name}]
  const [countryNames, setCountryNames] = useState([]); // string[]
  const [citiesByCountry, setCitiesByCountry] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Child data
  const [pricingTiers, setPricingTiers] = useState([]);
  const [validDays, setValidDays] = useState([]);

  const dayOptions = [
    { label: 'Mon', value: 'Mon' },
    { label: 'Tue', value: 'Tue' },
    { label: 'Wed', value: 'Wed' },
    { label: 'Thu', value: 'Thu' },
    { label: 'Fri', value: 'Fri' },
    { label: 'Sat', value: 'Sat' },
    { label: 'Sun', value: 'Sun' },
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
    // Find country code from name
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

  // Load suppliers from API
  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get('/suppliers/names?service_type=excursions');
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSuppliers([]);
    }
  }, []);

  const fetchExcursions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/excursions');
      setExcursions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.warn('API error:', err);
      setExcursions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExcursions();
    fetchCountries();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (selectedCountry) fetchCities(selectedCountry);
  }, [selectedCountry]);

  const handleSearch = async (values) => {
    setLoading(true);
    try {
      let params = {};
      if (values.city) params.city = values.city;
      if (values.keyword) params.keyword = values.keyword;
      const url = values.city ? '/excursions/by-location' : '/excursions';
      const response = await api.get(url, { params });
      let results = Array.isArray(response.data) ? response.data : [];
      if (values.country) {
        results = results.filter(e => e.country === values.country);
      }
      if (values.keyword && !values.city) {
        const kw = values.keyword.toLowerCase();
        results = results.filter(e => e.name?.toLowerCase().includes(kw));
      }
      setExcursions(results);
    } catch {
      setExcursions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = (record = null) => {
    if (record) {
      setDrawerTitle('Edit Excursion');
      setCurrentExcursion(record);
      form.setFieldsValue({
        name: record.name,
        country: record.country,
        city: record.city,
        code: record.code,
        description: record.description,
        sic_price_adult: record.sic_price_adult ? parseFloat(record.sic_price_adult) : 0,
        sic_price_child: record.sic_price_child ? parseFloat(record.sic_price_child) : 0,
        walkin_price: record.walkin_price ? parseFloat(record.walkin_price) : 0,
        supplier_name: record.supplier_name || undefined,
        display_order: record.display_order || 0,
        is_sic_excursion: record.is_sic_excursion || false,
      });
      setSelectedCountry(record.country);
      // Parse valid_days from DB string
      const days = record.valid_days ? record.valid_days.split(',').map(d => d.trim()) : [];
      setValidDays(days);
      // Parse pricing tiers
      const tiers = (record.excursion_pricing || []).map((p, i) => ({
        key: p.id || Date.now() + i,
        start_date: p.start_date,
        end_date: p.end_date,
        pax: p.pax,
        price: parseFloat(p.price),
        cost: parseFloat(p.cost),
        supplement_pvt: p.supplement_pvt || 0,
        currency_id: p.currency_id,
      }));
      setPricingTiers(tiers);
    } else {
      setDrawerTitle('Add Excursion');
      setCurrentExcursion(null);
      form.resetFields();
      setSelectedCountry(null);
      setValidDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']); // all days by default
      setPricingTiers([]);
    }
    setDrawerVisible(true);
  };

  const handleSaveExcursion = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name,
        city: values.city,
        code: values.code || null,
        is_sic_excursion: values.is_sic_excursion || false,
        description: values.description || null,
        sic_price_adult: values.sic_price_adult || 0,
        sic_price_child: values.sic_price_child || 0,
        walkin_price: values.walkin_price || 0,
        supplier_name: values.supplier_name || null,
        valid_days: validDays.join(','),
        country: values.country || 'Thailand',
        display_order: values.display_order || 0,
        pricing: pricingTiers.map(p => ({
          start_date: p.start_date,
          end_date: p.end_date,
          pax: parseInt(p.pax) || 1,
          price: parseFloat(p.price) || 0,
          cost: parseFloat(p.cost) || 0,
          supplement_pvt: parseInt(p.supplement_pvt) || 0,
          currency_id: p.currency_id || null,
        })),
      };

      if (currentExcursion) {
        message.loading({ content: 'Saving...', key: 'excsave' });
        await api.put(`/excursions/${currentExcursion.id}`, payload);
        message.success({ content: 'Excursion updated successfully', key: 'excsave' });
      } else {
        message.loading({ content: 'Creating...', key: 'excsave' });
        await api.post('/excursions', payload);
        message.success({ content: 'Excursion added successfully', key: 'excsave' });
      }
      setDrawerVisible(false);
      fetchExcursions();
    } catch (err) {
      if (err.errorFields) {
        message.error('Please fix form validation errors.');
      } else {
        message.error('Failed to save excursion: ' + (err.response?.data || err.message));
      }
    }
  };

  const handleDeleteExcursion = async (id) => {
    try {
      await api.delete(`/excursions/${id}`);
      message.success('Excursion deleted successfully');
      fetchExcursions();
    } catch {
      message.error('Failed to delete excursion');
    }
  };

  // Pricing tier handlers
  const addPricingRow = () => {
    setPricingTiers(prev => [...prev, {
      key: Date.now(),
      start_date: dayjs().format('YYYY-MM-DD'),
      end_date: dayjs().add(1, 'year').format('YYYY-MM-DD'),
      pax: 1, price: 0, cost: 0, supplement_pvt: 0, currency_id: null
    }]);
  };
  const duplicatePricingRow = (row) => {
    setPricingTiers(prev => [...prev, { ...row, key: Date.now() }]);
  };
  const updatePricingRow = (key, field, val) => {
    setPricingTiers(prev => prev.map(t => t.key === key ? { ...t, [field]: val } : t));
  };
  const deletePricingRow = (key) => {
    setPricingTiers(prev => prev.filter(t => t.key !== key));
  };

  const columns = [
    {
      title: 'Excursion Details',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-800 text-sm">{text}</span>
            {record.description && (
              <Tooltip title={<div className="max-w-[350px] text-xs leading-relaxed">{record.description}</div>} placement="top">
                <InfoCircleOutlined className="text-slate-400 cursor-help hover:text-sky-600 transition-colors text-xs" />
              </Tooltip>
            )}
          </div>
          {record.code && <Tag color="cyan" className="mt-1">{record.code}</Tag>}
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
      title: 'SIC Rates',
      key: 'rates',
      render: (_, record) => (
        <Space direction="vertical" size={1} className="text-xs">
          <span>Adult: <strong className="text-emerald-600">{parseFloat(record.sic_price_adult || 0).toLocaleString()} THB</strong></span>
          <span>Child: <strong className="text-emerald-500">{parseFloat(record.sic_price_child || 0).toLocaleString()} THB</strong></span>
        </Space>
      )
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      render: (text) => <span className="text-slate-500 text-xs font-semibold">{text || '-'}</span>
    },
    {
      title: 'Valid Days',
      dataIndex: 'valid_days',
      key: 'valid_days',
      render: (text) => {
        if (!text) return <Tag color="green">All Days</Tag>;
        const dayMap = { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat', 'sun': 'Sun', 'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu', 'fri': 'Fri', 'sat': 'Sat' };
        const days = text.split(',').map(d => dayMap[d.trim().toLowerCase()] || d);
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
        const count = record.excursion_pricing?.length || 0;
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
            title="Are you sure you want to delete this excursion?"
            onConfirm={() => handleDeleteExcursion(record.id)}
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
          onChange={(d) => updatePricingRow(record.key, 'start_date', d ? d.format('YYYY-MM-DD') : null)}
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
          onChange={(d) => updatePricingRow(record.key, 'end_date', d ? d.format('YYYY-MM-DD') : null)}
          className="w-full rounded-lg"
          format="YYYY-MM-DD"
        />
      )
    },
    {
      title: 'Pax',
      dataIndex: 'pax',
      width: 80,
      render: (val, record) => <InputNumber min={1} value={val} onChange={(v) => updatePricingRow(record.key, 'pax', v)} className="w-full rounded-lg" />
    },
    {
      title: 'Price',
      dataIndex: 'price',
      width: 110,
      render: (val, record) => <InputNumber min={0} step={0.01} value={val} onChange={(v) => updatePricingRow(record.key, 'price', v)} className="w-full rounded-lg" />
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      width: 110,
      render: (val, record) => <InputNumber min={0} step={0.01} value={val} onChange={(v) => updatePricingRow(record.key, 'cost', v)} className="w-full rounded-lg" />
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<CopyOutlined />} onClick={() => duplicatePricingRow(record)} title="Duplicate" />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => deletePricingRow(record.key)} />
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
        width={800}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)} className="rounded-lg">Cancel</Button>
            <Button type="primary" onClick={handleSaveExcursion} className="bg-sky-600 border-none rounded-lg shadow-md shadow-sky-600/10">Save Excursion</Button>
          </Space>
        }
        bodyStyle={{ paddingBottom: 80 }}
      >
        <Tabs defaultActiveKey="1">
          <TabPane tab={<span className="flex items-center gap-2"><InfoCircleOutlined />Basic Details</span>} key="1">
            <Form form={form} layout="vertical" className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <Form.Item name="name" label="Excursion Name" rules={[{ required: true, message: 'Please enter excursion name' }]} className="col-span-2">
                <Input placeholder="Siam Niramit Show Entrance" className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="code" label="Excursion Code">
                <Input placeholder="Enter excursion code" className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="display_order" label="Display Order">
                <InputNumber min={0} placeholder="0" className="w-full rounded-lg h-10 flex items-center" />
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

              <Form.Item name="city" label="City" rules={[{ required: true, message: 'Please select city' }]}>
                <Select placeholder="Select city" showSearch disabled={!selectedCountry} className="rounded-lg h-10">
                  {(citiesByCountry[selectedCountry] || []).map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
              </Form.Item>

              <Form.Item name="supplier_name" label="Supplier">
                <Select placeholder="Select supplier" allowClear showSearch className="rounded-lg h-10">
                  {suppliers.map(s => <Select.Option key={s.id} value={s.name}>{s.name}</Select.Option>)}
                </Select>
              </Form.Item>

              <Form.Item name="is_sic_excursion" label="SIC Excursion" valuePropName="checked">
                <Checkbox>This is a SIC excursion</Checkbox>
              </Form.Item>

              <Form.Item name="sic_price_adult" label="SIC Price Adult" rules={[{ required: true, message: 'Please enter adult price' }]}>
                <InputNumber min={0} step={0.01} className="w-full rounded-lg h-10 flex items-center" />
              </Form.Item>

              <Form.Item name="sic_price_child" label="SIC Price Child" rules={[{ required: true, message: 'Please enter child price' }]}>
                <InputNumber min={0} step={0.01} className="w-full rounded-lg h-10 flex items-center" />
              </Form.Item>

              <Form.Item name="walkin_price" label="Walk-in Price">
                <InputNumber min={0} step={0.01} className="w-full rounded-lg h-10 flex items-center" />
              </Form.Item>

              <Form.Item name="description" label="Description" className="col-span-2">
                <Input.TextArea placeholder="Details about timings, duration, and inclusions..." rows={4} className="rounded-lg" />
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab={<span className="flex items-center gap-2"><CalendarOutlined />Valid Days</span>} key="2">
            <div className="py-4">
              <p className="text-slate-500 mb-4 text-sm">Select the days of the week when this excursion is available:</p>
              <Checkbox.Group
                options={dayOptions}
                value={validDays}
                onChange={setValidDays}
                className="grid grid-cols-4 sm:grid-cols-7 gap-4"
              />
              <div className="mt-4 flex gap-2">
                 <Button size="small" onClick={() => setValidDays(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])}>Select All</Button>
                 <Button size="small" onClick={() => setValidDays([])}>Clear All</Button>
                 <Button size="small" onClick={() => setValidDays(['Mon','Tue','Wed','Thu','Fri'])}>Weekdays Only</Button>
                 <Button size="small" onClick={() => setValidDays(['Sat','Sun'])}>Weekends Only</Button>
              </div>
            </div>
          </TabPane>

          <TabPane tab={<span className="flex items-center gap-2"><DollarOutlined />Pricing Tiers</span>} key="3">
            <div className="flex justify-between items-center mb-4 mt-2">
              <span className="text-slate-500 text-xs">Configure date-based pricing tiers per number of passengers</span>
              <Button type="dashed" onClick={addPricingRow} icon={<PlusOutlined />} className="rounded-lg">Add Price Tier</Button>
            </div>
            <Table
              dataSource={pricingTiers}
              columns={pricingColumns}
              pagination={false}
              rowKey="key"
              size="small"
              className="border border-slate-100 rounded-lg overflow-hidden"
              locale={{ emptyText: 'No pricing tiers added. Click "Add Price Tier" to add one.' }}
            />
          </TabPane>
        </Tabs>
      </Drawer>
    </div>
  );
}
