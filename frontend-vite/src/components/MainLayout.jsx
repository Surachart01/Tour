import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, theme, Divider } from 'antd';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import {
  Home,
  Settings,
  BookOpen,
  CreditCard,
  Compass,
  BarChart3,
  Calendar,
  Briefcase,
  Layers,
  MapPin,
  ShieldAlert,
  Percent,
  PlusCircle,
  Eye,
  LogOut,
  Bell,
  History,
  HelpCircle
} from 'lucide-react';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = theme.useToken();

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return <span className="text-slate-700 font-bold text-sm">Dashboard / Home</span>;
    const cleanPath = path.substring(1);
    const formatted = cleanPath.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    // Check if in control panel
    const controlPanelPaths = [
      'activities', 'agents', 'bookings', 'excursions', 'hotels',
      'markups', 'other-charges', 'stop-sales', 'suppliers',
      'tools', 'tours', 'transfers', 'users'
    ];
    if (controlPanelPaths.includes(cleanPath)) {
      return (
        <span className="text-slate-400 text-xs font-medium flex items-center">
          Control Panel <span className="mx-2 text-slate-300">/</span> <span className="text-sky-600 font-bold text-sm">{formatted}</span>
        </span>
      );
    }
    return <span className="text-sky-600 font-bold text-sm">{formatted}</span>;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/',
      icon: <Home className="w-4 h-4" />,
      label: <Link to="/">Home</Link>,
    },
    {
      key: 'control-panel',
      icon: <Settings className="w-4 h-4" />,
      label: 'Control-Panel',
      children: [
        { key: '/activities', label: <Link to="/activities">Activities</Link> },
        { key: '/agents', label: <Link to="/agents">Agents</Link> },
        { key: '/bookings', label: <Link to="/bookings">Bookings</Link> },
        { key: '/excursions', label: <Link to="/excursions">Excursions</Link> },
        { key: '/hotels', label: <Link to="/hotels">Hotels</Link> },
        { key: '/markups', label: <Link to="/markups">Markups</Link> },
        { key: '/other-charges', label: <Link to="/other-charges">Other Charges</Link> },
        { key: '/stop-sales', label: <Link to="/stop-sales">Stop Sale</Link> },
        { key: '/suppliers', label: <Link to="/suppliers">Suppliers</Link> },
        { key: '/tools', label: <Link to="/tools">Tools</Link> },
        { key: '/tours', label: <Link to="/tours">Tours</Link> },
        { key: '/transfers', label: <Link to="/transfers">Transfers</Link> },
        { key: '/users', label: <Link to="/users">Users</Link> },
      ],
    },
    {
      key: '/quotation',
      icon: <BookOpen className="w-4 h-4" />,
      label: <Link to="/quotation">Quotation</Link>,
    },
    {
      key: '/payment',
      icon: <CreditCard className="w-4 h-4" />,
      label: <Link to="/payment">Payment</Link>,
    },
    {
      key: '/itinerary',
      icon: <Compass className="w-4 h-4" />,
      label: <Link to="/itinerary">Itinerary</Link>,
    },
    {
      key: '/analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      label: <Link to="/analytics">Analytics</Link>,
    },
  ];

  // Helper to find parent keys to keep menu open on load
  const getOpenKeys = () => {
    const path = location.pathname;
    if ([
      '/activities', '/agents', '/bookings', '/excursions', '/hotels',
      '/markups', '/other-charges', '/stop-sales', '/suppliers',
      '/tools', '/tours', '/transfers', '/users'
    ].includes(path)) {
      return ['control-panel'];
    }
    return [];
  };

  const profileMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <span onClick={() => navigate('/profile')}>Profile</span>,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined className="text-red-500" />,
      danger: true,
      label: <span onClick={handleLogout}>Log Out</span>,
    },
  ];

  return (
    <Layout className="min-h-screen">
      {/* Sidebar Navigation */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        theme="light"
        className="shadow-md border-r border-slate-100 sticky top-0 left-0 h-screen overflow-y-auto"
      >
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center justify-center border-b border-slate-100 bg-white px-4">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <span className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              VT
            </span>
            {!collapsed && (
              <span className="font-extrabold text-lg text-slate-800 tracking-wide font-sans animate-fade-in">
                VeraThailandia!
              </span>
            )}
          </Link>
        </div>

        {/* Profile Card Summary */}
        {!collapsed && user && (
          <div className="p-4 mx-3 my-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <Avatar size={40} className="bg-sky-600 flex-shrink-0">
              {user.user ? user.user[0].toUpperCase() : 'U'}
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate m-0 leading-tight">
                {user.user || 'Welcome'}
              </p>
              <span className="text-xs text-slate-500 font-medium capitalize truncate block mt-0.5">
                {user.role || 'Agent'} ({user.agent || 'Direct'})
              </span>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          defaultSelectedKeys={[location.pathname]}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          className="border-none mt-2 px-2"
          style={{ fontSize: '14px' }}
        />
      </Sider>

      {/* Main Workspace Frame */}
      <Layout>
        {/* Header toolbar */}
        <Header
          style={{ background: '#ffffff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          className="border-b border-slate-100 shadow-sm sticky top-0 z-50 h-16"
        >
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-sky-600 hover:bg-slate-50 rounded-lg transition-colors"
            />
            <div className="hidden md:block">
              {getBreadcrumb()}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Quick Actions */}
            <div className="flex items-center gap-4">
              <Dropdown
                dropdownRender={() => (
                  <Card className="shadow-lg border-slate-100 p-2" size="small">
                    <p className="font-bold text-xs text-slate-400 m-0 uppercase tracking-wider mb-2">Notifications</p>
                    <div className="text-slate-500 text-xs py-2 px-1">No unread notifications</div>
                  </Card>
                )}
                placement="bottomRight"
                trigger={['click']}
              >
                <div className="relative cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center">
                  <Bell className="w-5 h-5 text-slate-400 hover:text-sky-600 transition-colors" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                </div>
              </Dropdown>

              <div
                className="cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center"
                onClick={() => navigate('/activities')}
                title="Activity logs"
              >
                <History className="w-5 h-5 text-slate-400 hover:text-sky-600 transition-colors" />
              </div>
            </div>

            <Divider type="vertical" className="h-6 border-slate-200 m-0" />

            <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight" arrow>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                <Avatar icon={<UserOutlined />} className="bg-slate-200 text-slate-600 shadow-inner flex items-center justify-center" />
                <span className="hidden sm:inline font-bold text-slate-700 text-sm">
                  {user?.user}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content canvas */}
        <Content className="m-6 p-6 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-y-auto">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
