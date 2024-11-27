const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const app = express();
const port = 3000;

// Sử dụng middleware CORS
app.use(cors());

// Đọc file swagger.yaml
const swaggerDocument = YAML.load(path.join(__dirname, 'api-docs.yaml'));

// Thiết lập Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Lắng nghe trên cổng
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}/api-docs`);
});
