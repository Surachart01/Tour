# Leads Status Endpoint Update Summary

## Overview
Updated the leads management system to use the backend's dedicated `/status` endpoint for status updates instead of manually calling the convert endpoint. The backend automatically handles lead-to-quotation conversion when the status is set to "Approved".

## Changes Made

### 1. Individual Lead Approval (lines 1603-1626)
**Before:**
```javascript
// First update status to approved
await apiCall(`/proposals/${id}`, 'PUT', { status: 'approved' });

// Then convert to quotation
const quotation = await apiCall(`/proposals/${id}/convert`, 'POST');

// Optionally redirect to the new quotation
if (confirm('Would you like to view the new quotation?')) {
  window.location.href = `edit_trip.html?id=${quotation.id}`;
}
```

**After:**
```javascript
// Update status to approved using the status endpoint
// The backend will automatically convert to quotation when status is "Approved"
await apiCall(`/proposals/${id}/status`, 'PUT', { status: 'Approved' });

showNotification('Lead approved and will be converted to quotation!', 'success');

// Refresh the list after a short delay to allow backend processing
setTimeout(() => {
  loadLeads();
  loadStats();
}, 1000);
```

### 2. Lead Group Approval (lines 1835-1858)
**Before:**
```javascript
// First update the group status to approved
await apiCall(`/group-proposals/${groupId}`, 'PUT', { status: 'approved' });

// Then update the selected lead status to approved
await apiCall(`/proposals/${selectedLeadId}`, 'PUT', { status: 'approved' });

// Convert the selected lead to quotation
const quotation = await apiCall(`/proposals/${selectedLeadId}/convert`, 'POST');

// Update other leads in the group to 'ignore' status
for (const lead of groupDetails.leads) {
  if (lead.id != selectedLeadId) {
    await apiCall(`/proposals/${lead.id}`, 'PUT', { status: 'ignore' });
  }
}

// Optionally redirect to the new quotation
if (confirm('Would you like to view the new quotation?')) {
  window.location.href = `edit_trip.html?id=${quotation.id}`;
}
```

**After:**
```javascript
// First update the group status to approved
await apiCall(`/group-proposals/${groupId}/status`, 'PUT', { status: 'Approved' });

// Then update the selected lead status to approved using the status endpoint
// The backend will automatically convert to quotation when status is "Approved"
await apiCall(`/proposals/${selectedLeadId}/status`, 'PUT', { status: 'Approved' });

// Update other leads in the group to 'ignore' status
for (const lead of groupDetails.leads) {
  if (lead.id != selectedLeadId) {
    await apiCall(`/proposals/${lead.id}/status`, 'PUT', { status: 'Ignore' });
  }
}

$('#leadGroupApprovalModal').modal('hide');
showNotification('Lead option approved and will be converted to quotation!', 'success');

// Reload both lists after a short delay to allow backend processing
setTimeout(() => {
  loadLeads();
  loadLeadGroups();
  loadStats();
}, 1000);
```

### 3. General Status Updates (lines 1649-1654)
**Before:**
```javascript
// Update status via API
const endpoint = type === 'lead' ? `/proposals/${id}` : `/group-proposals/${id}`;
const updateData = { status: newStatus };

await apiCall(endpoint, 'PUT', updateData);
```

**After:**
```javascript
// Update status via API using the status endpoint
const endpoint = type === 'lead' ? `/proposals/${id}/status` : `/group-proposals/${id}/status`;
// Capitalize the status value to match backend expectations
const capitalizedStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
const updateData = { status: capitalizedStatus };

await apiCall(endpoint, 'PUT', updateData);
```

## Key Changes Summary

1. **API Endpoint Changes:**
   - Changed from `/proposals/{id}` to `/proposals/{id}/status` for lead status updates
   - Changed from `/group-proposals/{id}` to `/group-proposals/{id}/status` for group status updates
   - Removed manual calls to `/proposals/{id}/convert` endpoint

2. **Status Value Format:**
   - Changed status values from lowercase to capitalized format (e.g., 'approved' → 'Approved', 'ignore' → 'Ignore')
   - This matches the backend API specification

3. **User Experience Changes:**
   - Removed the immediate redirect to quotation after approval (since we don't get the quotation ID immediately)
   - Added a 1-second delay before refreshing lists to allow backend processing
   - Updated success messages to indicate that conversion will happen automatically

4. **Backend Behavior:**
   - The backend now automatically converts leads to quotations when status is set to "Approved"
   - No need for separate conversion API calls
   - The conversion happens asynchronously on the backend

## Testing Recommendations

1. Test individual lead approval and verify automatic conversion to quotation
2. Test lead group approval with option selection
3. Test other status changes (Cancel, Ignore) to ensure they work correctly
4. Verify that the status badges update correctly after changes
5. Check that the leads list refreshes properly after status updates
6. Confirm that approved leads cannot be deleted (existing protection should still work)

## Backend API Reference

The status update endpoint expects:
```
PUT /api/v1/proposals/{id}/status
{
  "status": "Approved" | "Cancel" | "Ignore" | "Pending"
}
```

When status is set to "Approved", the backend automatically:
1. Updates the lead status
2. Converts the lead to a quotation
3. Updates related fields (converted_to_quotation, etc.)