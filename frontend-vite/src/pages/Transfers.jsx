import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Drawer, message, Popconfirm, InputNumber, Tabs, DatePicker, Divider } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined, DollarOutlined, CopyOutlined } from '@ant-design/icons';
import { Bus, MapPin, ArrowRight } from 'lucide-react';
import dayjs from 'dayjs';
import api from '../services/api.js';

const { TabPane } = Tabs;

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchForm] = Form.useForm();
  
  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Add Transfer');
  const [currentTransfer, setCurrentTransfer] = useState(null);
  const [form] = Form.useForm();

  // Dynamic API data
  const [countries, setCountries] = useState([]); // [{code, name}]
  const [countryNames, setCountryNames] = useState([]); // string[]
  const [citiesByCountry, setCitiesByCountry] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Pricing tiers
  const [pricingTiers, setPricingTiers] = useState([]);

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

  // Load suppliers from API
  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get('/suppliers/names?service_type=transfers');
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSuppliers([]);
    }
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/transfers');
      setTransfers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.warn('API error:', err);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
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
      const url = values.city ? '/transfers/by-city' : '/transfers';
      const response = await api.get(url, { params });
      let results = Array.isArray(response.data) ? response.data : [];
      if (values.country) {
        results = results.filter(t => t.country === values.country);
      }
      if (values.keyword && !values.city) {
        const kw = values.keyword.toLowerCase();
        results = results.filter(t =>
          t.transfer_type?.toLowerCase().includes(kw) ||
          t.departure?.toLowerCase().includes(kw) ||
          t.arrival?.toLowerCase().includes(kw) ||
          t.description?.toLowerCase().includes(kw)
        );
      }
      setTransfers(results);
    } catch {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = (record = null) => {
    if (record) {
      setDrawerTitle('Edit Transfer');
      setCurrentTransfer(record);
      form.setFieldsValue({
        transfer_type: record.transfer_type,
        country: record.country,
        city: record.city,
        departure: record.departure,
        arrival: record.arrival,
        description: record.description,
        sic_price_adult: record.sic_price_adult ? parseFloat(record.sic_price_adult) : 0,
        sic_price_child: record.sic_price_child ? parseFloat(record.sic_price_child) : 0,
        supplier_name: record.supplier_name || undefined,
        supplier_id: record.supplier_id || undefined,
        display_order: record.display_order || 0,
      });
      setSelectedCountry(record.country);
      // Parse pricing tiers
      const tiers = (record.transfer_pricing || []).map((p, i) => ({
        key: p.id || Date.now() + i,
        start_date: p.start_date,
        end_date: p.end_date,
        pax: p.pax,
        price: parseFloat(p.price),
        cost: parseFloat(p.cost),
        currency_id: p.currency_id,
      }));
      setPricingTiers(tiers);
    } else {
      setDrawerTitle('Add Transfer');
      setCurrentTransfer(null);
      form.resetFields();
      setSelectedCountry(null);
      setPricingTiers([]);
    }
    setDrawerVisible(true);
  };

  const handleSaveTransfer = async () => {
    try {
      const values = await form.validateFields();
      // Find supplier_id from supplier_name
      const selectedSupplier = suppliers.find(s => s.name === values.supplier_name);
      const payload = {
        transfer_type: values.transfer_type,
        city: values.city,
        description: values.description || null,
        departure: values.departure,
        arrival: values.arrival,
        supplier_name: values.supplier_name || null,
        supplier_id: selectedSupplier?.id || null,
        country: values.country || 'Thailand',
        sic_price_adult: values.sic_price_adult || 0,
        sic_price_child: values.sic_price_child || 0,
        display_order: values.display_order || 0,
        pricing: pricingTiers.map(p => ({
          start_date: p.start_date,
          end_date: p.end_date,
          pax: parseInt(p.pax) || 1,
          price: parseFloat(p.price) || 0,
          cost: parseFloat(p.cost) || 0,
          currency_id: p.currency_id || null,
        })),
      };

      if (currentTransfer) {
        message.loading({ content: 'Saving...', key: 'transsave' });
        await api.put(`/transfers/${currentTransfer.id}`, payload);
        message.success({ content: 'Transfer updated successfully', key: 'transsave' });
      } else {
        message.loading({ content: 'Creating...', key: 'transsave' });
        await api.post('/transfers', payload);
        message.success({ content: 'Transfer added successfully', key: 'transsave' });
      }
      setDrawerVisible(false);
      fetchTransfers();
    } catch (err) {
      if (err.errorFields) {
        message.error('Please fix form validation errors.');
      } else {
        message.error('Failed to save transfer: ' + (err.response?.data || err.message));
      }
    }
  };

  const handleDeleteTransfer = async (id) => {
    try {
      await api.delete(`/transfers/${id}`);
      message.success('Transfer deleted successfully');
      fetchTransfers();
    } catch {
      message.error('Failed to delete transfer');
    }
  };

  // Pricing tier handlers
  const addPricingRow = () => {
    setPricingTiers(prev => [...prev, {
      key: Date.now(),
      start_date: dayjs().format('YYYY-MM-DD'),
      end_date: dayjs().add(1, 'year').format('YYYY-MM-DD'),
      pax: 1, price: 0, cost: 0, currency_id: null
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
      title: '#',
      key: 'index',
      width: 60,
      align: 'center',
      render: (text, record, index) => <span className="text-slate-400 text-xs">{index + 1}</span>
    },
    {
      title: 'Transfer Route',
      dataIndex: 'transfer_type',
      key: 'transfer_type',
      render: (text, record) => (
        <div>
          <span className="font-bold text-slate-800 text-sm block">{text || record.type}</span>
          <span className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
            {record.departure} <ArrowRight className="w-3 h-3 text-slate-300 mx-0.5" /> {record.arrival}
          </span>
          {record.description && <span className="text-slate-400 text-xs mt-0.5 block">{record.description}</span>}
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
      title: 'Display Order',
      dataIndex: 'display_order',
      key: 'display_order',
      align: 'center',
      width: 120,
      sorter: (a, b) => (a.display_order || 0) - (b.display_order || 0),
      render: (text) => <span className="font-semibold text-slate-600">{text !== undefined && text !== null ? text : 0}</span>
    },
    {
      title: 'Pricing',
      key: 'pricing_count',
      render: (_, record) => {
        const count = record.transfer_pricing?.length || 0;
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
            title="Are you sure you want to delete this transfer?"
            onConfirm={() => handleDeleteTransfer(record.id)}
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
        width={800}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)} className="rounded-lg">Cancel</Button>
            <Button type="primary" onClick={handleSaveTransfer} className="bg-sky-600 border-none rounded-lg shadow-md shadow-sky-600/10">Save Transfer</Button>
          </Space>
        }
        bodyStyle={{ paddingBottom: 80 }}
      >
        <Tabs defaultActiveKey="1">
          <TabPane tab={<span className="flex items-center gap-2"><InfoCircleOutlined />Basic Details</span>} key="1">
            <Form form={form} layout="vertical" className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <Form.Item name="transfer_type" label="Transfer Type / Route Title" rules={[{ required: true, message: 'Please enter transfer type' }]} className="col-span-2">
                <Input placeholder="BKK Airport to Hotel Transfer" className="rounded-lg h-10" />
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

              <Form.Item name="departure" label="Departure Location" rules={[{ required: true, message: 'Please enter departure point' }]}>
                <Input placeholder="Suvarnabhumi Airport (BKK)" className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="arrival" label="Arrival Location" rules={[{ required: true, message: 'Please enter arrival point' }]}>
                <Input placeholder="Bangkok Hotel Downtown" className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="supplier_name" label="Supplier">
                <Select placeholder="Select supplier" allowClear showSearch className="rounded-lg h-10">
                  {suppliers.map(s => <Select.Option key={s.id} value={s.name}>{s.name}</Select.Option>)}
                </Select>
              </Form.Item>

              <Form.Item name="display_order" label="Display Order">
                <InputNumber min={0} placeholder="0" className="w-full rounded-lg h-10 flex items-center" />
              </Form.Item>

              <Form.Item name="sic_price_adult" label="SIC Price Adult">
                <InputNumber min={0} step={0.01} className="w-full rounded-lg h-10 flex items-center" />
              </Form.Item>

              <Form.Item name="sic_price_child" label="SIC Price Child">
                <InputNumber min={0} step={0.01} className="w-full rounded-lg h-10 flex items-center" />
              </Form.Item>

              <Form.Item name="description" label="Description" className="col-span-2">
                <Input.TextArea placeholder="Transfer details, vehicle type, inclusions..." rows={4} className="rounded-lg" />
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab={<span className="flex items-center gap-2"><DollarOutlined />Pricing Tiers</span>} key="2">
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
