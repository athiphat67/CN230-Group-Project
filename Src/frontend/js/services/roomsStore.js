/**
 * roomsStore.js
 * Shared room data source of truth for admin pages.
 */
(function setupRoomsStore() {
  function normalizeRooms(rows) {
    return (rows || []).map(room => ({
      room_id: room.room_id ?? room.roomid,
      room_number: room.room_number ?? room.roomnumber,
      room_type: room.room_type ?? room.roomsize,
      pet_type: room.pet_type ?? room.pettype,
      price_per_night: Number(room.price_per_night ?? room.rate ?? 0),
      status: String(room.status || 'AVAILABLE').toUpperCase(),
    }));
  }

  async function fetchRooms() {
    const res = await window.API.rooms.getAll();
    if (!res.ok) return { ok: false, data: [], raw: res };
    const raw = res.data?.data || res.data || [];
    return { ok: true, data: normalizeRooms(raw), raw: res };
  }

  function inferLiveStatus(room, activeRoomIds) {
    if (activeRoomIds?.has(room.room_id)) return 'OCCUPIED';
    if (room.status === 'MAINTENANCE') return 'MAINTENANCE';
    return room.status || 'AVAILABLE';
  }

  function summarizeRooms(rooms, activeRoomIds = new Set()) {
    const totals = {
      total: rooms.length,
      available: 0,
      occupied: 0,
      maintenance: 0,
      other: 0,
    };

    rooms.forEach(room => {
      const status = inferLiveStatus(room, activeRoomIds);
      if (status === 'AVAILABLE') totals.available += 1;
      else if (status === 'OCCUPIED' || status === 'RESERVED' || status === 'CHECKED_IN') totals.occupied += 1;
      else if (status === 'MAINTENANCE' || status === 'CLEANING') totals.maintenance += 1;
      else totals.other += 1;
    });
    return totals;
  }

  window.RoomStore = {
    normalizeRooms,
    fetchRooms,
    inferLiveStatus,
    summarizeRooms,
  };
})();
