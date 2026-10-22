// หน้าจอทุกหน้าใช้รูปแบบเดียวกัน: api(พาธ, วิธีส่ง, ข้อมูล)
export async function api(url, method = 'GET', data) {
  const headers = { Authorization: 'Bearer ' + (localStorage.getItem('split_token') || '') };
  const options = { method, headers };
  if (data instanceof FormData) options.body = data;
  else if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  const response = await fetch('/api' + url, options);
  let result;
  try {
    result = await response.json();
  } catch {
    throw Error('เชื่อมต่อ API ไม่ได้ ตรวจว่า backend เปิดพอร์ต 3301 อยู่');
  }
  if (!response.ok) throw Error(result.message);
  return result.data;
}
export async function fileBlob(url) {
  const response = await fetch('/api' + url, {
    headers: { Authorization: 'Bearer ' + localStorage.getItem('split_token') },
  });
  if (!response.ok) {
    const data = await response.json();
    throw Error(data.message);
  }
  return URL.createObjectURL(await response.blob());
}
export async function openFile(url) {
  const blob = await fileBlob(url);
  const a = document.createElement('a');
  a.href = blob;
  a.target = '_blank';
  a.rel = 'noopener';
  a.click();
  setTimeout(() => URL.revokeObjectURL(blob), 60000);
}
export function mayEdit(period) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  return period.status === 'open' && today >= period.start_date && today <= period.end_date;
}
