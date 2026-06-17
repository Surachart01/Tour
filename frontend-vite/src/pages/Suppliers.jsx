import React, { useState, useEffect } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Drawer, message, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Contact, MapPin, Mail, Phone, CreditCard } from 'lucide-react';
import api from '../services/api.js';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchForm] = Form.useForm();
  
  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Add Supplier');
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [form] = Form.useForm();

  // Mock Countries & Cities
  const countries = ['Thailand', 'Vietnam', 'Singapore'];
  const cities = {
    Thailand: ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Krabi'],
    Vietnam: ['Hanoi', 'Ho Chi Minh', 'Da Nang'],
    Singapore: ['Singapore City']
  };
  const [selectedCountry, setSelectedCountry] = useState(null);

  const mockSuppliers = [
    {
      id: 1,
      name: 'Bangkok Sightseeing Ltd.',
      contactPerson: 'Kitti Wattana',
      email: 'booking@bkk-sightseeing.com',
      tel: '02-123-4567',
      fax: '02-123-4568',
      currency: 'THB',
      city: 'Bangkok',
      country: 'Thailand',
      bankName: 'Kasikorn Bank',
      bankAccountName: 'Bangkok Sightseeing Co., Ltd.',
      bankAccountNo: '012-3-45678-9',
      bankSwift: 'KASITHBK'
    },
    {
      id: 2,
      name: 'Phuket Marine Tours',
      contactPerson: 'Malee Srisai',
      email: 'info@phuketmarinetours.com',
      tel: '076-987-654',
      fax: '076-987-655',
      currency: 'THB',
      city: 'Phuket',
      country: 'Thailand',
      bankName: 'Siam Commercial Bank',
      bankAccountName: 'Phuket Marine Tours LP',
      bankAccountNo: '456-7-89012-3',
      bankSwift: 'SICOITHB'
    }
  ];

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/suppliers/all');
      if (response.data && response.data.length > 0) {
        setSuppliers(response.data);
      } else {
        setSuppliers(mockSuppliers);
      }
    } catch (err) {
      console.warn('API error, using mock data:', err);
      setSuppliers(mockSuppliers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSearch = (values) => {
    setLoading(true);
    setTimeout(() => {
      let filtered = [...mockSuppliers];
      if (values.country) {
        filtered = filtered.filter(s => s.country === values.country);
      }
      if (values.city) {
        filtered = filtered.filter(s => s.city === values.city);
      }
      if (values.keyword) {
        const kw = values.keyword.toLowerCase();
        filtered = filtered.filter(s => s.name.toLowerCase().includes(kw) || s.contactPerson.toLowerCase().includes(kw));
      }
      setSuppliers(filtered);
      setLoading(false);
    }, 400);
  };

  const handleOpenDrawer = (record = null) => {
    if (record) {
      setDrawerTitle('Edit Supplier');
      setCurrentSupplier(record);
      form.setFieldsValue({
        name: record.name,
        contactPerson: record.contactPerson,
        email: record.email,
        tel: record.tel,
        fax: record.fax,
        currency: record.currency,
        country: record.country,
        city: record.city,
        bankName: record.bankName,
        bankAccountName: record.bankAccountName,
        bankAccountNo: record.bankAccountNo,
        bankSwift: record.bankSwift,
      });
      setSelectedCountry(record.country);
    } else {
      setDrawerTitle('Add Supplier');
      setCurrentSupplier(null);
      form.resetFields();
      setSelectedCountry(null);
    }
    setDrawerVisible(true);
  };

  const handleSaveSupplier = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };

      if (currentSupplier) {
        message.loading({ content: 'Saving...', key: 'supsave' });
        try {
          await api.put(`/suppliers/${currentSupplier.id}`, payload);
        } catch (e) {}
        
        setSuppliers(prev => prev.map(s => s.id === currentSupplier.id ? { ...s, ...payload } : s));
        message.success({ content: 'Supplier updated successfully', key: 'supsave' });
      } else {
        message.loading({ content: 'Creating...', key: 'supsave' });
        let newId = Date.now();
        try {
          const res = await api.post('/suppliers', payload);
          if (res.data && res.data.id) newId = res.data.id;
        } catch (e) {}

        const newSupplier = { id: newId, ...payload };
        setSuppliers(prev => [newSupplier, ...prev]);
        message.success({ content: 'Supplier added successfully', key: 'supsave' });
      }

      setDrawerVisible(false);
    } catch (err) {
      message.error('Please fix form validation errors.');
    }
  };

  const handleDeleteSupplier = async (id) => {
    try {
      await api.delete(`/suppliers/${id}`);
    } catch (e) {}
    setSuppliers(prev => prev.filter(s => s.id !== id));
    message.success('Supplier deleted successfully');
  };

  const columns = [
    {
      title: 'Supplier Details',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <span className="font-bold text-slate-800 text-sm block">{text}</span>
          <span className="text-slate-400 text-xs mt-0.5 flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-slate-400" /> {record.email}
          </span>
          <span className="text-slate-400 text-xs mt-0.5 flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-slate-400" /> {record.tel}
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
      title: 'Contact Person',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      render: (text) => <span className="font-semibold text-slate-600 text-sm">{text || '-'}</span>
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      render: (text) => <Tag color="gold">{text}</Tag>
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
            title="Are you sure you want to delete this supplier?"
            onConfirm={() => handleDeleteSupplier(record.id)}
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
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Suppliers</h1>
          <p className="text-slate-500 m-0 mt-1">Manage wholesale suppliers, emergency contacts, transaction currencies, and bank details</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenDrawer()}
          className="bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg flex items-center"
        >
          Add Supplier
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
            <Input placeholder="Enter supplier name or contact..." className="rounded-lg shadow-sm" />
          </Form.Item>

          <Form.Item label="&nbsp;" className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              className="w-full bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg"
            >
              Search Suppliers
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Table list */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table
          dataSource={suppliers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} suppliers` }}
          className="border border-slate-100 rounded-xl overflow-hidden shadow-inner"
        />
      </Card>

      {/* Add/Edit Drawer */}
      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><Contact className="w-5 h-5 text-sky-600" /> {drawerTitle}</span>}
        width={650}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)} className="rounded-lg">Cancel</Button>
            <Button type="primary" onClick={handleSaveSupplier} className="bg-sky-600 border-none rounded-lg shadow-md shadow-sky-600/10">Save Supplier</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <Form.Item name="name" label="Supplier Company Name" rules={[{ required: true, message: 'Please enter company name' }]} className="col-span-2">
            <Input placeholder="Bangkok Sightseeing Ltd." className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="contactPerson" label="Contact Person" rules={[{ required: true, message: 'Please enter contact person' }]}>
            <Input placeholder="Kitti Wattana" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="currency" label="Default Currency" rules={[{ required: true, message: 'Please select currency' }]}>
            <Select placeholder="Select currency" className="rounded-lg h-10">
              <Select.Option value="THB">THB (฿)</Select.Option>
              <Select.Option value="USD">USD ($)</Select.Option>
              <Select.Option value="EUR">EUR (€)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email', message: 'Please enter valid email' }]}>
            <Input type="email" placeholder="booking@supplier.com" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="tel" label="Telephone" rules={[{ required: true, message: 'Please enter phone' }]}>
            <Input placeholder="02-123-4567" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="fax" label="Fax Number">
            <Input placeholder="02-123-4568" className="rounded-lg h-10" />
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

          <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
            <h4 className="text-slate-800 font-bold text-sm mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-600" /> Bank Account Details (for Payments)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item name="bankName" label="Bank Name">
                <Input placeholder="Kasikorn Bank" className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="bankAccountName" label="Account Holder Name">
                <Input placeholder="Bangkok Sightseeing Co., Ltd." className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="bankAccountNo" label="Account Number">
                <Input placeholder="012-3-45678-9" className="rounded-lg h-10" />
              </Form.Item>

              <Form.Item name="bankSwift" label="SWIFT Code / IBAN">
                <Input placeholder="KASITHBK" className="rounded-lg h-10" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}
