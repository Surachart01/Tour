import React, { useState, useEffect } from 'react';
import { Table, Card, Form, Input, Button, Select, Space, Tag, Drawer, message, Popconfirm, Checkbox, Switch } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import { Users as UsersIcon, Shield, Mail, Key } from 'lucide-react';
import api from '../services/api.js';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchForm] = Form.useForm();
  
  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Add User');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [form] = Form.useForm();

  // Mock data fallbacks for users if API fails
  const mockUsers = [
    {
      id: 1,
      username: 'superadmin',
      email: 'admin@gmail.com',
      role: 'superadmin',
      userType: 'superadmin',
      isSuperAdmin: true,
      canCreateUsers: false,
      canViewAnalytics: true,
      agent: { id: 1, name: 'Vera Thailandia Online' }
    },
    {
      id: 2,
      username: 'agentadmin',
      email: 'agent@gmail.com',
      role: 'admin',
      userType: 'admin',
      isSuperAdmin: false,
      canCreateUsers: true,
      canViewAnalytics: true,
      agent: { id: 1, name: 'Vera Thailandia Online' }
    }
  ];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/');
      if (response.data && response.data.length > 0) {
        setUsers(response.data);
      } else {
        setUsers(mockUsers);
      }
    } catch (err) {
      console.warn('API error listing users, using mock/db fallback:', err);
      // Let's attempt to use user list, if it fails, fallback to local mock
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentsList = async () => {
    try {
      const response = await api.get('/agents/');
      if (response.data && response.data.length > 0) {
        setAgents(response.data);
      } else {
        setAgents([{ id: 1, name: 'Vera Thailandia Online' }]);
      }
    } catch (err) {
      setAgents([{ id: 1, name: 'Vera Thailandia Online' }]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAgentsList();
  }, []);

  const handleSearch = (values) => {
    setLoading(true);
    setTimeout(() => {
      let filtered = [...mockUsers];
      if (values.role) {
        filtered = filtered.filter(u => u.role === values.role);
      }
      if (values.keyword) {
        const kw = values.keyword.toLowerCase();
        filtered = filtered.filter(u => u.username.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw));
      }
      setUsers(filtered);
      setLoading(false);
    }, 300);
  };

  const handleOpenDrawer = (record = null) => {
    if (record) {
      setDrawerTitle('Edit User');
      setCurrentUserId(record.id);
      form.setFieldsValue({
        username: record.username,
        email: record.email,
        role: record.role,
        agentId: record.agentId || (record.agent ? record.agent.id : 1),
        canCreateUsers: record.canCreateUsers,
        canViewAnalytics: record.canViewAnalytics,
      });
    } else {
      setDrawerTitle('Add User');
      setCurrentUserId(null);
      form.resetFields();
      form.setFieldsValue({
        role: 'user',
        agentId: 1,
        canCreateUsers: false,
        canViewAnalytics: true,
      });
    }
    setDrawerVisible(true);
  };

  const handleSaveUser = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        // Match expected structure of User table
        user_type: values.role === 'superadmin' ? 'superadmin' : values.role === 'admin' ? 'admin' : 'agent',
        is_superadmin: values.role === 'superadmin',
        is_primary_admin: values.role === 'admin',
        agent_id: values.agentId,
      };

      if (currentUserId) {
        // Edit User
        message.loading({ content: 'Saving...', key: 'usersave' });
        try {
          await api.put(`/users/${currentUserId}`, payload);
          message.success({ content: 'User updated successfully', key: 'usersave' });
          fetchUsers();
        } catch (e) {
          message.error({ content: e.response?.data?.message || 'Failed to update user', key: 'usersave' });
        }
      } else {
        // Create User
        if (!values.password) {
          message.error('Password is required when creating a new user.');
          return;
        }
        message.loading({ content: 'Creating...', key: 'usersave' });
        try {
          await api.post('/users', payload);
          message.success({ content: 'User created successfully', key: 'usersave' });
          fetchUsers();
        } catch (e) {
          message.error({ content: e.response?.data?.message || 'Failed to create user', key: 'usersave' });
        }
      }

      setDrawerVisible(false);
    } catch (err) {
      message.error('Please fix form validation errors.');
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      message.success('User deleted successfully');
      fetchUsers();
    } catch (e) {
      message.error(e.response?.data?.message || 'Failed to delete user');
    }
  };

  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (text) => (
        <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
          <UserOutlined className="text-sky-600" /> {text}
        </span>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => (
        <span className="text-slate-500 text-sm flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-slate-400" /> {text}
        </span>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        let color = 'blue';
        if (role === 'superadmin') color = 'volcano';
        if (role === 'admin') color = 'green';
        return <Tag color={color} className="uppercase font-semibold">{role}</Tag>;
      }
    },
    {
      title: 'Affiliated Agent',
      key: 'agent',
      render: (_, record) => {
        const agentName = record.agent?.name || agents.find(a => a.id === record.agentId)?.name || 'Direct';
        return <span className="text-slate-600 text-sm font-semibold">{agentName}</span>;
      }
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_, record) => (
        <Space size={4}>
          {record.canCreateUsers && <Tag color="cyan">User Create</Tag>}
          {record.canViewAnalytics && <Tag color="purple">Analytics View</Tag>}
        </Space>
      )
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
            title="Are you sure you want to delete this user account?"
            onConfirm={() => handleDeleteUser(record.id)}
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
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Users</h1>
          <p className="text-slate-500 m-0 mt-1">Manage platform logins, roles, custom permission flags, and organizational affiliations</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenDrawer()}
          className="bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg flex items-center"
        >
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm rounded-2xl mb-6 bg-slate-50/40">
        <Form
          form={searchForm}
          layout="vertical"
          onFinish={handleSearch}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Form.Item name="role" label="User Role" className="mb-0">
            <Select placeholder="All roles" allowClear className="rounded-lg shadow-sm">
              <Select.Option value="superadmin">Superadmin</Select.Option>
              <Select.Option value="admin">Admin</Select.Option>
              <Select.Option value="user">User</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="keyword" label="Search Keyword" className="mb-0">
            <Input placeholder="Enter username or email..." className="rounded-lg shadow-sm" />
          </Form.Item>

          <Form.Item label="&nbsp;" className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              className="w-full bg-sky-600 border-none shadow-md shadow-sky-600/10 rounded-lg"
            >
              Search Users
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Table list */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} user accounts` }}
          className="border border-slate-100 rounded-xl overflow-hidden shadow-inner"
        />
      </Card>

      {/* Add/Edit Drawer */}
      <Drawer
        title={<span className="font-bold text-slate-800 text-lg flex items-center gap-2"><UsersIcon className="w-5 h-5 text-sky-600" /> {drawerTitle}</span>}
        width={500}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)} className="rounded-lg">Cancel</Button>
            <Button type="primary" onClick={handleSaveUser} className="bg-sky-600 border-none rounded-lg shadow-md shadow-sky-600/10">Save User</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" className="grid grid-cols-1 gap-4 mt-2">
          <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Please enter username' }]}>
            <Input placeholder="superadmin" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email', message: 'Please enter valid email' }]}>
            <Input placeholder="user@gmail.com" className="rounded-lg h-10" />
          </Form.Item>

          {!currentUserId && (
            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter password' }]}>
              <Input.Password placeholder="••••••••" className="rounded-lg h-10 flex items-center" />
            </Form.Item>
          )}

          <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Please select user role' }]}>
            <Select placeholder="Select role" className="rounded-lg h-10">
              <Select.Option value="superadmin">Superadmin</Select.Option>
              <Select.Option value="admin">Admin / Agency Manager</Select.Option>
              <Select.Option value="user">User / Travel Agent Staff</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="agentId" label="Agent Association" rules={[{ required: true, message: 'Please select agent' }]}>
            <Select placeholder="Select agent association" className="rounded-lg h-10">
              {agents.map(a => <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>)}
            </Select>
          </Form.Item>

          <div className="border-t border-slate-100 pt-4 mt-2">
            <h4 className="text-slate-800 font-bold text-sm mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-600" /> Permission Access Flags
            </h4>
            <div className="flex flex-col gap-4">
              <Form.Item name="canCreateUsers" label="Can Create Sub-Users" valuePropName="checked" className="mb-0">
                <Switch />
              </Form.Item>

              <Form.Item name="canViewAnalytics" label="Can View Dashboard Analytics" valuePropName="checked" className="mb-0">
                <Switch />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}
