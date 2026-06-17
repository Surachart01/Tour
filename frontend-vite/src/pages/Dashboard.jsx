import React, { useState, useEffect } from 'react';
import { Card, Form, Select, DatePicker, Input, Button, Table, Space, Tag } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { Hotel, Map, Binoculars, Bus, HelpCircle } from 'lucide-react';
import api from '../services/api.js';

const { RangePicker } = DatePicker;

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState(null); // 'hotels' | 'tours' | 'excursions' | 'transfers' | null
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  
  // Search parameters state
  const [countries, setCountries] = useState(['Thailand', 'Vietnam', 'Singapore']);
  const [cities, setCities] = useState({
    Thailand: ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Krabi'],
    Vietnam: ['Hanoi', 'Ho Chi Minh', 'Da Nang'],
    Singapore: ['Singapore City']
  });
  
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [form] = Form.useForm();

  const handleSectionToggle = (section) => {
    if (activeSection === section) {
      setActiveSection(null);
      setTableData([]);
    } else {
      setActiveSection(section);
      setTableData([]);
      form.resetFields();
      setSelectedCountry(null);
    }
  };

  // Mock table rows for layout preview when API isn't responding or databases are empty
  const getMockData = (section) => {
    switch (section) {
      case 'hotels':
        return [
          { id: 1, name: 'Mandarin Oriental Bangkok', city: 'Bangkok', country: 'Thailand', rating: '5 Star', notes: 'Riverfront luxury hotel' },
          { id: 2, name: 'The Slate Phuket', city: 'Phuket', country: 'Thailand', rating: '5 Star', notes: 'Industrial chic design resort' },
          { id: 3, name: 'Centara Grand Pattaya', city: 'Pattaya', country: 'Thailand', rating: '4 Star', notes: 'Family friendly resort near beach' }
        ];
      case 'tours':
        return [
          { id: 1, name: 'Grand Palace & Emerald Buddha Tour', city: 'Bangkok', country: 'Thailand', category: 'Standard', duration: '1 Day' },
          { id: 2, name: 'Phi Phi Island Day Trip by Speedboat', city: 'Phuket', country: 'Thailand', category: 'Deluxe', duration: '1 Day' }
        ];
      case 'excursions':
        return [
          { id: 1, name: 'Thai Cooking Class & Market Tour', city: 'Bangkok', country: 'Thailand', price: '1,500 THB', type: 'SIC' },
          { id: 2, name: 'Elephant Jungle Sanctuary Visit', city: 'Chiang Mai', country: 'Thailand', price: '2,500 THB', type: 'PVT' }
        ];
      case 'transfers':
        return [
          { id: 1, type: 'Airport to Hotel Transfer', city: 'Bangkok', departure: 'Suvarnabhumi Airport (BKK)', arrival: 'Bangkok Hotel', price: '1,200 THB' },
          { id: 2, type: 'Hotel to Pier Transfer', city: 'Phuket', departure: 'Phuket Hotel', arrival: 'Rassada Pier', price: '800 THB' }
        ];
      default:
        return [];
    }
  };

  const handleSearch = async (values) => {
    setLoading(true);
    // Simulate API call or fetch actual backend data if running
    try {
      // Example endpoint: api.get(`/hotels`, { params: { city: values.city, ... } })
      // For scaffold, we show mock data if connection fails or tables are empty
      setTimeout(() => {
        setTableData(getMockData(activeSection));
        setLoading(false);
      }, 600);
    } catch (err) {
      console.error(err);
      setTableData(getMockData(activeSection));
      setLoading(false);
    }
  };

  const columnsMap = {
    hotels: [
      { title: 'Name', dataIndex: 'name', key: 'name', font: 'bold' },
      { title: 'City', dataIndex: 'city', key: 'city' },
      { title: 'Country', dataIndex: 'country', key: 'country' },
      { title: 'Rating', dataIndex: 'rating', key: 'rating', render: (val) => <Tag color="blue">{val}</Tag> },
      { title: 'Notes', dataIndex: 'notes', key: 'notes' },
      {
        title: 'Action',
        key: 'action',
        align: 'center',
        render: (_, record) => (
          <Button type="text" icon={<EyeOutlined className="text-sky-600" />} onClick={() => console.log('view', record.id)} />
        )
      }
    ],
    tours: [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'City', dataIndex: 'city', key: 'city' },
      { title: 'Duration', dataIndex: 'duration', key: 'duration' },
      { title: 'Category', dataIndex: 'category', key: 'category', render: (val) => <Tag color="green">{val}</Tag> },
      {
        title: 'Action',
        key: 'action',
        align: 'center',
        render: (_, record) => (
          <Button type="text" icon={<EyeOutlined className="text-sky-600" />} onClick={() => console.log('view', record.id)} />
        )
      }
    ],
    excursions: [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'City', dataIndex: 'city', key: 'city' },
      { title: 'Price', dataIndex: 'price', key: 'price' },
      { title: 'Type', dataIndex: 'type', key: 'type', render: (val) => <Tag color="orange">{val}</Tag> },
      {
        title: 'Action',
        key: 'action',
        align: 'center',
        render: (_, record) => (
          <Button type="text" icon={<EyeOutlined className="text-sky-600" />} onClick={() => console.log('view', record.id)} />
        )
      }
    ],
    transfers: [
      { title: 'Transfer Type', dataIndex: 'type', key: 'type' },
      { title: 'City', dataIndex: 'city', key: 'city' },
      { title: 'Departure', dataIndex: 'departure', key: 'departure' },
      { title: 'Arrival', dataIndex: 'arrival', key: 'arrival' },
      { title: 'Price', dataIndex: 'price', key: 'price', render: (val) => <span className="font-semibold">{val}</span> },
      {
        title: 'Action',
        key: 'action',
        align: 'center',
        render: (_, record) => (
          <Button type="text" icon={<EyeOutlined className="text-sky-600" />} onClick={() => console.log('view', record.id)} />
        )
      }
    ]
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800 m-0">Dashboard</h1>
        <p className="text-slate-500 m-0 mt-1">Select a category to view and search services</p>
      </div>

      {/* Grid of the 4 core buttons redesigned as cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card
          hoverable
          className={`cursor-pointer transition-all border-none shadow-sm rounded-2xl overflow-hidden ${
            activeSection === 'hotels' ? 'ring-2 ring-sky-500 bg-sky-50/20' : 'bg-white'
          }`}
          onClick={() => handleSectionToggle('hotels')}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${activeSection === 'hotels' ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-500'}`}>
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 m-0">Hotels</h3>
              <p className="text-slate-400 text-xs m-0 mt-0.5">Lookup hotel rooms & availability</p>
            </div>
          </div>
        </Card>

        <Card
          hoverable
          className={`cursor-pointer transition-all border-none shadow-sm rounded-2xl overflow-hidden ${
            activeSection === 'tours' ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : 'bg-white'
          }`}
          onClick={() => handleSectionToggle('tours')}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${activeSection === 'tours' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-500'}`}>
              <Map className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 m-0">Tours</h3>
              <p className="text-slate-400 text-xs m-0 mt-0.5">Explore customizable tour packages</p>
            </div>
          </div>
        </Card>

        <Card
          hoverable
          className={`cursor-pointer transition-all border-none shadow-sm rounded-2xl overflow-hidden ${
            activeSection === 'excursions' ? 'ring-2 ring-amber-500 bg-amber-50/20' : 'bg-white'
          }`}
          onClick={() => handleSectionToggle('excursions')}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${activeSection === 'excursions' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-500'}`}>
              <Binoculars className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 m-0">Excursions</h3>
              <p className="text-slate-400 text-xs m-0 mt-0.5">View activities & daily outings</p>
            </div>
          </div>
        </Card>

        <Card
          hoverable
          className={`cursor-pointer transition-all border-none shadow-sm rounded-2xl overflow-hidden ${
            activeSection === 'transfers' ? 'ring-2 ring-cyan-500 bg-cyan-50/20' : 'bg-white'
          }`}
          onClick={() => handleSectionToggle('transfers')}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${activeSection === 'transfers' ? 'bg-cyan-500 text-white' : 'bg-cyan-50 text-cyan-500'}`}>
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 m-0">Transfers</h3>
              <p className="text-slate-400 text-xs m-0 mt-0.5">Configure transportation & transits</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Expandable Section Panel */}
      {activeSection && (
        <Card className="border-none shadow-sm rounded-2xl mb-8 bg-slate-50/40">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 m-0 capitalize">
              Search {activeSection}
            </h2>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSearch}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <Form.Item name="country" label="Country" className="mb-0">
              <Select
                placeholder="Select country"
                onChange={(val) => {
                  setSelectedCountry(val);
                  form.setFieldsValue({ city: undefined });
                }}
                className="rounded-lg shadow-sm"
              >
                {countries.map((c) => (
                  <Select.Option key={c} value={c}>{c}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="city" label="City" className="mb-0">
              <Select
                placeholder="Select city"
                disabled={!selectedCountry}
                className="rounded-lg shadow-sm"
              >
                {(cities[selectedCountry] || []).map((city) => (
                  <Select.Option key={city} value={city}>{city}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="dates" label="Date Range" className="mb-0">
              <RangePicker className="w-full rounded-lg shadow-sm" />
            </Form.Item>

            <Form.Item name="keyword" label="Keyword & Search" className="mb-0">
              <div className="flex gap-2">
                <Input placeholder="Enter keyword" className="rounded-lg shadow-sm" />
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SearchOutlined />}
                  loading={loading}
                  className="bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg flex items-center justify-center"
                />
              </div>
            </Form.Item>
          </Form>

          {/* Dynamic Table displaying values */}
          <div className="mt-8">
            <Table
              dataSource={tableData}
              columns={columnsMap[activeSection]}
              rowKey="id"
              loading={loading}
              pagination={false}
              className="border border-slate-100 rounded-xl overflow-hidden shadow-inner bg-white"
            />
          </div>
        </Card>
      )}

      {/* General informational card when no section is selected */}
      {!activeSection && (
        <Card className="border-none shadow-sm rounded-2xl p-8 bg-sky-50/30 text-center flex flex-col items-center">
          <div className="p-4 rounded-full bg-sky-100 text-sky-600 inline-block mb-4">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mt-0 mb-2">Welcome to VeraThailandia Panel</h2>
          <p className="text-slate-500 max-w-lg mx-auto m-0">
            Select one of the quick cards above to lookup hotels, tours, excursions, or transfers. You can access full features like bookings, quotations, and analytics using the sidebar menu.
          </p>
        </Card>
      )}
    </div>
  );
}
