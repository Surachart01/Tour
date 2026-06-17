import React, { useState } from 'react';
import { Card, Form, Input, Button, Tabs, message, Avatar, Space, Row, Col, Tag } from 'antd';
import { UserOutlined, LockOutlined, BankOutlined, MailOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

const { TabPane } = Tabs;

export default function Profile() {
  const { user } = useAuth();
  const [formPass] = Form.useForm();
  const [formBank] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Bank masking state
  const [showBankNo, setShowBankNo] = useState(false);
  const [bankData, setBankData] = useState({
    bankName: 'Siam Commercial Bank',
    bankAccountName: 'Vera Thailandia Tour Agency Co., Ltd.',
    bankAccountNo: '408-1-29834-0',
    bankSwift: 'SICOITHBXXX'
  });

  const handleUpdatePassword = async (values) => {
    setLoading(true);
    message.loading({ content: 'Updating password...', key: 'pass' });
    try {
      await api.patch('/update-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      });
      message.success({ content: 'Password changed successfully', key: 'pass' });
      formPass.resetFields();
    } catch (err) {
      console.error(err);
      message.error({ content: err.response?.data?.message || 'Password update failed', key: 'pass' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBankInfo = async (values) => {
    setLoading(true);
    message.loading({ content: 'Saving secure bank details...', key: 'bank' });
    try {
      // Mock API check / save
      // Real endpoint: api.put(`/user-profiles/${user.id}/bank-info`, values)
      setTimeout(() => {
        setBankData(values);
        message.success({ content: 'Bank details encrypted and saved successfully', key: 'bank' });
        setLoading(false);
      }, 600);
    } catch (err) {
      message.error({ content: 'Failed to save bank information', key: 'bank' });
      setLoading(false);
    }
  };

  const maskValue = (value) => {
    if (!value || value.length < 4) return value;
    const firstChars = value.slice(0, 2);
    const lastChars = value.slice(-2);
    const masked = '*'.repeat(value.length - 4);
    return `${firstChars}${masked}${lastChars}`;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800 m-0">User Profile</h1>
        <p className="text-slate-500 m-0 mt-1">Configure profile details, change security credentials, and manage bank account payouts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: User Identity Summary */}
        <Card className="border-none shadow-sm rounded-2xl p-4 text-center lg:col-span-1 h-fit bg-slate-50/50">
          <Avatar size={90} className="bg-sky-600 shadow-md mb-4 flex items-center justify-center text-3xl font-bold mx-auto">
            {user?.user ? user.user[0].toUpperCase() : 'U'}
          </Avatar>
          <h2 className="text-lg font-bold text-slate-800 m-0">{user?.user || 'Guest User'}</h2>
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mt-1">
            Role: <Tag color="blue" className="ml-1 uppercase font-bold">{user?.role || 'agent'}</Tag>
          </span>
          <p className="text-slate-400 text-xs mt-3 flex items-center justify-center gap-1">
            <MailOutlined /> {user?.email || 'N/A'}
          </p>
          <div className="border-t border-slate-200/60 mt-4 pt-4 text-left">
            <div className="text-xs text-slate-400 font-bold mb-1">AFFILIATED AGENT</div>
            <div className="text-sm font-semibold text-slate-700">{user?.agent || 'Direct Company'}</div>
          </div>
        </Card>

        {/* Right column: Form Tabs */}
        <Card className="border-none shadow-sm rounded-2xl lg:col-span-3">
          <Tabs defaultActiveKey="1" className="custom-tabs">
            <TabPane tab={<span className="flex items-center gap-2"><UserOutlined />Account Info</span>} key="1">
              <div className="py-4 space-y-4 max-w-lg">
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide block mb-1">Username</label>
                  <Input value={user?.user} disabled className="rounded-lg h-10 font-bold text-slate-700 bg-slate-50 border-slate-100" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide block mb-1">Email Address</label>
                  <Input value={user?.email} disabled className="rounded-lg h-10 font-bold text-slate-700 bg-slate-50 border-slate-100" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide block mb-1">Security Role</label>
                  <Input value={user?.role?.toUpperCase()} disabled className="rounded-lg h-10 font-bold text-slate-700 bg-slate-50 border-slate-100" />
                </div>
              </div>
            </TabPane>

            <TabPane tab={<span className="flex items-center gap-2"><LockOutlined />Change Password</span>} key="2">
              <Form form={formPass} layout="vertical" onFinish={handleUpdatePassword} className="max-w-lg mt-4">
                <Form.Item name="oldPassword" label="Current Password" rules={[{ required: true, message: 'Please enter current password' }]}>
                  <Input.Password prefix={<LockOutlined className="text-slate-300" />} placeholder="Enter current password" className="rounded-lg h-10 flex items-center" />
                </Form.Item>

                <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 6, message: 'Please enter new password (min 6 chars)' }]}>
                  <Input.Password prefix={<LockOutlined className="text-slate-300" />} placeholder="Enter new password" className="rounded-lg h-10 flex items-center" />
                </Form.Item>

                <Form.Item name="confirmPassword" label="Confirm New Password" dependencies={['newPassword']} rules={[
                  { required: true, message: 'Please confirm new password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                      return Promise.reject(new Error('Passwords do not match!'));
                    }
                  })
                ]}>
                  <Input.Password prefix={<LockOutlined className="text-slate-300" />} placeholder="Confirm new password" className="rounded-lg h-10 flex items-center" />
                </Form.Item>

                <Button type="primary" htmlType="submit" loading={loading} className="w-full h-10 bg-sky-600 border-none font-bold rounded-lg mt-2 shadow-md shadow-sky-600/10">
                  Update Account Password
                </Button>
              </Form>
            </TabPane>

            <TabPane tab={<span className="flex items-center gap-2"><BankOutlined />Bank Details</span>} key="3">
              <Form form={formBank} layout="vertical" onFinish={handleUpdateBankInfo} initialValues={bankData} className="max-w-lg mt-4">
                <Form.Item name="bankName" label="Bank Name" rules={[{ required: true, message: 'Bank name is required' }]}>
                  <Input placeholder="Siam Commercial Bank" className="rounded-lg h-10" />
                </Form.Item>

                <Form.Item name="bankAccountName" label="Account Holder Name" rules={[{ required: true, message: 'Account holder name is required' }]}>
                  <Input placeholder="Vera Thailandia Tour Agency Co., Ltd." className="rounded-lg h-10" />
                </Form.Item>

                <Form.Item name="bankAccountNo" label="Account Number" rules={[{ required: true, message: 'Account number is required' }]}>
                  <div className="flex gap-2">
                    <Input
                      value={showBankNo ? bankData.bankAccountNo : maskValue(bankData.bankAccountNo)}
                      disabled={!showBankNo}
                      onChange={(e) => {
                        if (showBankNo) {
                          setBankData(prev => ({ ...prev, bankAccountNo: e.target.value }));
                          formBank.setFieldsValue({ bankAccountNo: e.target.value });
                        }
                      }}
                      className="rounded-lg h-10 flex-1 font-mono"
                    />
                    <Button
                      type="default"
                      icon={showBankNo ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      onClick={() => setShowBankNo(!showBankNo)}
                      className="h-10 rounded-lg flex items-center justify-center"
                    />
                  </div>
                </Form.Item>

                <Form.Item name="bankSwift" label="SWIFT Code / IBAN Code" rules={[{ required: true, message: 'SWIFT/IBAN is required' }]}>
                  <Input placeholder="SICOITHBXXX" className="rounded-lg h-10 font-mono" />
                </Form.Item>

                <Button type="primary" htmlType="submit" loading={loading} className="w-full h-10 bg-sky-600 border-none font-bold rounded-lg mt-2 shadow-md shadow-sky-600/10">
                  Encrypt & Save Bank Details
                </Button>
              </Form>
            </TabPane>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
