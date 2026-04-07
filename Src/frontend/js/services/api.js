const BASE_URL = 'http://127.0.0.1:5000/api';

window.staffAPI = {
  getAllStaff: async () => {
    try {
      const res = await fetch(`${BASE_URL}/staff`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (error) {
      console.error("Error fetching staff:", error);
      return { status: "error", data: [] };
    }
  },
  addStaff: async (staffData) => {
    try {
      const res = await fetch(`${BASE_URL}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      });
      return await res.json();
    } catch (error) {
      console.error("Error adding staff:", error);
      return { status: "error" };
    }
  }
};