import React, { useState } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Drawer, message, Popconfirm, Divider, Row, Col, Badge } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined, MailOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Calendar, User, Eye, Settings, Compass, Car, Hotel, Check, X, ShieldAlert } from 'lucide-react';

export default function Bookings() {
  const [bookings, setBookings] = useState([
    {
      id: 1,
      bookingRef: 'BK-2026-8809',
      invoiceNo: 'INV-2026-0044',
      title: 'Family Summer Trip in Bangkok & Phuket',
      agent: 'Vera Thailandia Online',
      clientName: 'Marco Rossi',
      paxCount: '4 Adults, 2 Children',
      totalSelling: 102000,
      status: 'Confirmed',
      items: [
        { id: 101, type: 'hotel', details: 'Mandarin Oriental Bangkok - Deluxe Premier', price: 12000, qty: 3, status: 'Approved', supplier: 'Mandarin Oriental BKK' },
        { id: 102, type: 'excursion', details: 'Thai Cooking Class & Market Tour', price: 1500, qty: 2, status: 'Pending', supplier: 'Siam Cooking Academy' },
        { id: 103, type: 'transfer', details: 'BKK Airport to Bangkok Hotel', price: 1200, qty: 1, status: 'Approved', supplier: 'Bangkok Limo Express' }
      ]
    },
    {
      id: 2,
      bookingRef: 'BK-2026-9041',
      invoiceNo: '',
      title: 'Bangkok Culture & Luxury Honeymoon',
      agent: 'B2B Travel Partner Europe',
      clientName: 'Jean Dupont',
      paxCount: '2 Adults',
      totalSelling: 134400,
      status: 'Pending',
      items: [
        { id: 201, type: 'hotel', details: 'The Slate Phuket - Pearl Bed Suite', price: 9500, qty: 5, status: 'Pending', supplier: 'The Slate Resort' }
      ]
    }
  ]);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [form] = Form.useForm();

  const handleOpenDrawer = (record) => {
    setCurrentBooking(record);
    form.setFieldsValue({
      invoiceNo: record.invoiceNo
    });
    setDrawerVisible(true);
  };

  const handleUpdateItemStatus = (itemId, newStatus) => {
    if (!currentBooking) return;
    const updatedItems = currentBooking.items.map(item =>
      item.id === itemId ? { ...item, status: newStatus } : item
    );
    const updatedBooking = { ...currentBooking, items: updatedItems };
    setCurrentBooking(updatedBooking);
    
    setBookings(prev => prev.map(b => b.id === currentBooking.id ? updatedBooking : b));
    message.success(`Item status updated to ${newStatus}`);
  };

  const handleNotifySupplier = (item) => {
    message.loading({ content: `Sending email request to ${item.supplier}...`, key: 'notify' });
    setTimeout(() => {
      message.success({ content: `Notification email sent to ${item.supplier} for item "${item.details}"`, key: 'notify' });
    }, 800);
  };

  const handleSaveInvoiceNo = async () => {
    try {
      const values = await form.validateFields();
      if (!currentBooking) return;
      const updatedBooking = { ...currentBooking, invoiceNo: values.invoiceNo };
      setCurrentBooking(updatedBooking);
      setBookings(prev => prev.map(b => b.id === currentBooking.id ? updatedBooking : b));
      message.success('Invoice Number updated successfully');
    } catch (e) {
      message.error('Validation failed');
    }
  };

  const columns = [
    {
      title: 'Booking Ref',
      dataIndex: 'bookingRef',
      key: 'bookingRef',
      render: (text) => <Tag color="blue" className="font-mono font-bold">{text}</Tag>
    },
    {
      title: 'Invoice No.',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      render: (text) => text ? <Tag color="cyan" className="font-mono font-semibold">{text}</Tag> : <span className="text-slate-400 text-xs italic">Unassigned</span>
    },
    {
      title: 'Booking details',
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
      title: 'Gross Total',
      dataIndex: 'totalSelling',
      key: 'totalSelling',
      render: (val) => <strong className="text-emerald-600 font-bold">{(val || 0).toLocaleString()} THB</strong>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'gold';
        if (status === 'Confirmed') color = 'green';
        if (status === 'Pending') color = 'orange';
        return <Tag color={color} className="font-bold uppercase">{status}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Button
          type="text"
          icon={<Eye className="text-sky-600 hover:text-sky-800 w-4 h-4" />}
          onClick={() => handleOpenDrawer(record)}
        />
      )
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800 m-0">Bookings</h1>
        <p className="text-slate-500 m-0 mt-1">Review active tour bookings, process supplier line-item approvals, configure invoice codes, and trigger email notifications</p>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table dataSource={bookings} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} className="border border-slate-100 rounded-xl overflow-hidden shadow-inner" />
      </Card>

      {/* Slide-out details drawer */}
      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-sky-600" /> Booking Details & Surcharges</span>}
        width={850}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {currentBooking && (
          <div>
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <Row gutter={16}>
                <Col span={8}>
                  <div className="text-xs text-slate-400 font-semibold">BOOKING REFERENCE</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">{currentBooking.bookingRef}</div>
                </Col>
                <Col span={8}>
                  <div className="text-xs text-slate-400 font-semibold">CLIENT NAME</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">{currentBooking.clientName}</div>
                </Col>
                <Col span={8}>
                  <div className="text-xs text-slate-400 font-semibold">TOTAL SELLING PRICE</div>
                  <div className="text-base font-bold text-emerald-600 mt-0.5">{currentBooking.totalSelling.toLocaleString()} THB</div>
                </Col>
              </Row>
            </div>

            {/* Invoice Assignment */}
            <Card className="border border-slate-100 shadow-sm rounded-xl mb-6 bg-slate-50/50">
              <h4 className="font-bold text-slate-800 text-sm mb-4">Assign / Update Invoice Code</h4>
              <Form form={form} layout="inline" onFinish={handleSaveInvoiceNo}>
                <Form.Item name="invoiceNo" className="flex-1 mr-2">
                  <Input placeholder="INV-2026-0044" className="rounded-lg h-10 w-full" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" className="bg-sky-600 border-none h-10 rounded-lg">Save Invoice</Button>
                </Form.Item>
              </Form>
            </Card>

            <Divider className="border-slate-100 my-6" />

            <h3 className="font-bold text-slate-800 text-base mb-4">Itinerary Surcharges & Approvals</h3>

            <Table
              dataSource={currentBooking.items}
              pagination={false}
              className="border border-slate-100 rounded-xl overflow-hidden"
              columns={[
                {
                  title: 'Type',
                  dataIndex: 'type',
                  width: 100,
                  render: (type) => {
                    if (type === 'hotel') return <Tag color="blue" icon={<Hotel className="w-3 h-3 mr-1 inline" />}>Hotel</Tag>;
                    if (type === 'excursion') return <Tag color="green" icon={<Compass className="w-3 h-3 mr-1 inline" />}>Excursion</Tag>;
                    return <Tag color="cyan" icon={<Car className="w-3 h-3 mr-1 inline" />}>Transfer</Tag>;
                  }
                },
                {
                  title: 'Details',
                  dataIndex: 'details',
                  render: (text, record) => (
                    <div>
                      <span className="font-semibold text-slate-800 text-sm block">{text}</span>
                      <span className="text-slate-400 text-xs">Supplier: {record.supplier}</span>
                    </div>
                  )
                },
                {
                  title: 'Price (THB)',
                  key: 'price',
                  width: 130,
                  render: (_, record) => <span className="font-semibold text-slate-700">{(record.price * record.qty).toLocaleString()}</span>
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  width: 110,
                  render: (status) => {
                    let color = 'gold';
                    if (status === 'Approved') color = 'green';
                    if (status === 'Declined') color = 'red';
                    return <Tag color={color} className="font-bold">{status}</Tag>;
                  }
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  align: 'center',
                  width: 180,
                  render: (_, record) => (
                    <Space size="small">
                      <Button
                        size="small"
                        type={record.status === 'Approved' ? 'primary' : 'default'}
                        className={record.status === 'Approved' ? 'bg-green-600 border-none' : ''}
                        icon={<Check className="w-3 h-3" />}
                        onClick={() => handleUpdateItemStatus(record.id, 'Approved')}
                      />
                      <Button
                        size="small"
                        danger
                        type={record.status === 'Declined' ? 'primary' : 'default'}
                        className={record.status === 'Declined' ? 'bg-red-600 border-none' : ''}
                        icon={<X className="w-3 h-3" />}
                        onClick={() => handleUpdateItemStatus(record.id, 'Declined')}
                      />
                      <Button
                        size="small"
                        icon={<MailOutlined className="text-sky-600" />}
                        onClick={() => handleNotifySupplier(record)}
                      />
                    </Space>
                  )
                }
              ]}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}
