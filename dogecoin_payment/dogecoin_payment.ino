/***************************************************************
* NodeJS Dogecoin IoT
* Autor: Guilherme Lirio Tomasi de Oliveira
* Obs: Exemplo de integração de socket.io com DogeCoin
* Link: https://github.com/guilhermelirio/nodejs-dogecoin-iot
**************************************************************/

#include <ESP8266WiFi.h>
#include <SocketIOClient.h>

SocketIOClient socket;

//Change SSID/PASSWORD
const char* ssid     = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

//Change host/server IP
char host[] = "192.168.1.2";
int port = 3000;
extern String RID;
extern String Rname;
extern String Rcontent;
unsigned long previousMillis = 0;
int relay = 5;
bool earnReward = false;
int timeOfReward;

void setup() {
  Serial.begin(115200);
  pinMode(relay, OUTPUT);  

  Serial.println();
  Serial.println();
  Serial.print("Connecting to ");
  Serial.print(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi conetado!");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  while (!socket.connect(host, port)) {
    Serial.println(F("Connection failed... Wait to reconnect!"));
    socket.reconnect(host, port);
    delay(2000);
  }
}

void verifyPayment() {
  if (socket.connected()) {
    if (socket.monitor()) {
      if (RID == "paid_out_esp") {
        //Verifica o Rname e Rcontent
        Serial.println((String)"RID: " + RID);
        Serial.println((String)"Rname: " + Rname);
        Serial.println((String)"Rcontent: " + Rcontent);
        timeOfReward = Rcontent.toInt();
        earnReward = true;
        RID = "";
      }
    }
  }
}

void activeReward() {
  static unsigned long initialTime = 0;
  if (initialTime == 0) {
    digitalWrite(relay, HIGH);
    initialTime = millis();
  }
  if (millis() - initialTime > timeOfReward) {
    digitalWrite(relay, LOW);
    earnReward = false;
    initialTime = 0;
  }
}

void ping() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis > 5000) {
    previousMillis = currentMillis;
    socket.heartbeat(0);
  }
}

void loop() {
  ping();
  verifyPayment();
  if (earnReward){
    activeReward();
  }
}
