const API_URL = '/api';

export const submitBooking = async (bookingData) => {
  const response = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit booking');
  }
  return data;
};

export const fetchBookings = async (credentials) => {
  const headers = new Headers();
  if (credentials) {
    headers.set('Authorization', 'Basic ' + btoa(`${credentials.username}:${credentials.password}`));
  }

  const response = await fetch(`${API_URL}/bookings`, { headers });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch bookings');
  }
  return data;
};

export const updateBookingStatus = async (id, status, credentials) => {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  
  if (credentials) {
    headers.set('Authorization', 'Basic ' + btoa(`${credentials.username}:${credentials.password}`));
  }

  const response = await fetch(`${API_URL}/bookings/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update booking');
  }
  return data;
};

export const getOperatingHours = async () => {
  const response = await fetch(`${API_URL}/hours`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch hours');
  return data;
};

export const updateStandardHours = async (hoursData, credentials) => {
  const response = await fetch(`${API_URL}/hours/standard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${credentials.username}:${credentials.password}`)
    },
    body: JSON.stringify(hoursData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update standard hours');
  return data;
};

export const updateSpecialHours = async (specialData, credentials) => {
  const response = await fetch(`${API_URL}/hours/special`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${credentials.username}:${credentials.password}`)
    },
    body: JSON.stringify(specialData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update special hours');
  return data;
};

export const deleteSpecialHours = async (dateStr, credentials) => {
  const response = await fetch(`${API_URL}/hours/special/${dateStr}`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Basic ' + btoa(`${credentials.username}:${credentials.password}`)
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete special hours');
  return data;
};
