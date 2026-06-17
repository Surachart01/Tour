import React, { useState } from 'react';
import { Table, Card, Button, Tag, Space, Drawer, Form, InputNumber, Input, Select, DatePicker, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, DollarOutlined, FileTextOutlined, CalendarOutlined } from '@ant-design/icons';
import { CreditCard, Receipt, ArrowRight, User } from 'lucide-react';


export default function Payment() {
  const [payments, setPayments] = useState([
    {
      id: 1,
      bookingRef: 'BK-2026-8809',
      clientName: 'Marco Rossi',
      agent: 'Vera Thailandia Online',
      totalSelling: 102000,
      paidAmount: 102000,
      status: 'Paid',
      deadline: '2026-11-20',
      logs: [
        { key: 1, date: '2026-06-05', method: 'Bank Transfer', refNo: 'TXN-90218844', amount: 102000 }
      ]
    },
    {
      id: 2,
      bookingRef: 'BK-2026-9041',
      clientName: 'Jean Dupont',
      agent: 'B2B Travel Partner Europe',
      totalSelling: 134400,
      paidAmount: 40000,
      status: 'Partially Paid',
      deadline: '2026-06-12',
      logs: [
        { key: 1, date: '2026-06-08', method: 'Credit Card', refNo: 'TXN-88129041', amount: 40000 }
      ]
    }
  ]);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [form] = Form.useForm();

  const handleOpenDrawer = (record) => {
    setCurrentPayment(record);
    form.resetFields();
    setDrawerVisible(true);
  };

  const handleAddPaymentLog = async () => {
    try {
      const values = await form.validateFields();
      if (!currentPayment) return;
      
      const newLog = {
        key: Date.now(),
        date: values.date.format('YYYY-MM-DD'),
        method: values.method,
        refNo: values.refNo,
        amount: Number(values.amount)
      };

      const updatedLogs = [...(currentPayment.logs || []), newLog];
      const newPaidAmount = currentPayment.paidAmount + newLog.amount;
      
      let newStatus = 'Partially Paid';
      if (newPaidAmount >= currentPayment.totalSelling) {
        newStatus = 'Paid';
      }

      const updatedPayment = {
        ...currentPayment,
        paidAmount: newPaidAmount,
        status: newStatus,
        logs: updatedLogs
      };

      setCurrentPayment(updatedPayment);
      setPayments(prev => prev.map(p => p.id === currentPayment.id ? updatedPayment : p));
      message.success('Payment log added successfully');
      form.resetFields();
    } catch (e) {
      message.error('Validation failed');
    }
  };

  const handleGenerateReceipt = (record) => {
    message.loading({ content: 'Generating PDF Receipt...', key: 'receipt' });
    setTimeout(() => {
      message.success({ content: `Receipt for booking ${record.bookingRef} generated and ready for print`, key: 'receipt' });
    }, 800);
  };

  const columns = [
    {
      title: 'Booking Reference',
      dataIndex: 'bookingRef',
      key: 'bookingRef',
      render: (text, record) => (
        <div>
          <span className="font-bold text-slate-800 text-sm block">{text}</span>
          <span className="text-slate-400 text-xs mt-0.5">Agent: {record.agent} | Guest: {record.clientName}</span>
        </div>
      )
    },
    {
      title: 'Gross Selling',
      dataIndex: 'totalSelling',
      key: 'totalSelling',
      render: (val) => <span className="font-semibold text-slate-700">{val.toLocaleString()} THB</span>
    },
    {
      title: 'Amount Settled',
      key: 'settled',
      render: (_, record) => {
        const remaining = record.totalSelling - record.paidAmount;
        return (
          <Space direction="vertical" size={1} className="text-xs">
            <span>Paid: <strong className="text-emerald-600">{(record.paidAmount || 0).toLocaleString()} THB</strong></span>
            <span>Due: <strong className={remaining > 0 ? 'text-red-500' : 'text-slate-400'}>{(remaining || 0).toLocaleString()} THB</strong></span>
          </Space>
        );
      }
    },
    {
      title: 'Payment Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'red';
        if (status === 'Paid') color = 'green';
        if (status === 'Partially Paid') color = 'orange';
        return <Tag color={color} className="font-bold uppercase">{status}</Tag>;
      }
    },
    {
      title: 'Deadline Offset',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (text, record) => {
        const isOverdue = new Date() > new Date(text) && record.status !== 'Paid';
        return (
          <span className={`text-xs font-mono font-semibold flex items-center gap-1 ${isOverdue ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
            <CalendarOutlined /> {text} {isOverdue && '(OVERDUE)'}
          </span>
        );
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
            icon={<DollarOutlined className="text-sky-600 w-4 h-4" />}
            onClick={() => handleOpenDrawer(record)}
          />
          <Button
            type="text"
            icon={<FileTextOutlined className="text-emerald-600 w-4 h-4" />}
            onClick={() => handleGenerateReceipt(record)}
          />
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800 m-0">Payment</h1>
        <p className="text-slate-500 m-0 mt-1">Settle agency invoices, inspect transactional payment logs, trace deadlines, and issue PDF payment receipts</p>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table dataSource={payments} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} className="border border-slate-100 rounded-xl overflow-hidden shadow-inner" />
      </Card>

      {/* Slide-out logs drawer */}
      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-sky-600" /> Settle Booking Invoices</span>}
        width={750}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {currentPayment && (
          <div>
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <Row gutter={16}>
                <Col span={8}>
                  <div className="text-xs text-slate-400 font-semibold">BOOKING REFERENCE</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">{currentPayment.bookingRef}</div>
                </Col>
                <Col span={8}>
                  <div className="text-xs text-slate-400 font-semibold">CLIENT / AGENCY</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5 truncate">{currentPayment.clientName}</div>
                </Col>
                <Col span={8}>
                  <div className="text-xs text-slate-400 font-semibold">REMAINING DUE</div>
                  <div className="text-base font-bold text-red-600 mt-0.5">
                    {(currentPayment.totalSelling - currentPayment.paidAmount).toLocaleString()} THB
                  </div>
                </Col>
              </Row>
            </div>

            {/* Logs Table */}
            <h4 className="font-bold text-slate-800 text-sm mb-4">Transaction Payment Records</h4>
            <Table
              dataSource={currentPayment.logs}
              pagination={false}
              className="border border-slate-100 rounded-xl overflow-hidden mb-6"
              columns={[
                { title: 'Date Logged', dataIndex: 'date', key: 'date', render: (text) => <span className="font-mono text-xs">{text}</span> },
                { title: 'Payment Method', dataIndex: 'method', key: 'method' },
                { title: 'Bank Reference #', dataIndex: 'refNo', key: 'refNo', render: (text) => <span className="font-mono text-xs font-bold">{text}</span> },
                { title: 'Settled Amount', dataIndex: 'amount', key: 'amount', render: (val) => <strong className="text-emerald-600">{(val || 0).toLocaleString()} THB</strong> }
              ]}
            />

            {/* Settle Form */}
            {(currentPayment.totalSelling - currentPayment.paidAmount) > 0 && (
              <Card className="border border-slate-100 shadow-sm rounded-xl bg-slate-50/50">
                <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5"><Receipt className="w-4 h-4 text-sky-600" /> Log Transaction Settle</h4>
                <Form form={form} layout="vertical" onFinish={handleAddPaymentLog} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item name="amount" label="Payment Amount (THB)" rules={[{ required: true, message: 'Please enter amount' }]}>
                    <InputNumber min={1} max={currentPayment.totalSelling - currentPayment.paidAmount} className="w-full rounded-lg h-10 flex items-center" />
                  </Form.Item>

                  <Form.Item name="method" label="Payment Method" rules={[{ required: true, message: 'Select method' }]}>
                    <Select placeholder="Select method" className="h-10 rounded-lg">
                      <Select.Option value="Bank Transfer">Bank Wire Transfer</Select.Option>
                      <Select.Option value="Credit Card">Credit Card Processing</Select.Option>
                      <Select.Option value="Cash">Cash Settlement</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item name="refNo" label="Bank Reference / Authorization #" rules={[{ required: true, message: 'Reference number is required' }]}>
                    <Input placeholder="TXN-902188" className="rounded-lg h-10" />
                  </Form.Item>

                  <Form.Item name="date" label="Transaction Log Date" rules={[{ required: true, message: 'Select transaction date' }]}>
                    <DatePicker className="w-full rounded-lg h-10" />
                  </Form.Item>

                  <Form.Item className="col-span-2 mb-0">
                    <Button type="primary" htmlType="submit" className="w-full bg-sky-600 border-none h-10 rounded-lg font-bold">Register Payment Settlement</Button>
                  </Form.Item>
                </Form>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
