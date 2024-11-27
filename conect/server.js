const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
const port = 5000;

// Cấu hình CORS
app.use(cors());

// Thêm middleware để phân tích JSON body
app.use(express.json());

// Kết nối với MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'iot_database'
});

// Kiểm tra kết nối MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database successfully!');
});

// API endpoint để lấy dữ liệu từ MySQL
app.get('/api/data', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;
    const filterType = req.query.filterType;
    const searchQuery = req.query.searchQuery;
    const sortColumn = req.query.sortColumn;
    const sortDirection = req.query.sortDirection || 'asc';
    
    let baseQuery = 'SELECT id, temperature, light, humidity, time FROM stream_data';
    let countQuery = 'SELECT COUNT(*) as total FROM stream_data';
    let whereClause = '';
    let params = [];

    // Add search filtering if provided
    if (searchQuery && filterType && filterType !== 'all') {
        whereClause = ` WHERE ${filterType} LIKE ?`;
        params.push(`%${searchQuery}%`);
    }

    // Add sorting
    let orderClause = ' ORDER BY time DESC';
    if (sortColumn) {
        orderClause = ` ORDER BY ${sortColumn} ${sortDirection}`;
    }

    baseQuery += whereClause + orderClause + ' LIMIT ? OFFSET ?';
    countQuery += whereClause;
    
    // Add pagination parameters
    params.push(limit, offset);

    connection.query(countQuery, params.slice(0, -2), (err, countResults) => {
        if (err) {
            console.error('Error executing count query:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

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

// Endpoint để điều khiển thiết bị và lưu thông tin vào database
app.post('/api/control', (req, res) => {
    console.log('Request body:', req.body);  // Ghi log req.body để kiểm tra nội dung

    const { deviceName, action } = req.body;
    console.log(`Device: ${deviceName}, Action: ${action}`);

    if (!deviceName || !action) {
        return res.status(400).json({ error: 'deviceName and action are required' });
    }

    const query = `INSERT INTO device_history (device_name, action, timestamp, description) VALUES (?, ?, NOW(), ?)`;
    const description = `Turned ${action.toLowerCase()} the ${deviceName}`;
    
    connection.query(query, [deviceName, action, description], (err) => {
        if (err) {
            console.error('Error inserting action into database:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ success: true, message: `Action ${action} sent to ${deviceName}` });
    });
});

// Endpoint kiểm tra trạng thái đèn
app.get('/api/light-status', (req, res) => {
    const query = 'SELECT action FROM device_history WHERE device_name = "Light" ORDER BY timestamp DESC LIMIT 1';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching light status:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (results.length === 0) {
            return res.json({ status: 'Unknown' });
        }

        const lightStatus = results[0].action;
        res.json({ status: lightStatus });
    });
});


app.get('/api/light-status2', (req, res) => {
    const query = 'SELECT action FROM device_history WHERE device_name = "Air Conditioner" ORDER BY timestamp DESC LIMIT 1';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching light status:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (results.length === 0) {
            return res.json({ status: 'Unknown' });
        }

        const lightStatus = results[0].action;
        res.json({ status: lightStatus });
    });
});


app.get('/api/light-status3', (req, res) => {
    const query = 'SELECT action FROM device_history WHERE device_name = "Fan" ORDER BY timestamp DESC LIMIT 1';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching light status:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (results.length === 0) {
            return res.json({ status: 'Unknown' });
        }

        const lightStatus = results[0].action;
        res.json({ status: lightStatus });
    });
});


// Endpoint lấy dữ liệu cảm biến mới nhất
app.get('/api/sensor-data', (req, res) => {
    const query = 'SELECT temperature, humidity, light FROM stream_data ORDER BY time DESC LIMIT 1';

    connection.query(query, (err, results) => {
        if (err) {
            return res.status(500).send('Error fetching data from database');
        }

        res.json(results[0]);  // Trả về hàng đầu tiên (mới nhất)
    });
});

// Serve static files
app.use(express.static('public'));

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Kết nối với MQTT broker
const mqttClient = mqtt.connect('mqtt://192.168.142.156');

// Kiểm tra kết nối với MQTT broker
mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    
    // Đăng ký nhận dữ liệu từ topic
    mqttClient.subscribe('TuyenB21/sensors', (err) => {
        if (err) {
            console.error('Failed to subscribe to topic:', err);
        }
    });
});

// Xử lý khi có tin nhắn từ MQTT
mqttClient.on('message', (topic, message) => {
    console.log(`Message received from topic ${topic}: ${message.toString()}`);

    try {
        // Giả sử message từ MQTT có định dạng JSON
        const data = JSON.parse(message.toString());

        const query = `INSERT INTO stream_data (temperature, light, humidity, time) VALUES (?, ?, ?, NOW())`;
        
        connection.query(query, [data.temperature, data.light, data.humidity], (err) => {
            if (err) {
                console.error('Error inserting data into MySQL:', err);
            } else {
                console.log('Data inserted into MySQL successfully!');
            }
        });
    } catch (error) {
        console.error('Error parsing message:', error);
    }
});

// Lưu trữ trạng thái LED
app.use(express.json());

// Định nghĩa route cho POST tới /api/led-status
app.post('/api/led-status', (req, res) => {
    const ledStatus = req.body;  // Lấy dữ liệu JSON từ yêu cầu

    // Hiển thị dữ liệu trạng thái LED nhận được từ ESP32
    console.log('Received LED status:', ledStatus);

    // Trả về phản hồi cho ESP32 để xác nhận dữ liệu đã được nhận
    res.status(200).json({ message: 'LED status received successfully' });
});