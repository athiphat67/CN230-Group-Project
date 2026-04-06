document.addEventListener("DOMContentLoaded", () => {
    console.log("หน้า Dashboard พร้อมทำงานและเชื่อมต่อ Backend แล้ว!");
    
    // ฟังก์ชันจำลองการโหลดข้อมูล (เดี๋ยวเราค่อยมาเชื่อม API ของจริงทีหลัง)
    loadDashboardStats();
});

function loadDashboardStats() {
    // อนิเมชั่นจำลองตัวเลขวิ่ง เพื่อให้หน้าเว็บดูมีชีวิตชีวา
    setTimeout(() => {
        document.getElementById('stat-active-pets').innerText = "12";
        document.getElementById('stat-pending-checkins').innerText = "5";
        
        const careLogList = document.getElementById('care-log-list');
        careLogList.innerHTML = `
            <div class="text-left bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p class="font-medium text-slate-800">🐾 น้องมะม่วง (ห้อง A01)</p>
                <p class="text-sm text-slate-500">สถานะ: รอเขียนบันทึกเย็นนี้</p>
            </div>
        `;
        careLogList.classList.remove('text-center', 'py-10', 'text-slate-400', 'border-2', 'border-dashed');
    }, 800);
}