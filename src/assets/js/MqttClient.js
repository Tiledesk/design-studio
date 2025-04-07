// mqtt-client.js (crea questo file nella tua Angular app sotto /src/assets o /src/app/libs)

import mqtt from 'mqtt';
import { v4 as uuidv4 } from 'uuid';

export class MqttClient {




  constructor(options) {
    if (!options) {
      throw new Error("Missing MQTT data. Required options: MQTTendpoint, appId.")
    }

    this.appid = options.appId;
    this.log = options.log ? true : false;

    if (options.MQTTendpoint) {
      if (options.MQTTendpoint.startsWith('/')) {
        console.log("MQTTendpoint relative url");
        let loc = window.location;
        if (window.frameElement && window.frameElement.getAttribute('tiledesk_context') === 'parent') {
          loc = window.parent.location;
        }
        let new_uri = "mqtt://" + loc.host + options.MQTTendpoint;
        this.endpoint = new_uri;
      } else {
        this.endpoint = options.MQTTendpoint;
      }
    } else {
      console.error("Missing MQTTendpoint");
    }

    this.client = null;
    this.client_id = uuidv4();
    this.request_id = null;
    this.jwt = null;
    this.on_message_handler = null;
    this.topic_inbox = null;
    this.connected = false;

    this.now = Math.round(new Date().getTime() / 1000);
    this.exp = this.now + parseInt(2628000);
  }

  connect(request_id, token, callback) {
    this.request_id = request_id;
    this.jwt = token;

    if (this.client) {
      this.client.end();
    }

    const options = {
      keepalive: 10,
      reconnectPeriod: 1000,
      clientId: this.client_id,
      username: 'JWT',
      password: token,
      rejectUnauthorized: false
    };

    this.client = mqtt.connect(this.endpoint, options);

    this.client.on('connect', () => {
      console.log("Client connected. Request: " + request_id);
      if (!this.connected) {
        this.connected = true;
        this.start(callback);
      }
    });

    this.client.on('error', (error) => {
      console.error("MQTTClient error:", error);
    });
  }

  start(onMessageCallback) {
    this.subscribeToLogs(() => {
      this.on_message_handler = this.client.on('message', (topic, message) => {
        let message_string = message.toString();
        try {
          const message_json = JSON.parse(message_string);
          onMessageCallback(message_json);
        } catch (e) {
          console.warn("Error parsing message ", e);
          onMessageCallback(message_string);
        }
      });
    });
  }

  subscribeToLogs(subscribedCallback) {
    this.topic_inbox = 'apps/'+this.appid+'/logs/'+this.request_id+'/#';
    this.client.subscribe(this.topic_inbox, (err) => {
      if (err) {
        console.error("Subscribe error: ", err);
      } else {
        console.log("Subscribed to: " + this.topic_inbox);
        subscribedCallback();
      }
    });
  }

  close(callback) {
    if (this.topic_inbox) {
      this.client.unsubscribe(this.topic_inbox, (err) => {
        console.log("Unsubscribed from", this.topic_inbox);
        this.client.end(() => {
          this.connected = false;
          this.on_message_handler = null;
          this.topic_inbox = null;
          if (callback) {
            callback();
          }
        });
      });
    }
  }
}