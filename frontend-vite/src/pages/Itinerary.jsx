import React, { useState } from 'react';
import { Table, Card, Button, Tag, Space, Divider, message, Timeline } from 'antd';
import { DownloadOutlined, MailOutlined, FilePdfOutlined, EyeOutlined } from '@ant-design/icons';
import { Compass, Calendar, ArrowRight, User } from 'lucide-react';

export default function Itinerary() {
  const [itineraries, setItineraries] = useState([
    {
      id: 1,
      bookingRef: 'BK-2026-8809',
      clientName: 'Marco Rossi',
      agent: 'Vera Thailandia Online',
      title: 'Family Summer Trip in Bangkok & Phuket',
      paxCount: '4 Adults, 2 Children',
      duration: '4 Days / 3 Nights',
      schedule: [
        { day: 1, title: 'Arrival & Hotel Check-in', desc: 'Transfer from Suvarnabhumi Airport to Mandarin Oriental Bangkok in Deluxe Sedan. Welcome drinks and check-in.' },
        { day: 2, title: 'Bangkok Culinary Workshop', desc: 'Thai Cooking Class & market tour with Siam Cooking Academy. Afternoon at leisure for shopping.' },
        { day: 3, title: 'Phuket Transit & Boat Tour', desc: 'Morning transfer to Airport, flight to Phuket (self-arranged). Speedboat transfer to Phi Phi Island with Phuket Marine Tours.' },
        { day: 4, title: 'Departure Transfer', desc: 'Transfer from Phuket Resort to Phuket International Airport for flight departure.' }
      ]
    },
    {
      id: 2,
      bookingRef: 'BK-2026-9041',
      clientName: 'Jean Dupont',
      agent: 'B2B Travel Partner Europe',
      title: 'Bangkok Culture & Luxury Honeymoon',
      paxCount: '2 Adults',
      duration: '6 Days / 5 Nights',
      schedule: [
        { day: 1, title: 'Arrival & Leisure', desc: 'Private transfer from BKK Airport to The Slate Phuket. Check-in Pearl Bed Suite.' }
      ]
    }
  ]);

  const [activeItinerary, setActiveItinerary] = useState(itineraries[0]);

  const triggerPDF = (type, record) => {
    message.loading({ content: `Compiling ${type} PDF document...`, key: 'pdf' });
    setTimeout(() => {
      message.success({ content: `${type} PDF for booking ${record.bookingRef} downloaded successfully`, key: 'pdf' });
    }, 800);
  };

  const triggerEmail = (record) => {
    message.loading({ content: 'Sending itinerary to client email...', key: 'email' });
    setTimeout(() => {
      message.success({ content: `Itinerary successfully emailed to agent ${record.agent} for forwarding`, key: 'email' });
    }, 800);
  };

  const columns = [
    {
      title: 'Booking Ref',
      dataIndex: 'bookingRef',
      key: 'bookingRef',
      render: (text) => <Tag color="blue" className="font-mono font-bold">{text}</Tag>
    },
    {
      title: 'Itinerary Client',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div>
          <span className="font-bold text-slate-800 text-sm block">{text}</span>
          <span className="text-slate-400 text-xs mt-0.5">Guest: {record.clientName} | Pax: {record.paxCount}</span>
        </div>
      )
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (text) => <Tag color="purple">{text}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined className="text-sky-600" />}
            onClick={() => setActiveItinerary(record)}
          />
          <Button
            type="text"
            icon={<FilePdfOutlined className="text-emerald-600" />}
            onClick={() => triggerPDF('Client Itinerary', record)}
            title="Download Client Itinerary PDF"
          />
          <Button
            type="text"
            icon={<DownloadOutlined className="text-indigo-600" />}
            onClick={() => triggerPDF('Service Vouchers', record)}
            title="Download Supplier Vouchers"
          />
          <Button
            type="text"
            icon={<MailOutlined className="text-orange-600" />}
            onClick={() => triggerEmail(record)}
            title="Email Itinerary to Agent"
          />
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800 m-0">Itinerary</h1>
        <p className="text-slate-500 m-0 mt-1">Export high-fidelity travel documents, compile customer timelines, and print supplier service vouchers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Table List */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden lg:col-span-3">
          <Table dataSource={itineraries} columns={columns} rowKey="id" pagination={false} className="border border-slate-100 rounded-xl overflow-hidden shadow-inner" />
        </Card>

        {/* Live Timeline Preview */}
        <Card title={<span className="font-bold text-slate-800 text-sm flex items-center gap-2"><Compass className="w-5 h-5 text-sky-600" /> Interactive Schedule View</span>} className="border-none shadow-sm rounded-2xl lg:col-span-2">
          {activeItinerary ? (
            <div>
              <div className="mb-4">
                <h4 className="font-extrabold text-slate-800 text-sm m-0">{activeItinerary.title}</h4>
                <div className="text-slate-400 text-xs mt-1">Booking: <span className="font-mono font-bold text-sky-600">{activeItinerary.bookingRef}</span> | {activeItinerary.duration}</div>
              </div>
              <Divider className="my-4 border-slate-100" />
              <Timeline mode="left">
                {activeItinerary.schedule.map((day) => (
                  <Timeline.Item key={day.day} label={<span className="font-mono font-extrabold text-xs text-sky-600">DAY {day.day}</span>}>
                    <div className="font-bold text-slate-700 text-xs">{day.title}</div>
                    <div className="text-xs text-slate-400 mt-1 leading-relaxed">{day.desc}</div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>
          ) : (
            <div className="text-slate-400 text-center py-12 italic">Select an itinerary from the list to preview details</div>
          )}
        </Card>
      </div>
    </div>
  );
}
