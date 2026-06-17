import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => `_${Math.random().toString(36).slice(2, 9)}`;

const TABS = ['Flights', 'Transfers', 'Hotels', 'Excursions', 'Tours', 'Others'];
const TAB_COLORS = {
  Flights: '#4db6ac',
  Transfers: '#26a69a',
  Hotels: '#607d8b',
  Excursions: '#ff9800',
  Tours: '#4caf50',
  Others: '#424242',
};

export default function AddTrip() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── top fields ──────────────────────────────
  const [agentName, setAgentName] = useState('');
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState('');
  const [bookingDate, setBookingDate] = useState(today());
  const [tripStartDate, setTripStartDate] = useState('');

  // ── client info ─────────────────────────────
  const [clientName, setClientName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // ── booking details ──────────────────────────
  const [adults, setAdults] = useState('');
  const [children, setChildren] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [remarks, setRemarks] = useState('');

  // ── pricing ──────────────────────────────────
  const [totalPrice, setTotalPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [assistanceFee, setAssistanceFee] = useState(1000);
  const [includeAssistance, setIncludeAssistance] = useState(true);
  const [finalPrice, setFinalPrice] = useState('');

  // ── tab ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState('Excursions');

  // ── service items ─────────────────────────────
  const [flights, setFlights] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [excursions, setExcursions] = useState([]);
  const [tours, setTours] = useState([]);
  const [others, setOthers] = useState([]);

  // ── inventory lists ──────────────────────────
  const [hotelList, setHotelList] = useState([]);
  const [excursionList, setExcursionList] = useState([]);
  const [tourList, setTourList] = useState([]);
  const [transferList, setTransferList] = useState([]);
  const [otherList, setOtherList] = useState([]);
  const [supplierList, setSupplierList] = useState([]);
  const [currencyList, setCurrencyList] = useState([]);

  const [saving, setSaving] = useState(false);

  // ── load data ────────────────────────────────
  useEffect(() => {
    api.get('/agents').then(r => setAgents(r.data)).catch(() => {});
    api.get('/hotels').then(r => setHotelList(r.data)).catch(() => {});
    api.get('/excursions').then(r => setExcursionList(r.data)).catch(() => {});
    api.get('/tours').then(r => setTourList(r.data)).catch(() => {});
    api.get('/transfers').then(r => setTransferList(r.data)).catch(() => {});
    api.get('/suppliers').then(r => setSupplierList(r.data)).catch(() => {});
    api.get('/currencies').then(r => setCurrencyList(r.data)).catch(() => {});
    api.get('/others').then(r => setOtherList(r.data)).catch(() => {});

    // Pre-fill agent from logged-in user
    if (user?.agentId) setAgentId(String(user.agentId));
  }, [user]);

  useEffect(() => {
    // find agent name when agentId changes
    const found = agents.find(a => String(a.id) === String(agentId));
    if (found) setAgentName(found.name);
  }, [agentId, agents]);

  // ── auto-calc final price ────────────────────
  useEffect(() => {
    const tp = parseFloat(totalPrice) || 0;
    const disc = parseFloat(discount) || 0;
    const fee = includeAssistance ? (parseFloat(assistanceFee) || 0) : 0;
    setFinalPrice((tp - disc + fee).toFixed(2));
  }, [totalPrice, discount, assistanceFee, includeAssistance]);

  // ── row factories ────────────────────────────
  const newFlight = () => ({ _id: uid(), from_date: today(), to_date: today(), flight_number: '', in_or_out: 'IN', route: '', flight_airline: '', issued_by: '', edt: '', eat: '', price: '', currency_id: '', remarks: '' });
  const newTransfer = () => ({ _id: uid(), from_date: today(), to_date: today(), transfer_id: '', from_location: '', to_location: '', flight_number: '', tot: 'SIC', supplier_id: '', guide_name: '', guide_contact: '', price: '', currency_id: '', remarks: '' });
  const newHotel = () => ({ _id: uid(), from_date: today(), to_date: today(), hotel_id: '', city: '', hotel_name: '', nights: 1, room_type: '', single_price: '', double_price: '', extra_bed_price: '', total_price: '', remarks: '' });
  const newExcursion = () => ({ _id: uid(), from_date: today(), to_date: today(), excursion_id: '', city: '', toe: 'SIC', hotel: '', supplier_id: '', guide_name: '', guide_contact: '', pickup_time: '', price: '', currency_id: '', remarks: '' });
  const newTour = () => ({ _id: uid(), from_date: today(), to_date: today(), tour_id: '', from_location: '', to_location: '', number_of_adults: adults || 1, number_of_kids: children || 0, tot: 'SIC', supplier_id: '', guide_name: '', guide_contact: '', price: '', currency_id: '', remarks: '' });
  const newOther = () => ({ _id: uid(), from_date: today(), to_date: today(), other_id: '', price: '', remarks: '' });

  // ── generic row updater ──────────────────────
  const updateRow = (setter, id, field, val) =>
    setter(prev => prev.map(r => r._id === id ? { ...r, [field]: val } : r));
  const removeRow = (setter, id) =>
    setter(prev => prev.filter(r => r._id !== id));

  // ── submit ────────────────────────────────────
  const handleSubmit = async () => {
    if (!clientName.trim()) { message.error('Please enter client name'); return; }
    if (!mobileNumber.trim()) { message.error('Please enter mobile number'); return; }
    if (!adults) { message.error('Please enter number of adults'); return; }

    setSaving(true);
    try {
      const payload = {
        agent_id: agentId ? parseInt(agentId) : null,
        client_name: clientName,
        client_phone: mobileNumber,
        client_email: clientEmail,
        number_of_adults: parseInt(adults) || 0,
        number_of_kids: parseInt(children) || 0,
        booking_reference: bookingRef || null,
        remarks: remarks || null,
        total_amount: parseFloat(totalPrice) || 0,
        discount_amount: parseFloat(discount) || 0,
        final_amount: parseFloat(finalPrice) || 0,
        trip_start_date: tripStartDate || null,
        status: 'Pending',
        flight_items: flights.map(f => ({ ...f, price: parseFloat(f.price) || 0, currency_id: f.currency_id ? parseInt(f.currency_id) : null })),
        transfer_items: transfers.map(t => ({ ...t, price: parseFloat(t.price) || 0, transfer_id: t.transfer_id ? parseInt(t.transfer_id) : null, currency_id: t.currency_id ? parseInt(t.currency_id) : null })),
        hotel_items: hotels.map(h => ({ ...h, hotel_id: h.hotel_id ? parseInt(h.hotel_id) : null, nights: parseInt(h.nights) || 1, single_price: parseFloat(h.single_price) || 0, double_price: parseFloat(h.double_price) || 0, extra_bed_price: parseFloat(h.extra_bed_price) || 0, total_price: parseFloat(h.total_price) || 0 })),
        excursion_items: excursions.map(e => ({ ...e, excursion_id: e.excursion_id ? parseInt(e.excursion_id) : null, price: parseFloat(e.price) || 0, currency_id: e.currency_id ? parseInt(e.currency_id) : null })),
        tour_items: tours.map(t => ({ ...t, tour_id: t.tour_id ? parseInt(t.tour_id) : null, number_of_adults: parseInt(t.number_of_adults) || 0, number_of_kids: parseInt(t.number_of_kids) || 0, price: parseFloat(t.price) || 0 })),
        other_items: others.map(o => ({ ...o, other_id: o.other_id ? parseInt(o.other_id) : null })),
      };

      await api.post('/trips', payload);
      message.success('Quotation created successfully!');
      navigate('/quotation');
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // Shared styles
  // ─────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '6px 10px', border: '1px solid #ccc',
    borderRadius: 4, fontSize: 13, background: '#fff', boxSizing: 'border-box',
    outline: 'none',
  };
  const labelStyle = { fontSize: 12, color: '#555', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 };
  const sectionTitle = { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', borderBottom: '2px solid #eee', paddingBottom: 6, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 };
  const fieldGroup = { marginBottom: 12 };

  // ─────────────────────────────────────────────
  // Table helpers
  // ─────────────────────────────────────────────
  const thStyle = { background: '#1a1a2e', color: '#fff', padding: '8px 10px', fontSize: 12, fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '4px 4px', borderBottom: '1px solid #eee', verticalAlign: 'middle' };
  const addBtnStyle = {
    background: '#28a745', color: '#fff', border: 'none', padding: '6px 16px',
    borderRadius: 4, cursor: 'pointer', fontSize: 13, marginTop: 8
  };
  const delBtnStyle = {
    background: '#dc3545', color: '#fff', border: 'none', padding: '3px 8px',
    borderRadius: 3, cursor: 'pointer', fontSize: 12
  };

  const Select = ({ value, onChange, options, placeholder, style }) => (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, ...style }}>
      <option value="">{placeholder || '-- Select --'}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const Input = ({ value, onChange, placeholder, type = 'text', style, readOnly }) => (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} readOnly={readOnly}
      style={{ ...inputStyle, ...style, background: readOnly ? '#f5f5f5' : '#fff' }}
    />
  );

  // ─────────────────────────────────────────────
  // Tab content renderers
  // ─────────────────────────────────────────────

  // FLIGHTS
  const renderFlights = () => (
    <div>
      <h5 style={{ margin: '0 0 8px', color: '#333' }}>Flight Details</h5>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Date', 'Flight No.', 'In/Out', 'Route', 'Airline', 'EDT', 'EAT', 'Issued By', 'Price', 'Remarks', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flights.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 13 }}>No flights added yet</td></tr>
            )}
            {flights.map(row => (
              <tr key={row._id}>
                <td style={tdStyle}><input type="date" value={row.from_date} onChange={e => updateRow(setFlights, row._id, 'from_date', e.target.value)} style={{ ...inputStyle, width: 130 }} /></td>
                <td style={tdStyle}><Input value={row.flight_number} onChange={v => updateRow(setFlights, row._id, 'flight_number', v)} placeholder="TG123" style={{ width: 80 }} /></td>
                <td style={tdStyle}>
                  <select value={row.in_or_out} onChange={e => updateRow(setFlights, row._id, 'in_or_out', e.target.value)} style={{ ...inputStyle, width: 60 }}>
                    <option value="IN">IN</option><option value="OUT">OUT</option>
                  </select>
                </td>
                <td style={tdStyle}><Input value={row.route} onChange={v => updateRow(setFlights, row._id, 'route', v)} placeholder="BKK-CNX" style={{ width: 100 }} /></td>
                <td style={tdStyle}><Input value={row.flight_airline} onChange={v => updateRow(setFlights, row._id, 'flight_airline', v)} placeholder="Thai Airways" style={{ width: 110 }} /></td>
                <td style={tdStyle}><Input value={row.edt} onChange={v => updateRow(setFlights, row._id, 'edt', v)} placeholder="09:00" style={{ width: 70 }} /></td>
                <td style={tdStyle}><Input value={row.eat} onChange={v => updateRow(setFlights, row._id, 'eat', v)} placeholder="11:00" style={{ width: 70 }} /></td>
                <td style={tdStyle}><Input value={row.issued_by} onChange={v => updateRow(setFlights, row._id, 'issued_by', v)} placeholder="Staff" style={{ width: 90 }} /></td>
                <td style={tdStyle}><Input type="number" value={row.price} onChange={v => updateRow(setFlights, row._id, 'price', v)} placeholder="0" style={{ width: 80 }} /></td>
                <td style={tdStyle}><Input value={row.remarks} onChange={v => updateRow(setFlights, row._id, 'remarks', v)} placeholder="Remarks" style={{ width: 120 }} /></td>
                <td style={tdStyle}><button style={delBtnStyle} onClick={() => removeRow(setFlights, row._id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button style={addBtnStyle} onClick={() => setFlights(p => [...p, newFlight()])}>+ Add Flight</button>
    </div>
  );

  // TRANSFERS
  const renderTransfers = () => (
    <div>
      <h5 style={{ margin: '0 0 8px', color: '#333' }}>Transfer Details</h5>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Date', 'Transfer', 'From', 'To', 'Flight No.', 'ToE', 'Supplier', 'Price', 'Remarks', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 13 }}>No transfers added yet</td></tr>
            )}
            {transfers.map(row => (
              <tr key={row._id}>
                <td style={tdStyle}><input type="date" value={row.from_date} onChange={e => updateRow(setTransfers, row._id, 'from_date', e.target.value)} style={{ ...inputStyle, width: 130 }} /></td>
                <td style={tdStyle}>
                  <select value={row.transfer_id} onChange={e => {
                    const t = transferList.find(x => String(x.id) === e.target.value);
                    updateRow(setTransfers, row._id, 'transfer_id', e.target.value);
                    if (t) { updateRow(setTransfers, row._id, 'from_location', t.departure); updateRow(setTransfers, row._id, 'to_location', t.arrival); }
                  }} style={{ ...inputStyle, width: 160 }}>
                    <option value="">-- Select --</option>
                    {transferList.map(t => <option key={t.id} value={t.id}>{t.departure} → {t.arrival}</option>)}
                  </select>
                </td>
                <td style={tdStyle}><Input value={row.from_location} onChange={v => updateRow(setTransfers, row._id, 'from_location', v)} placeholder="Departure" style={{ width: 120 }} /></td>
                <td style={tdStyle}><Input value={row.to_location} onChange={v => updateRow(setTransfers, row._id, 'to_location', v)} placeholder="Arrival" style={{ width: 120 }} /></td>
                <td style={tdStyle}><Input value={row.flight_number} onChange={v => updateRow(setTransfers, row._id, 'flight_number', v)} placeholder="TG123" style={{ width: 80 }} /></td>
                <td style={tdStyle}>
                  <select value={row.tot} onChange={e => updateRow(setTransfers, row._id, 'tot', e.target.value)} style={{ ...inputStyle, width: 60 }}>
                    <option value="SIC">SIC</option><option value="PVT">PVT</option>
                  </select>
                </td>
                <td style={tdStyle}>
                  <select value={row.supplier_id} onChange={e => updateRow(setTransfers, row._id, 'supplier_id', e.target.value)} style={{ ...inputStyle, width: 120 }}>
                    <option value="">-- None --</option>
                    {supplierList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </td>
                <td style={tdStyle}><Input type="number" value={row.price} onChange={v => updateRow(setTransfers, row._id, 'price', v)} placeholder="0" style={{ width: 80 }} /></td>
                <td style={tdStyle}><Input value={row.remarks} onChange={v => updateRow(setTransfers, row._id, 'remarks', v)} placeholder="Remarks" style={{ width: 120 }} /></td>
                <td style={tdStyle}><button style={delBtnStyle} onClick={() => removeRow(setTransfers, row._id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button style={addBtnStyle} onClick={() => setTransfers(p => [...p, newTransfer()])}>+ Add Transfer</button>
    </div>
  );

  // HOTELS
  const renderHotels = () => (
    <div>
      <h5 style={{ margin: '0 0 8px', color: '#333' }}>Hotel Details</h5>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Check-In', 'Check-Out', 'Hotel', 'City', 'Room Type', 'Nights', 'Single', 'Double', 'Extra Bed', 'Total', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hotels.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 13 }}>No hotels added yet</td></tr>
            )}
            {hotels.map(row => (
              <tr key={row._id}>
                <td style={tdStyle}><input type="date" value={row.from_date} onChange={e => updateRow(setHotels, row._id, 'from_date', e.target.value)} style={{ ...inputStyle, width: 130 }} /></td>
                <td style={tdStyle}><input type="date" value={row.to_date} onChange={e => updateRow(setHotels, row._id, 'to_date', e.target.value)} style={{ ...inputStyle, width: 130 }} /></td>
                <td style={tdStyle}>
                  <select value={row.hotel_id} onChange={e => {
                    const h = hotelList.find(x => String(x.id) === e.target.value);
                    updateRow(setHotels, row._id, 'hotel_id', e.target.value);
                    if (h) { updateRow(setHotels, row._id, 'hotel_name', h.name); updateRow(setHotels, row._id, 'city', h.city); }
                  }} style={{ ...inputStyle, width: 180 }}>
                    <option value="">-- Select Hotel --</option>
                    {hotelList.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </td>
                <td style={tdStyle}><Input value={row.city} onChange={v => updateRow(setHotels, row._id, 'city', v)} placeholder="City" style={{ width: 90 }} /></td>
                <td style={tdStyle}><Input value={row.room_type} onChange={v => updateRow(setHotels, row._id, 'room_type', v)} placeholder="Deluxe" style={{ width: 100 }} /></td>
                <td style={tdStyle}><Input type="number" value={row.nights} onChange={v => updateRow(setHotels, row._id, 'nights', v)} style={{ width: 55 }} /></td>
                <td style={tdStyle}><Input type="number" value={row.single_price} onChange={v => updateRow(setHotels, row._id, 'single_price', v)} style={{ width: 75 }} /></td>
                <td style={tdStyle}><Input type="number" value={row.double_price} onChange={v => updateRow(setHotels, row._id, 'double_price', v)} style={{ width: 75 }} /></td>
                <td style={tdStyle}><Input type="number" value={row.extra_bed_price} onChange={v => updateRow(setHotels, row._id, 'extra_bed_price', v)} style={{ width: 75 }} /></td>
                <td style={tdStyle}><Input type="number" value={row.total_price} onChange={v => updateRow(setHotels, row._id, 'total_price', v)} style={{ width: 80 }} /></td>
                <td style={tdStyle}><button style={delBtnStyle} onClick={() => removeRow(setHotels, row._id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button style={addBtnStyle} onClick={() => setHotels(p => [...p, newHotel()])}>+ Add Hotel</button>
    </div>
  );

  // EXCURSIONS
  const renderExcursions = () => (
    <div>
      <h5 style={{ margin: '0 0 8px', color: '#333' }}>Excursion Details</h5>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Date', 'City', 'Name', 'PickUp', 'Hotel', 'Remarks', 'ToE', 'Price', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {excursions.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 13 }}>No excursions added yet</td></tr>
            )}
            {excursions.map(row => (
              <tr key={row._id}>
                <td style={tdStyle}><input type="date" value={row.from_date} onChange={e => updateRow(setExcursions, row._id, 'from_date', e.target.value)} style={{ ...inputStyle, width: 130 }} /></td>
                <td style={tdStyle}><Input value={row.city} onChange={v => updateRow(setExcursions, row._id, 'city', v)} placeholder="City" style={{ width: 90 }} /></td>
                <td style={tdStyle}>
                  <select value={row.excursion_id} onChange={e => {
                    const ex = excursionList.find(x => String(x.id) === e.target.value);
                    updateRow(setExcursions, row._id, 'excursion_id', e.target.value);
                    if (ex) updateRow(setExcursions, row._id, 'city', ex.city);
                  }} style={{ ...inputStyle, width: 180 }}>
                    <option value="">-- Select Excursion --</option>
                    {excursionList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </td>
                <td style={tdStyle}><Input value={row.pickup_time} onChange={v => updateRow(setExcursions, row._id, 'pickup_time', v)} placeholder="08:00" style={{ width: 75 }} /></td>
                <td style={tdStyle}><Input value={row.hotel} onChange={v => updateRow(setExcursions, row._id, 'hotel', v)} placeholder="Hotel name" style={{ width: 130 }} /></td>
                <td style={tdStyle}><Input value={row.remarks} onChange={v => updateRow(setExcursions, row._id, 'remarks', v)} placeholder="Remarks" style={{ width: 120 }} /></td>
                <td style={tdStyle}>
                  <select value={row.toe} onChange={e => updateRow(setExcursions, row._id, 'toe', e.target.value)} style={{ ...inputStyle, width: 60 }}>
                    <option value="SIC">SIC</option><option value="PVT">PVT</option>
                  </select>
                </td>
                <td style={tdStyle}><Input type="number" value={row.price} onChange={v => updateRow(setExcursions, row._id, 'price', v)} placeholder="0" style={{ width: 80 }} /></td>
                <td style={tdStyle}><button style={delBtnStyle} onClick={() => removeRow(setExcursions, row._id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button style={addBtnStyle} onClick={() => setExcursions(p => [...p, newExcursion()])}>+ Add Excursion</button>
    </div>
  );

  // TOURS
  const renderTours = () => (
    <div>
      <h5 style={{ margin: '0 0 8px', color: '#333' }}>Tour Details</h5>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Date From', 'Date To', 'Tour', 'From', 'To', 'Adults', 'Kids', 'ToE', 'Supplier', 'Price', 'Remarks', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tours.length === 0 && (
              <tr><td colSpan={12} style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 13 }}>No tours added yet</td></tr>
            )}
            {tours.map(row => (
              <tr key={row._id}>
                <td style={tdStyle}><input type="date" value={row.from_date} onChange={e => updateRow(setTours, row._id, 'from_date', e.target.value)} style={{ ...inputStyle, width: 130 }} /></td>
                <td style={tdStyle}><input type="date" value={row.to_date} onChange={e => updateRow(setTours, row._id, 'to_date', e.target.value)} style={{ ...inputStyle, width: 130 }} /></td>
                <td style={tdStyle}>
                  <select value={row.tour_id} onChange={e => updateRow(setTours, row._id, 'tour_id', e.target.value)} style={{ ...inputStyle, width: 160 }}>
                    <option value="">-- Select Tour --</option>
                    {tourList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </td>
                <td style={tdStyle}><Input value={row.from_location} onChange={v => updateRow(setTours, row._id, 'from_location', v)} placeholder="From" style={{ width: 100 }} /></td>
                <td style={tdStyle}><Input value={row.to_location} onChange={v => updateRow(setTours, row._id, 'to_location', v)} placeholder="To" style={{ width: 100 }} /></td>
                <td style={tdStyle}><Input type="number" value={row.number_of_adults} onChange={v => updateRow(setTours, row._id, 'number_of_adults', v)} style={{ width: 55 }} /></td>
                <td style={tdStyle}><Input type="number" value={row.number_of_kids} onChange={v => updateRow(setTours, row._id, 'number_of_kids', v)} style={{ width: 55 }} /></td>
                <td style={tdStyle}>
                  <select value={row.tot} onChange={e => updateRow(setTours, row._id, 'tot', e.target.value)} style={{ ...inputStyle, width: 60 }}>
                    <option value="SIC">SIC</option><option value="PVT">PVT</option>
                  </select>
                </td>
                <td style={tdStyle}>
                  <select value={row.supplier_id} onChange={e => updateRow(setTours, row._id, 'supplier_id', e.target.value)} style={{ ...inputStyle, width: 120 }}>
                    <option value="">-- None --</option>
                    {supplierList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </td>
                <td style={tdStyle}><Input type="number" value={row.price} onChange={v => updateRow(setTours, row._id, 'price', v)} placeholder="0" style={{ width: 80 }} /></td>
                <td style={tdStyle}><Input value={row.remarks} onChange={v => updateRow(setTours, row._id, 'remarks', v)} placeholder="Remarks" style={{ width: 120 }} /></td>
                <td style={tdStyle}><button style={delBtnStyle} onClick={() => removeRow(setTours, row._id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button style={addBtnStyle} onClick={() => setTours(p => [...p, newTour()])}>+ Add Tour</button>
    </div>
  );

  // OTHERS
  const renderOthers = () => (
    <div>
      <h5 style={{ margin: '0 0 8px', color: '#333' }}>Other Charges</h5>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Date', 'Description', 'Price', 'Remarks', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {others.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 13 }}>No other charges added yet</td></tr>
            )}
            {others.map(row => (
              <tr key={row._id}>
                <td style={tdStyle}><input type="date" value={row.from_date} onChange={e => updateRow(setOthers, row._id, 'from_date', e.target.value)} style={{ ...inputStyle, width: 130 }} /></td>
                <td style={tdStyle}>
                  <select value={row.other_id} onChange={e => updateRow(setOthers, row._id, 'other_id', e.target.value)} style={{ ...inputStyle, width: 220 }}>
                    <option value="">-- Select Charge --</option>
                    {otherList.map(o => <option key={o.id} value={o.id}>{o.description}</option>)}
                  </select>
                </td>
                <td style={tdStyle}><Input type="number" value={row.price} onChange={v => updateRow(setOthers, row._id, 'price', v)} placeholder="0" style={{ width: 90 }} /></td>
                <td style={tdStyle}><Input value={row.remarks} onChange={v => updateRow(setOthers, row._id, 'remarks', v)} placeholder="Remarks" style={{ width: 180 }} /></td>
                <td style={tdStyle}><button style={delBtnStyle} onClick={() => removeRow(setOthers, row._id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button style={addBtnStyle} onClick={() => setOthers(p => [...p, newOther()])}>+ Add Other</button>
    </div>
  );

  const tabRenderers = { Flights: renderFlights, Transfers: renderTransfers, Hotels: renderHotels, Excursions: renderExcursions, Tours: renderTours, Others: renderOthers };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: 13, color: '#333', maxWidth: 1200, margin: '0 auto', padding: '0 8px 40px' }}>

      {/* ── Top bar ── */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: '12px 16px', marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>👤</span> Agent Name *</div>
            <select value={agentId} onChange={e => setAgentId(e.target.value)} style={inputStyle}>
              <option value="">-- Select Agent --</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>📅</span> Booking Date *</div>
            <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} style={inputStyle} />
          </div>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>✈️</span> Trip Start Date *</div>
            <input type="date" value={tripStartDate} onChange={e => setTripStartDate(e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* ── Client Information ── */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: '14px 16px', marginBottom: 12 }}>
        <div style={sectionTitle}><span>👤</span> Client Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>👤</span> Client Name *</div>
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Enter client name" style={inputStyle} />
          </div>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>📞</span> Mobile Number *</div>
            <input value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} placeholder="Enter mobile number" style={inputStyle} />
          </div>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>✉️</span> Client Email ID</div>
            <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Client Email ID" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* ── Booking Details ── */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: '14px 16px', marginBottom: 12 }}>
        <div style={sectionTitle}><span>📋</span> Booking Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>🧑</span> Adults</div>
            <input type="number" min="0" value={adults} onChange={e => setAdults(e.target.value)} placeholder="Enter the number of adults" style={inputStyle} />
          </div>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>👦</span> Children</div>
            <input type="number" min="0" value={children} onChange={e => setChildren(e.target.value)} placeholder="Enter the number of children" style={inputStyle} />
          </div>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>#</span> Booking Reference</div>
            <input value={bookingRef} onChange={e => setBookingRef(e.target.value)} placeholder="Enter booking reference" style={inputStyle} />
          </div>
        </div>
        <div style={fieldGroup}>
          <div style={labelStyle}><span>💬</span> Remarks</div>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Enter remarks" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ color: '#d9534f', fontSize: 12, fontStyle: 'italic' }}>
          *NOTE: Every booking will incur an assistance fee.
        </div>
      </div>

      {/* ── Pricing Details ── */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: '14px 16px', marginBottom: 12 }}>
        <div style={sectionTitle}><span>💳</span> Pricing Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>💰</span> Total Price</div>
            <input type="number" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} style={inputStyle} />
          </div>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>💵</span> Final Price</div>
            <input type="number" value={finalPrice} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} />
          </div>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>✕</span> Discount</div>
            <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} style={inputStyle} />
          </div>
          <div style={fieldGroup}>
            <div style={labelStyle}><span>⬆</span> Assistance Fee Amount</div>
            <input type="number" value={assistanceFee} onChange={e => setAssistanceFee(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <input type="checkbox" id="includeAssist" checked={includeAssistance} onChange={e => setIncludeAssistance(e.target.checked)} style={{ width: 15, height: 15 }} />
          <label htmlFor="includeAssist" style={{ fontSize: 13, cursor: 'pointer' }}>Include Assistance Fee in Final Price</label>
        </div>
      </div>

      {/* ── Services Selection ── */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: '14px 16px', marginBottom: 12 }}>
        <div style={sectionTitle}><span>⚙️</span> Services Selection</div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', marginBottom: 16, gap: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '10px 6px',
                background: activeTab === tab ? TAB_COLORS[tab] : '#e9e9e9',
                color: activeTab === tab ? '#fff' : '#555',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 700 : 400,
                fontSize: 13,
                borderRight: '1px solid rgba(255,255,255,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'Flights' && '✈ '}
              {tab === 'Transfers' && '🚌 '}
              {tab === 'Hotels' && '🏨 '}
              {tab === 'Excursions' && '🎭 '}
              {tab === 'Tours' && '🗺 '}
              {tab === 'Others' && '+ '}
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 4, padding: 14 }}>
          {tabRenderers[activeTab]?.()}
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '0 4px' }}>
        <button
          onClick={() => navigate('/quotation')}
          style={{ padding: '8px 24px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{ padding: '8px 28px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving...' : 'Save Quotation'}
        </button>
      </div>
    </div>
  );
}
