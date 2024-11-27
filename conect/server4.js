const express = require('express');
const mysql = require('mysql2');
const mqtt = require('mqtt');
const cors = require('cors');
const app = express();
const port = 5002; // Sử dụng cổng đã khai báo ở đây

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
const mqttClient = mqtt.connect('mqtt://192.168.142.156', {
    username: 'admin',     // Tên đăng nhập MQTT
    password: 'admin',     // Mật khẩu MQTT
    port: 1234             // Port của MQTT broker
});

mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    mqttClient.subscribe('TuyenB21/Led4', (err) => {
        if (!err) {
            console.log('Subscribed to TuyenB21/Led4');
        }
    });
});

// Lắng nghe tin nhắn từ topic TuyenB21/Led4
mqttClient.on('message', (topic, message) => {
    if (topic === 'TuyenB21/Led4') {
        try {
            const data = JSON.parse(message.toString());
            const windSpeed = data.random_number;
            
            // Lưu vào database
            const query = 'INSERT INTO wind_data (windSpeed, timestamp) VALUES (?, NOW())';
            connection.query(query, [windSpeed], (err, result) => {
                if (err) {
                    console.error('Error saving wind speed:', err);
                } else {
                    console.log('Wind speed saved:', windSpeed);
                }
            });
        } catch (error) {
            console.error('Error parsing MQTT message:', error);
        }
    }
});

app.get('/api/wind/latest', (req, res) => {
    const query = 'SELECT * FROM wind_data ORDER BY timestamp DESC LIMIT 1';
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json(results[0] || { windSpeed: 0 });
    });
});

// Lấy lịch sử dữ liệu gió
app.get('/api/wind/history', (req, res) => {
    const limit = req.query.limit || 100; // Mặc định lấy 100 bản ghi
    const query = 'SELECT * FROM wind_data ORDER BY timestamp DESC LIMIT ?';
    connection.query(query, [parseInt(limit)], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json(results);
    });
});

// Lấy thống kê dữ liệu gió
app.get('/api/wind/stats', (req, res) => {
    const query = `
        SELECT 
            AVG(windSpeed) as average_speed,
            MAX(windSpeed) as max_speed,
            MIN(windSpeed) as min_speed,
            COUNT(*) as total_records
        FROM wind_data
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json(results[0]);
    });
});

// Lấy dữ liệu gió theo khoảng thời gian
app.get('/api/wind/range', (req, res) => {
    const { start, end } = req.query;
    const query = 'SELECT * FROM wind_data WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC';
    connection.query(query, [start, end], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json(results);
    });
});

// Xử lý lỗi
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Xử lý tắt server một cách an toàn
process.on('SIGINT', () => {
    connection.end((err) => {
        if (err) {
            console.error('Error closing MySQL connection:', err);
        }
        console.log('MySQL connection closed');
        process.exit();
    });
});
