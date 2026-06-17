import React, { useState } from 'react';
import { Card, Button, Upload, Space, Tag, Input, Form, message, Alert, Modal, Divider } from 'antd';
import { DownloadOutlined, UploadOutlined, ClearOutlined, DeleteOutlined, InfoCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import { Settings, FileSpreadsheet, RefreshCw, Trash2 } from 'lucide-react';
import api from '../services/api.js';

export default function Tools() {
  const [loading, setLoading] = useState(false);
  const [cleanupForm] = Form.useForm();

  // Downloads
  const downloadTemplate = async (type) => {
    message.loading({ content: `Generating ${type} template...`, key: 'download' });
    try {
      // Real API: api.get(`/${type}/import/template`)
      // Mocking download:
      setTimeout(() => {
        message.success({ content: `${type} template spreadsheet downloaded successfully`, key: 'download' });
      }, 800);
    } catch (e) {
      message.error({ content: 'Failed to download template', key: 'download' });
    }
  };

  // Upload handlers
  const handleUpload = (type, info) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (info.file.status === 'done') {
      message.success(`${info.file.name} imported successfully`);
      setLoading(false);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} import failed.`);
      setLoading(false);
    }
  };

  // Cleanup Database
  const triggerCleanup = async (values) => {
    Modal.confirm({
      title: 'Database Cleanup Confirmation',
      content: `Are you sure you want to permanently delete hotels created after date: ${values.date} or matching pattern "${values.pattern}"? This action is irreversible.`,
      okText: 'Clean Database',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setLoading(true);
        message.loading({ content: 'Executing database cleanup...', key: 'cleanup' });
        try {
          // Real SQL endpoints matching Go server:
          // api.delete('/hotels/cleanup/sql/by-pattern', { data: { pattern: values.pattern } })
          setTimeout(() => {
            message.success({ content: 'Cleanup successfully pruned matching database rows', key: 'cleanup' });
            setLoading(false);
            cleanupForm.resetFields();
          }, 1000);
        } catch (e) {
          message.error({ content: 'Cleanup failed to execute', key: 'cleanup' });
          setLoading(false);
        }
      }
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800 m-0">Tools</h1>
        <p className="text-slate-500 m-0 mt-1">Platform utilities for batch inventory spreadsheet imports, database maintenance, and SQL purging</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bulk Imports Card */}
        <Card title={<span className="font-bold text-slate-800 text-sm flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-sky-600" /> Excel Inventory Imports</span>} className="border-none shadow-sm rounded-2xl">
          <Alert
            message="Data Formatting Guideline"
            description="Use the structured template spreadsheets to import inventory items. Modifying headers will break column mapping during database parsing."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            className="mb-6 rounded-xl"
          />

          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-bold text-slate-700 m-0">Hotels Inventory</h4>
                <p className="text-slate-400 text-xs m-0 mt-0.5">Import new hotels and seasonal room rate contracts</p>
              </div>
              <Space>
                <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate('hotels')} className="rounded-lg">Template</Button>
                <Upload showUploadList={false} customRequest={({ onSuccess }) => setTimeout(() => onSuccess("ok"), 500)} onChange={(info) => handleUpload('hotels', info)}>
                  <Button type="primary" icon={<UploadOutlined />} className="bg-sky-600 border-none rounded-lg">Import</Button>
                </Upload>
              </Space>
            </div>

            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-bold text-slate-700 m-0">Tours Catalog</h4>
                <p className="text-slate-400 text-xs m-0 mt-0.5">Import tour codes, categories, and duration schedules</p>
              </div>
              <Space>
                <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate('tours')} className="rounded-lg">Template</Button>
                <Upload showUploadList={false} customRequest={({ onSuccess }) => setTimeout(() => onSuccess("ok"), 500)} onChange={(info) => handleUpload('tours', info)}>
                  <Button type="primary" icon={<UploadOutlined />} className="bg-sky-600 border-none rounded-lg">Import</Button>
                </Upload>
              </Space>
            </div>

            <div className="flex justify-between items-center pb-2">
              <div>
                <h4 className="font-bold text-slate-700 m-0">Excursions Catalog</h4>
                <p className="text-slate-400 text-xs m-0 mt-0.5">Import excursions, entrance tickets, and local tours</p>
              </div>
              <Space>
                <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate('excursions')} className="rounded-lg">Template</Button>
                <Upload showUploadList={false} customRequest={({ onSuccess }) => setTimeout(() => onSuccess("ok"), 500)} onChange={(info) => handleUpload('excursions', info)}>
                  <Button type="primary" icon={<UploadOutlined />} className="bg-sky-600 border-none rounded-lg">Import</Button>
                </Upload>
              </Space>
            </div>
          </div>
        </Card>

        {/* Database Maintenance */}
        <Card title={<span className="font-bold text-slate-800 text-sm flex items-center gap-2"><DatabaseOutlined className="text-sky-600" /> Database SQL Maintenance</span>} className="border-none shadow-sm rounded-2xl">
          <Form form={cleanupForm} layout="vertical" onFinish={triggerCleanup}>
            <Alert
              message="Dangerous Operations Area"
              description="These actions directly drop records matching conditions. Perform backup operations prior to executing purging tasks."
              type="warning"
              showIcon
              className="mb-6 rounded-xl"
            />

            <Form.Item name="pattern" label="Cleanup Pattern (Target Name containing...)" rules={[{ required: true, message: 'Please enter target query keyword' }]}>
              <Input placeholder="e.g. MOCK-TEST, DUMMY-HOTEL" className="rounded-lg h-10 font-mono" />
            </Form.Item>

            <Form.Item name="date" label="Purge created after date (YYYY-MM-DD)">
              <Input placeholder="2026-06-10" className="rounded-lg h-10 font-mono" />
            </Form.Item>

            <Button
              type="primary"
              danger
              htmlType="submit"
              icon={<Trash2 className="w-4 h-4 mr-2" />}
              loading={loading}
              className="w-full h-10 rounded-lg flex items-center justify-center font-bold bg-red-600 border-none"
            >
              Purge Database Records
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}
