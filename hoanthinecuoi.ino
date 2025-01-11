#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#define DHTPIN 4
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

const int digitalPin = 16;
const int analogPin = 34;
const int led1Pin = 19;
const int led2Pin = 17;                                                 
const int led3Pin = 18;

const char *ssid = "Redmi Note 11T Pro";
const char *password = "1234567t";

// MQTT Broker (ví dụ: Mosquitto trên máy cục bộ)
const char *mqtt_broker = "192.168.183.156";
const char *mqtt_username = "admin";  // Thay bằng username của bạn
const char *mqtt_password = "admin";  // Thay bằng password của bạn
const int mqtt_port = 1234;           // Port broker của bạn

// MQTT Topics
const char *mqtt_topic_data = "TuyenB21/sensors";
const char *mqtt_topic_led = "TuyenB21/led";

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
const long interval = 10000;  // Đọc và gửi dữ liệu mỗi 10 giây

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(led1Pin, OUTPUT);
  pinMode(led2Pin, OUTPUT);
  pinMode(led3Pin, OUTPUT);

  setup_wifi();

  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callback);
}

void setup_wifi() {
  delay(10);
  Serial.println("\nConnecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to the WiFi network");
}

void callback(char *topic, byte *payload, unsigned int length) {
  Serial.print("Message arrived in topic: ");
  Serial.println(topic);
  Serial.print("Message: ");
  String message;
  for (int i = 0; i < length; i++) {
    message += (char) payload[i];
  }
  Serial.println(message);

  if (String(topic) == mqtt_topic_led) {
    if (message == "led1_on") digitalWrite(led1Pin, HIGH);
    else if (message == "led1_off") digitalWrite(led1Pin, LOW);
    else if (message == "led2_on") digitalWrite(led2Pin, HIGH);
    else if (message == "led2_off") digitalWrite(led2Pin, LOW);
    else if (message == "led3_on") digitalWrite(led3Pin, HIGH);
    else if (message == "led3_off") digitalWrite(led3Pin, LOW);
    else if (message == "led123_on") {
      digitalWrite(led1Pin, HIGH);
      digitalWrite(led2Pin, HIGH);
      digitalWrite(led3Pin, HIGH);
    }
    else if (message == "led123_off") {
      digitalWrite(led1Pin, LOW);
      digitalWrite(led2Pin, LOW);
      digitalWrite(led3Pin, LOW);
    }
  }


  
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    if (client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("connected");
      client.subscribe(mqtt_topic_led);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  if (WiFi.status() == WL_CONNECTED) {
    sendLedStatusToServer();

    HTTPClient http;
    http.begin("http://192.168.183.156:5000/api/light-status"); // Địa chỉ server
    int httpResponseCode = http.GET();
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println(httpResponseCode);
      Serial.println(response);

      // Kiểm tra trạng thái đèn từ kết quả trả về
      if (response.indexOf("on") >= 0) {
        digitalWrite(led1Pin, HIGH); // Bật đèn
      } else {
        digitalWrite(led1Pin, LOW);  // Tắt đèn
      }
    } else {
      Serial.println("Error on HTTP request");
    }
    http.end();
    http.begin("http://192.168.183.156:5000/api/light-status2"); // Địa chỉ server
    httpResponseCode = http.GET();
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println(httpResponseCode);
      Serial.println(response);

      // Kiểm tra trạng thái đèn từ kết quả trả về
      if (response.indexOf("on") >= 0) {
        digitalWrite(led2Pin, HIGH); // Bật đèn
      } else {
        digitalWrite(led2Pin, LOW);  // Tắt đèn
      }
    } else {
      Serial.println("Error on HTTP request");
    }
    http.end();
    http.begin("http://192.168.183.156:5000/api/light-status3"); // Địa chỉ server
    httpResponseCode = http.GET();
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println(httpResponseCode);
      Serial.println(response);

      // Kiểm tra trạng thái đèn từ kết quả trả về
      if (response.indexOf("on") >= 0) {
        digitalWrite(led3Pin, HIGH); // Bật đèn
      } else {
        digitalWrite(led3Pin, LOW);  // Tắt đèn
      }
    } else {
      Serial.println("Error on HTTP request");
    }
    http.end();

  }

  delay(1000);
  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    
    // Đọc giá trị analog từ cảm biến ánh sáng
    int analogValue = analogRead(analogPin);
    float voltage = (analogValue / 4095.0) * 3.3;  // ESP32 có độ phân giải ADC 12-bit (4095)
  
    float lux = 500 * pow(voltage,-1.5); // Tỷ lệ mẫu (thay đổi theo cảm biến)

    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("Failed to read from DHT sensor!");
    } else {
      // Tạo JSON object với dữ liệu
      StaticJsonDocument<200> doc;
      doc["temperature"] = temperature;
      doc["humidity"] = humidity;
      doc["light"] = lux;  // Gửi dữ liệu lux thay vì "light"

      char jsonBuffer[200];
      serializeJson(doc, jsonBuffer);

      // Gửi dữ liệu lên MQTT topic
      client.publish(mqtt_topic_data, jsonBuffer);
      
      Serial.print("Published: ");
      Serial.println(jsonBuffer);
    }
  }
}

void sendLedStatusToServer() {
  // Tạo JSON chứa trạng thái đèn LED
  StaticJsonDocument<200> ledStatus;
  ledStatus["led1"] = digitalRead(led1Pin) == HIGH ? "on" : "off";
  ledStatus["led2"] = digitalRead(led2Pin) == HIGH ? "on" : "off";
  ledStatus["led3"] = digitalRead(led3Pin) == HIGH ? "on" : "off";

  char jsonBuffer[200];
  serializeJson(ledStatus, jsonBuffer);

  // Gửi dữ liệu lên MQTT topic cho trạng thái LED
  if (client.publish("TuyenB21/ledStatus", jsonBuffer)) {
    Serial.println("LED status sent to server successfully via MQTT");
    Serial.println(jsonBuffer);  // Hiển thị JSON đã gửi
  } else {
    Serial.println("Failed to send LED status via MQTT");
  }
}



