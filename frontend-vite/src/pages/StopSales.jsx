import React, { useState } from 'react';
import { Table, Card, Form, Button, Select, Space, Tag, Drawer, message, Popconfirm, DatePicker } from 'antd';
import { PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { ShieldAlert, Hotel, Calendar } from 'lucide-react';

const { RangePicker } = DatePicker;

export default function StopSales() {
  const [stopSales, setStopSales] = useState([
    { id: 1, hotel: 'Mandarin Oriental Bangkok', roomType: 'Deluxe Premier', fromDate: '2026-12-24', toDate: '2026-12-31', reason: 'Peak Season Sold Out' },
    { id: 2, hotel: 'The Slate Phuket', roomType: 'Pearl Bed Suite', fromDate: '2026-09-01', toDate: '2026-09-15', reason: 'Annual Pool Renovation' }
  ]);
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const mockHotels = ['Mandarin Oriental Bangkok', 'The Slate Phuket', 'Centara Grand Pattaya'];
  const mockRooms = {
    'Mandarin Oriental Bangkok': ['Deluxe Premier', 'Superior Room', 'Mandarin Suite'],
    'The Slate Phuket': ['Pearl Bed Suite', 'Pool Villa'],
    'Centara Grand Pattaya': ['Deluxe Sea View', 'Family Suite']
  };

  const [selectedHotel, setSelectedHotel] = useState(null);

  const handleOpenDrawer = () => {
    form.resetFields();
    setSelectedHotel(null);
    setDrawerVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const [from, to] = values.dates;
      const newBlock = {
        id: Date.now(),
        hotel: values.hotel,
        roomType: values.roomType,
        fromDate: from.format('YYYY-MM-DD'),
        toDate: to.format('YYYY-MM-DD'),
        reason: values.reason || 'Not Specified'
      };
      setStopSales(prev => [newBlock, ...prev]);
      message.success('Stop Sale rule added successfully');
      setDrawerVisible(false);
    } catch (e) {
      message.error('Validation failed');
    }
  };

  const handleDelete = (id) => {
    setStopSales(prev => prev.filter(s => s.id !== id));
    message.success('Stop Sale block removed');
  };

  const columns = [
    {
      title: 'Hotel Accommodation',
      dataIndex: 'hotel',
      key: 'hotel',
      render: (text, record) => (
        <div>
          <span className="font-bold text-slate-800 text-sm block">{text}</span>
          <span className="text-slate-400 text-xs mt-0.5">{record.roomType}</span>
        </div>
      )
    },
    {
      title: 'Blocked Dates',
      key: 'dates',
      render: (_, record) => (
        <Space size={2} className="text-slate-600 text-sm font-semibold">
          <Calendar className="w-3.5 h-3.5 text-sky-600" />
          {record.fromDate} to {record.toDate}
        </Space>
      )
    },
    {
      title: 'Reason / Notes',
      dataIndex: 'reason',
      key: 'reason',
      render: (text) => <Tag color="volcano">{text}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Popconfirm title="Remove this stop-sale blockage?" onConfirm={() => handleDelete(record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Stop Sale</h1>
          <p className="text-slate-500 m-0 mt-1">Configure black-out calendars for hotels and specific room categories to prevent bookings</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenDrawer} className="bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg flex items-center">
          Add Stop Sale
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table dataSource={stopSales} columns={columns} rowKey="id" pagination={false} className="border border-slate-100 rounded-xl overflow-hidden shadow-inner" />
      </Card>

      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-sky-600" /> Block Room Booking (Stop Sale)</span>}
        width={400}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
            <Button type="primary" onClick={handleSave} className="bg-sky-600 border-none">Block Dates</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="hotel" label="Select Hotel" rules={[{ required: true, message: 'Please select a hotel' }]}>
            <Select placeholder="Select hotel" onChange={(val) => { setSelectedHotel(val); form.setFieldsValue({ roomType: undefined }); }}>
              {mockHotels.map(h => <Select.Option key={h} value={h}>{h}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="roomType" label="Select Room Type" rules={[{ required: true, message: 'Please select a room category' }]}>
            <Select placeholder="Select category" disabled={!selectedHotel}>
              {(mockRooms[selectedHotel] || []).map(r => <Select.Option key={r} value={r}>{r}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="dates" label="Blocked Date Range" rules={[{ required: true, message: 'Select blockage dates' }]}>
            <RangePicker className="w-full" />
          </Form.Item>

          <Form.Item name="reason" label="Reason for Stop-Sale" rules={[{ required: true, message: 'Reason is required' }]}>
            <Input placeholder="Peak Season Full Booking / Renovation" className="rounded-lg h-10" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
