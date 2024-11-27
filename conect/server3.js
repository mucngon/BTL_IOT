const mqtt = require('mqtt');
const WebSocket = require('ws');

// Kết nối tới MQTT broker
const mqttClient = mqtt.connect('mqtt://192.168.142.156', {
  username: 'admin',
  password: 'admin',
  port: 1234
});

// Khởi tạo WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
});

// Xác nhận kết nối MQTT thành công và đăng ký chủ đề
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('TuyenB21/ledStatus', (err) => {
    if (err) {
      console.error('Failed to subscribe to topic');
    } else {
      console.log('Subscribed to topic: TuyenB21/ledStatus');
    }
  });
});

// Xử lý khi nhận được tin nhắn từ MQTT
mqttClient.on('message', (topic, message) => {
  if (topic === 'TuyenB21/ledStatus') {
    try {
      const ledStatus = JSON.parse(message.toString());
      console.log('Received LED status:', ledStatus);

      // Gửi trạng thái đèn LED tới tất cả các client qua WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            light: ledStatus.led1,
            ac: ledStatus.led2,
            fan: ledStatus.led3
          }));
        }
      });
    } catch (error) {
      console.error('Error parsing JSON message:', error);
    }
  }
});

// Xử lý khi ngắt kết nối
mqttClient.on('close', () => {
  console.log('Disconnected from MQTT broker');
});
