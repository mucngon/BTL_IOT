const express = require('express');
const mysql = require('mysql2');
const mqtt = require('mqtt');
const cors = require('cors');
const app = express();
const port = 5001;

// Cấu hình CORS
app.use(cors());

// Kết nối với MySQL
const connection = mysql.createConnection({
    host: 'localhost',      // Địa chỉ máy chủ MySQL
    user: 'root',           // Tên người dùng MySQL
    password: '1234',       // Mật khẩu MySQL
    database: 'iot_database'// Tên cơ sở dữ liệu
});

// Kiểm tra kết nối MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database successfully!');
});

// Kết nối với MQTT broker
const mqttClient = mqtt.connect('mqtt://192.168.183.156', {
    username: 'admin',     // Tên đăng nhập MQTT
    password: 'admin',     // Mật khẩu MQTT
    port: 1234             // Port của MQTT broker
});

// Kiểm tra kết nối với MQTT broker
mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    
    // Đăng ký nhận dữ liệu từ topic "TuyenB21/sensors"
    mqttClient.subscribe('TuyenB21/sensors', (err) => {
        if (err) {
            console.error('Failed to subscribe to topic:', err);
        } else {
            console.log('Subscribed to topic: TuyenB21/sensors');
        }
    });
});

// Xử lý khi có tin nhắn từ MQTT
mqttClient.on('message', (topic, message) => {
    console.log(`Message received from topic ${topic}: ${message.toString()}`);
    
    // Giả sử tin nhắn là JSON, phân tích cú pháp JSON
    let data;
    try {
        data = JSON.parse(message.toString());
        console.log('Parsed Data:', data);
    } catch (error) {
        console.error('Error parsing message:', error);
        return;
    }

    // Chèn dữ liệu nhận được từ MQTT vào MySQL
    const query = `INSERT INTO stream_data (temperature, light, humidity, time) VALUES (?, ?, ?, NOW())`;
    connection.query(query, [data.temperature, data.light, data.humidity], (err, result) => {
        if (err) {
            console.error('Error inserting data into MySQL:', err);
        } else {
            console.log('Data inserted into MySQL successfully!', result);
        }
    });
});

// API để lấy dữ liệu từ MySQL
app.get('/api/data', (req, res) => {
    const query = 'SELECT id, temperature, light, humidity, time FROM stream_data ORDER BY time DESC LIMIT 100';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        
        console.log('Query results:', results);
        res.json(results);
    });
});

// API để lấy lịch sử thiết bị
// API để lấy lịch sử thiết bị
app.get('/api/history', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;
    const filterType = req.query.filterType;
    const searchQuery = req.query.searchQuery;
    const sortColumn = req.query.sortColumn || 'timestamp';
    const sortDirection = req.query.sortDirection || 'desc';
    
    let baseQuery = 'SELECT id, device_name, action, timestamp FROM device_history';
    let countQuery = 'SELECT COUNT(*) as total FROM device_history';
    let whereClause = '';
    let params = [];

    // Add search filtering if provided
    if (searchQuery && filterType && filterType !== 'all') {
        if (filterType === 'timestamp') {
            whereClause = ` WHERE DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') LIKE ?`;
        } else {
            whereClause = ` WHERE ${filterType} LIKE ?`;
        }
        params.push(`%${searchQuery}%`);
    }

    // Add sorting
    baseQuery += whereClause + ` ORDER BY ${sortColumn} ${sortDirection} LIMIT ? OFFSET ?`;
    countQuery += whereClause;
    
    // Add pagination parameters
    params.push(limit, offset);

    // Execute count query first
    connection.query(countQuery, params.slice(0, -2), (err, countResults) => {
        if (err) {
            console.error('Error executing count query:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Then execute data query
        connection.query(baseQuery, params, (err, results) => {
            if (err) {
                console.error('Error executing data query:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            res.json({
                data: results,
                pagination: {
                    total: countResults[0].total,
                    currentPage: page,
                    totalPages: Math.ceil(countResults[0].total / limit),
                    limit
                }
            });
        });
    });
});
// Endpoint để điều khiển đèn


// Hàm điều khiển thiết bị (mô phỏng)
function controlDevice(deviceName, action) {
    return new Promise((resolve, reject) => {
        // Thực hiện logic điều khiển thiết bị ở đây
        console.log(`Controlling device ${deviceName} to ${action}`);
        // Giả lập điều khiển thành công
        resolve();
    });
}



// Serve static files
app.use(express.static('public'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Bắt đầu server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

