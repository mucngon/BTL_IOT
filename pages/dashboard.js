document.addEventListener('DOMContentLoaded', function() {
  const deviceItems = document.querySelectorAll('.device-item');

  // Kết nối WebSocket để nhận dữ liệu trạng thái từ server
  const ws = new WebSocket('ws://192.168.183.156:3000'); // Thay 'localhost:3000' bằng địa chỉ WebSocket server của bạn

  // Lắng nghe dữ liệu trạng thái từ WebSocket
  ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'ledStatus') {
          updateDeviceStatus(data.data);  // Cập nhật trạng thái của các thiết bị
      }
  };

  deviceItems.forEach(item => {
      const toggle = item.querySelector('.device-toggle');
      const deviceName = item.dataset.device;

      // Load saved state from localStorage
      const savedState = localStorage.getItem(deviceName);
      if (savedState === 'true') {
          toggle.checked = true;
          item.classList.add('active');
      }

      // Lắng nghe sự kiện thay đổi trạng thái thiết bị
      toggle.addEventListener('change', function() {
          const isOn = this.checked;
          localStorage.setItem(deviceName, isOn);
          sendControlRequest(deviceName, isOn ? 'ON' : 'OFF');
      });
  });

  // Cập nhật trạng thái của các thiết bị dựa trên dữ liệu từ server
  function updateDeviceStatus(ledStatus) {
      deviceItems.forEach(item => {
          const deviceName = item.dataset.device;
          const toggle = item.querySelector('.device-toggle');

          // Kiểm tra trạng thái từ ledStatus và áp dụng hoạt ảnh
          if (ledStatus[deviceName] === 'on') {
              toggle.checked = true;
              item.classList.add('active');  // Thêm lớp active để hiển thị hoạt ảnh
          } else {
              toggle.checked = false;
              item.classList.remove('active');  // Loại bỏ lớp active khi tắt
          }
      });
  }

  // Hàm gửi yêu cầu điều khiển đến API
  function sendControlRequest(deviceName, action) {
      fetch('http://localhost:5000/api/control', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              deviceName: deviceName,
              action: action,
              description: `Turned ${action.toLowerCase()} the ${deviceName}`
          })
      })
      .then(response => response.json())
      .then(data => console.log('Success:', data))
      .catch(error => console.error('Error:', error));
  }
});

const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
  const ledStatus = JSON.parse(event.data);
  console.log('Received LED status from WebSocket:', ledStatus);

  // Cập nhật giao diện dựa trên trạng thái nhận được
  updateDeviceUI(ledStatus);
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket server');
};


    // Hàm để lấy dữ liệu từ API


    // Gọi hàm để lấy dữ liệu ngay khi trang được tải
    document.addEventListener('DOMContentLoaded', fetchSensorData);



// Hàm cập nhật giao diện
function updateDeviceUI(ledStatus) {
  document.querySelector('.device-item.light').classList.toggle('active', ledStatus.light === 'on');
  document.querySelector('.device-item.ac').classList.toggle('active', ledStatus.ac === 'on');
  document.querySelector('.device-item.fan').classList.toggle('active', ledStatus.fan === 'on');
}
function updateTemperatureBackground(temp) {
    const card = document.getElementById('temperatureCard');
    temp = parseInt(temp);
    
    if (temp < 20) {
        card.className = 'card text-center p-3 temperature-cold';
    } else if (temp >= 20 && temp < 30) {
        card.className = 'card text-center p-3 temperature-normal';
    } else if (temp >= 30 && temp < 35) {
        card.className = 'card text-center p-3 temperature-warm';
    } else {
        card.className = 'card text-center p-3 temperature-hot';
    }
}

function updateLuminosityBackground(lux) {
    const card = document.getElementById('luminosityCard');
    lux = parseInt(lux);
    
    if (lux < 150) {
        card.className = 'card text-center p-3 luminosity-dark';
    } else if (lux >= 150 && lux < 500) {
        card.className = 'card text-center p-3 luminosity-dim';
    } else if (lux >= 500 && lux < 5000) {
        card.className = 'card text-center p-3 luminosity-bright';
    } else {
        card.className = 'card text-center p-3 luminosity-very-bright';
    }
}

function updateHumidityBackground(humidity) {
    const card = document.getElementById('humidityCard');
    humidity = parseInt(humidity);
    
    if (humidity < 30) {
        card.className = 'card text-center p-3 humidity-dry';
    } else if (humidity >= 30 && humidity < 60) {
        card.className = 'card text-center p-3 humidity-normal';
    } else if (humidity >= 60 && humidity < 80) {
        card.className = 'card text-center p-3 humidity-humid';
    } else {
        card.className = 'card text-center p-3 humidity-very-humid';
    }
}

// Initial update
updateTemperatureBackground('36');
updateLuminosityBackground('75');
updateHumidityBackground('45');

// Update when values change
const temperatureValue = document.getElementById('temperatureValue');
const luminosityValue = document.getElementById('luminosityValue');
const humidityValue = document.getElementById('humidityValue');

// Example of how to update values dynamically
// You can replace these with real sensor data

