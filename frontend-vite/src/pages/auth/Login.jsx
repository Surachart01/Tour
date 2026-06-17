import React, { useState } from 'react';
import { Form, Input, Button, Alert, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setError('');
    setLoading(true);
    try {
      await login(values.username, values.password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        err.response?.data || 
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-sky-900 to-indigo-900 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-400/20 via-transparent to-transparent pointer-events-none" />
      
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border-none p-4 relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl -mr-6 -mt-6" />

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-sky-600/30 mx-auto mb-3">
            VT
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight font-sans m-0">
            VeraThailandia!
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1.5">
            Sign in to manage your tours and bookings
          </p>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError('')}
            className="mb-6 rounded-lg font-medium"
          />
        )}

        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="username"
            label={<span className="font-semibold text-slate-700 text-sm">Username</span>}
            rules={[{ required: true, message: 'Please enter your username' }]}
            className="mb-4"
          >
            <Input
              prefix={<UserOutlined className="text-slate-400" />}
              placeholder="Username"
              className="rounded-lg border-slate-200 hover:border-sky-500 focus:border-sky-500 shadow-sm transition-all"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="font-semibold text-slate-700 text-sm">Password</span>}
            rules={[{ required: true, message: 'Please enter your password' }]}
            className="mb-6"
          >
            <Input.Password
              prefix={<LockOutlined className="text-slate-400" />}
              placeholder="Password"
              className="rounded-lg border-slate-200 hover:border-sky-500 focus:border-sky-500 shadow-sm transition-all"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700 border-none font-bold rounded-lg shadow-md shadow-sky-600/20 py-2.5 flex items-center justify-center transition-all"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
