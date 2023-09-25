
import { Injectable } from '@angular/core';
import { forwardRef, Inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Injectable()
export class WebSocketJs {

  public url;
  public onCreate;
  public onUpdate;
  public onOpen;
  public onData;
  public ws;
  public topics;
  public callbacks;
  public readyState: number;
  // public userHasClosed: boolean;

  // HEARTBEAT https://github.com/zimv/websocket-heartbeat-js/blob/master/lib/index.js
  private pingTimeoutId;
  private pongTimeoutId;

  public pingMsg = { action: "heartbeat", payload: { message: { text: "ping" } } }

  public pongMsg = { action: "heartbeat", payload: { message: { text: "pong" } } }


  public pongTimeout = 10000;
  public pingTimeout = 15000;

  // nktest
  // startTimeMS = 0;

  public pingSent$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public pongSent$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public pongReceived$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  private logger: LoggerService = LoggerInstance.getInstance()
  
  constructor() {

    this.logger.log("[WEBSOCKET-JS] HELLO !!!");
    this.topics = [];
    this.callbacks = new Map();

    // this.sendingMessages = [];//new Map();
  }


  /**
   * readyState: A read-only attribute. It represents the state of the connection. It can have the following values:
   * 0: Connection is in progress and has not yet been established.
   * 1: Connection is established and messages can be sent between the client and the server.
   * 2: Connection is going through the closing handshake.
   * 3: Connection has been closed or could not be opened.
   */

  // -----------------------------------------------------------------------------------------------------
  // @ ref - called by 'WsRequestsService' and 'WsMsgsService' & call 'subscribe' 
  // -----------------------------------------------------------------------------------------------------
  // WsRequestsService:
  //  - in getCurrentProjectAndSubscribeTo_WsRequests() 
  //  - in subscribeTo_wsRequestById() called when in 
  //     WsRequestsMsgsComponent onInit() is got the request id from url params
  // WsMsgsService     
  //  - in subsToWS_MsgsByRequestId() called when in 
  //     WsRequestsMsgsComponent onInit() is got the request id from url params

  ref(topic, calledby, onCreate, onUpdate, onData) {
    // this.logger.log('[WEBSOCKET-JS] ****** CALLING REF ****** ');
    this.logger.log('[WEBSOCKET-JS] - REF - calledby ', calledby);
    this.logger.log('[WEBSOCKET-JS] - REF - TOPIC ', topic);
    this.logger.log('[WEBSOCKET-JS] - REF - CALLBACKS', this.callbacks);

    if (!this.callbacks) {
      this.logger.log('[WEBSOCKET-JS] - REF OOOOPS! NOT CALLBACKS ***', this.callbacks);
      return
    }

    this.callbacks.set(topic, { onCreate: onCreate, onUpdate: onUpdate, onData: onData });
    this.logger.log('[WEBSOCKET-JS] - CALLBACK-SET - callbacks', this.callbacks);



    if (this.ws && this.ws.readyState == 1) {
      this.logger.log('[WEBSOCKET-JS] - REF - READY STATE ', this.ws.readyState);
      this.logger.log('[WEBSOCKET-JS] - REF - READY STATE = 1 > SUBSCRIBE TO TOPICS ');

      this.subscribe(topic);

    } else {
      // this.ws =  new WebSocket("wss://tiledesk-server-pre.herokuapp.com/?token=JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZGRkMzBiZmYwMTk1ZjAwMTdmNzJjNmQiLCJlbWFpbCI6InByZWdpbm9AZjIxdGVzdC5pdCIsImZpcnN0bmFtZSI6Ikdpbm8iLCJsYXN0bmFtZSI6IlByZSIsImVtYWlsdmVyaWZpZWQiOnRydWUsImlhdCI6MTYwODgwNjY0MCwiYXVkIjoiaHR0cHM6Ly90aWxlZGVzay5jb20iLCJpc3MiOiJodHRwczovL3RpbGVkZXNrLmNvbSIsInN1YiI6InVzZXIiLCJqdGkiOiI1YmVmMDcxYy00ODBlLTQzYzQtOTRhYS05ZjQxYzMyNDcxMGQifQ.wv6uBn2P6H9wGb5WCYQkpPEScMU9PB1pBUzFouhJk20");

      this.logger.log('[WEBSOCKET-JS] - REF - READY STATE ≠ 1 > OPEN WS AND THEN SUBSCRIBE TO TOPICS');
      // this.logger.log('% »»» WebSocketJs WF *** REF *** WS 2 ', this.ws);

      var that = this;
      if (this.ws) {
        this.ws.addEventListener("open", function (event) {
          that.logger.log('[WEBSOCKET-JS] - REF - OPEN EVENT *** ', event);
          that.subscribe(topic);
        });
      }

      if (this.topics.indexOf(topic) === -1) {
        this.topics.push(topic);
      }
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ subscribe - is called by 'ref' & call 'send'
  // -----------------------------------------------------------------------------------------------------
  subscribe(topic) {

    if (this.topics.indexOf(topic) === -1) {
      this.topics.push(topic);
    }
    this.logger.log('[WEBSOCKET-JS] - SUBSCRIBE TO TOPIC ', topic);

    var message = {
      action: 'subscribe',
      payload: {
        //topic: '/' + project_id + '/requests',
        topic: topic,
        message: undefined,
        method: undefined
      },
    };
    var str = JSON.stringify(message);
    this.logger.log("[WEBSOCKET-JS] - SUBSCRIBE TO TOPIC - STRING TO SEND " + str, " FOR SUBSCRIBE TO TOPIC: ", topic);

    this.send(str, `SUBSCRIBE to ${topic}`);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ unsubscribe 
  // - called by: 'WsRequestsService' > getCurrentProjectAndSubscribeTo_WsRequests()  
  //                                  > unsubscribeTo_wsRequestById() called by WsRequestsMsgsComponent > On Init & On Destroy
  //              'WsMsgsService' > unsubsToWS_MsgsByRequestId() > On Init & On Destroy
  //  - call 'send'
  // -----------------------------------------------------------------------------------------------------
  unsubscribe(topic) {
    this.logger.log("[WEBSOCKET-JS] - UN-SUBSCRIBE  - FROM TOPIC: ", topic);
    // this.logger.log("% »»» WebSocketJs WF *** UNSUBSCRIBE *** - this.topics ", this.topics);
    // this.logger.log("% »»» WebSocketJs WF *** UNSUBSCRIBE *** - topic ", topic);
    // this.logger.log("% »»» WebSocketJs WF *** UNSUBSCRIBE *** - callbacks ", this.callbacks);


    var index = this.topics.indexOf(topic);

    if (index > -1) {
      this.topics.splice(index, 1);
    }

    this.logger.log("[WEBSOCKET-JS] - UN-SUBSCRIBE - TOPICS AFTER SPLICE THE TOPIC ", this.topics);
    this.logger.log("[WEBSOCKET-JS] - UN-SUBSCRIBE - DELETE TOPIC FROM CALLBACKS - CALLBACKS SIZE ", this.callbacks.size);

    // if (this.callbacks.length > 0) {
    if (this.callbacks.size > 0) {
      this.callbacks.delete(topic);
      this.logger.log("[WEBSOCKET-JS] - UN-SUBSCRIBE - CALLBACKS AFTER DELETE TOPIC ", this.callbacks);
    }

    var message = {
      action: 'unsubscribe',
      payload: {
        //topic: '/' + project_id + '/requests',
        topic: topic,
        message: undefined,
        method: undefined
      },
    };
    var str = JSON.stringify(message);
    this.logger.log("[WEBSOCKET-JS] - UN-SUBSCRIBE str " + str);

    if (this.ws && this.ws.readyState == 1) {
      this.logger.log("[WEBSOCKET-JS] - UN-SUBSCRIBE TO TOPIC - STRING TO SEND " + str, " FOR UNSUBSCRIBE TO TOPIC: ", topic);
      this.send(str, `UNSUSCRIBE from ${topic}`);

    } else if (this.ws) {
      this.logger.log("[WEBSOCKET-JS] - UN-SUBSCRIBE TRY 'SEND' BUT READY STASTE IS : ", this.ws.readyState);
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ send - 
  // -----------------------------------------------------------------------------------------------------
  send(initialMessage, calling_method) {
    // this.logger.log("[WEBSOCKET-JS] - SEND - INIZIAL-MSG ", initialMessage, " CALLED BY ", calling_method);

    this.ws.send(initialMessage);
  }


  // -----------------------------------------------------------------------------------------------------
  // @ close (to find where is used search for x webSocketClose()) 
  // -----------------------------------------------------------------------------------------------------
  close() {
    this.topics = [];
    this.callbacks = [];
    this.logger.log("[WEBSOCKET-JS] - CALLED CLOSE - TOPICS ", this.topics, ' - CALLLBACKS ', this.callbacks);

    if (this.ws) {
      this.ws.onclose = function () { }; // disable onclose handler first
      this.ws.close();
    }
    this.heartReset();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Resubscribe
  // -----------------------------------------------------------------------------------------------------
  resubscribe() {
    this.logger.log("[WEBSOCKET-JS] - RESUBSCRIBE - TO TOPICS ", this.topics);
    this.logger.log("[WEBSOCKET-JS] - RESUBSCRIBE - CALLBACKS ", this.callbacks);

    if (this.topics.length > 0) {
      this.topics.forEach(topic => {
        this.logger.log("[WEBSOCKET-JS] - RESUBSCRIBE - SUBDCRIBE TO TOPICS ", topic);
        this.subscribe(topic); // nn fa sudbcribe 
      });
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ HeartCheck
  // -----------------------------------------------------------------------------------------------------
  heartCheck() {
    this.heartReset();
    this.heartStart();
  }

  // _heartStart() {
  //   // if(this.forbidReconnect) return;//Non ricollegare o eseguire il battito cardiaco
  //   this.pingTimeoutId = setTimeout(() => {
  //     // Qui viene inviato un battito cardiaco Dopo averlo ricevuto, viene restituito un messaggio di battito cardiaco.
  //     // onmessage Ottieni il battito cardiaco restituito per indicare che la connessione è normale
  //     try {
  //       this.logger.log('% »»» WebSocketJs - HEARTBEAT send MSG ', JSON.stringify(this.pingMsg));
  //       this.ws.send(JSON.stringify(this.pingMsg));
  //       // Se non viene ripristinato dopo un determinato periodo di tempo, il backend viene attivamente disconnesso
  //       this.pongTimeoutId = setTimeout(() => {
  //         // se onclose Si esibirà reconnect，Eseguiamo ws.close() Bene, se lo esegui direttamente reconnect Si innescherà onclose Causa riconnessione due volte
  //         this.ws.close();
  //       }, this.pongTimeout);

  //     } catch (e) {

  //       this.logger.log('% »»» WebSocketJs - HEARTBEAT err ', e);
  //     }

  //   }, this.pingTimeout);
  // }


  // getRemainingTime() {
  //   var milliSecondsTime = 15000;
  //   var timer;

  //   this.logger.log('% »»» WebSocketJs - heartStart timer 1', milliSecondsTime / 1000);
  //   timer = setInterval(function () {
  //     milliSecondsTime = milliSecondsTime - 1000;
  //     if (milliSecondsTime / 1000 == 0) {
  //       clearTimeout(timer);
  //     }
  //     else {
  //       this.logger.log('% »»» WebSocketJs - heartStart timer 2 ', milliSecondsTime / 1000);
  //     }
  //   }, 1000);
  // }

  // -----------------------------------------------------------------------------------------------------
  // @ HeartStart
  // -----------------------------------------------------------------------------------------------------
  heartStart() {
    // this.getRemainingTime();
    this.pingTimeoutId = setTimeout(() => {

      // Qui viene inviato un battito cardiaco Dopo averlo ricevuto, viene restituito un messaggio di battito cardiaco.
      // onmessage Ottieni il battito cardiaco restituito per indicare che la connessione è normale
      if (this.ws && this.ws.readyState == 1) {

        // this.logger.log("[WEBSOCKET-JS] - HEART-START - SEND PING-MSG");

        this.send(JSON.stringify(this.pingMsg), 'HEART-START')

      } else if (this.ws) {

        this.logger.log("[WEBSOCKET-JS] - HEART-START - TRY TO SEND PING-MSG BUT READY STATE IS ", this.ws.readyState);

      }

      // Se non viene ripristinato dopo un determinato periodo di tempo, il backend viene attivamente disconnesso
      this.pongTimeoutId = setTimeout(() => {
        this.logger.log("[WEBSOCKET-JS] - HEART-START - PONG-TIMEOUT-ID  - CLOSE WS ");
        // se onclose Si esibirà reconnect，Eseguiamo ws.close() Bene, se lo esegui direttamente reconnect Si innescherà onclose Causa riconnessione due volte
        this.ws.close();
      }, this.pongTimeout);

    }, this.pingTimeout);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ heartReset
  // -----------------------------------------------------------------------------------------------------
  heartReset() {
    // this.logger.log("[WEBSOCKET-JS] - HEART-RESET");
    clearTimeout(this.pingTimeoutId);
    clearTimeout(this.pongTimeoutId);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ init
  // -----------------------------------------------------------------------------------------------------
  init(url, onCreate, onUpdate, onData, onOpen = undefined, onOpenCallback = undefined, _topics = [], _callbacks = new Map()) {



    this.url = url;
    this.onCreate = onCreate;
    this.onUpdate = onUpdate;
    this.onData = onData;
    this.onOpen = onOpen;
    this.topics = _topics//[];//new Map();
    this.callbacks = _callbacks// new Map();
    // this.userHasClosed = false;
    // this.logger.log('% »»» WebSocketJs WF - closeWebsocket this.userHasClosed ' , this.userHasClosed);

    // this.sendingMessages = [];//new Map();
    // this.data = [];
    // this.init(this.sendMesagesInSendingArray);

    this.logger.log("[WEBSOCKET-JS] - CALLING INIT - topics ", this.topics);
    this.logger.log("[WEBSOCKET-JS] - CALLING INIT - url ", this.url);
    this.logger.log("[WEBSOCKET-JS] - CALLING INIT - callbacks ", this.callbacks);


    var that = this;
    return new Promise(function (resolve, reject) {
      // var options = {
      //     // headers: {
      //     //     "Authorization" : "JWT " + token
      //     // }
      // };
      // this.logger.log('options', options);
      // var ws = new WebSocket('ws://localhost:3000');
      // var ws = new WebSocket('ws://localhost:3000/public/requests');
      // var ws = new WebSocket('ws://localhost:3000/5bae41325f03b900401e39e8/messages');


      // -----------------------------------------------------------------------------------------------------
      // @ new WebSocket
      // -----------------------------------------------------------------------------------------------------
      that.ws = new WebSocket(that.url);


      // -----------------------------------------------------------------------------------------------------
      // @ onopen
      // -----------------------------------------------------------------------------------------------------
      that.ws.onopen = function (e) {
        that.logger.log('[WEBSOCKET-JS] - websocket is connected ...', e);

        // -----------------
        // @ heartCheck
        // -----------------
        that.heartCheck();


        if (onOpenCallback) {
          onOpenCallback();
        }

        if (that.onOpen) {
          that.onOpen();
        }

      }

      // -----------------------------------------------------------------------------------------------------
      // @ onclose
      // -----------------------------------------------------------------------------------------------------
      that.ws.onclose = function (e) {
        that.logger.log('[WEBSOCKET-JS] websocket IS CLOSED ... Try to reconnect in 3 seconds ', e);

        // this.logger.log('% »»» WebSocketJs - websocket onclose this.userHasClosed ', that.userHasClosed);
        // https://stackoverflow.com/questions/3780511/reconnection-of-client-when-server-reboots-in-websocket
        // Try to reconnect in 3 seconds

        // --------------------
        // @ init > resubscribe
        // --------------------

        setTimeout(function () {
          that.init(url, onCreate, onUpdate, onData, onOpen, function () {
            that.logger.log('[WEBSOCKET-JS] websocket IS CLOSED ... CALLING RESUSCRIBE ');
            that.resubscribe();
          }, that.topics, that.callbacks);
        }, 3000);
      }

      // -----------------------------------------------------------------------------------------------------
      // @ onerror
      // -----------------------------------------------------------------------------------------------------
      that.ws.onerror = function (err) {
        that.logger.error('[WEBSOCKET-JS] websocket IS CLOSED - websocket error ...', err)
      }

      // -----------------------------------------------------------------------------------------------------
      // @ onmessage
      // -----------------------------------------------------------------------------------------------------
      that.ws.onmessage = function (message) {
        // that.logger.log('[WEBSOCKET-JS] websocket onmessage ', message);
        // that.logger.log('[WEBSOCKET-JS] websocket onmessage data', message.data);

        // let test = '{ "action": "publish","payload": {"topic": "/5df26badde7e1c001743b63c/requests", "method": "CREATE", "message": [ { "_id": "5f29372d690e6f0034edf100", "status": 200, "preflight": false, "hasBot": true, "participants": ["bot_5df272e8de7e1c001743b645"],  "participantsAgents": [], "participantsBots": ["5df272e8de7e1c001743b645"], "request_id": "support-group-MDszsSJlwqQn1_WCh6u", "requester": "5f29371b690e6f0034edf0f5", "lead": "5f29372d690e6f0034edf0ff", "first_text": "ocourse the email is valid ","department": "5df26badde7e1c001743b63e", "agents": [{"user_available": true,"online_status": "online", "number_assigned_requests": 35, "_id": "5e0f2119705a35001725714d","id_project": "5df26badde7e1c001743b63c", "id_user": "5aaa99024c3b110014b478f0", "role": "admin", "createdBy": "5df26ba1de7e1c001743b637","createdAt": "2020-01-03T11:10:17.123Z", "updatedAt": "2020-01-03T11:10:17.123Z", "__v": 0 }, { "user_available": false, "online_status": "offline", "number_assigned_requests": 0, "_id": "5e1a13824437eb0017f712b4", "id_project": "5df26badde7e1c001743b63c","id_user": "5ac7521787f6b50014e0b592", "role": "admin", "createdBy": "5df26ba1de7e1c001743b637", "createdAt": "2020-01-11T18:27:14.657Z","updatedAt": "2020-01-11T18:27:14.657Z", "__v": 0}, { "user_available": false,"online_status": "offline", "number_assigned_requests": 0, "_id": "5df26bdfde7e1c001743b640", "id_project": "5df26badde7e1c001743b63c", "id_user": "5de9200d6722370017731969","role": "admin","createdBy": "5df26ba1de7e1c001743b637", "createdAt": "2019-12-12T16:33:35.244Z", "updatedAt": "2019-12-12T16:33:35.244Z","__v": 0 }, {"user_available": true, "online_status": "online","number_assigned_requests": -11, "_id": "5eb1a3647ac005003480f54d", "id_project": "5df26badde7e1c001743b63c","id_user": "5e09d16d4d36110017506d7f","role": "owner", "createdBy": "5aaa99024c3b110014b478f0","createdAt": "2020-05-05T17:33:24.328Z", "updatedAt": "2020-05-05T17:33:24.328Z","__v": 0}], "sourcePage": "https://www.tiledesk.com/pricing-self-managed/", "language": "en","userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36","attributes": { "departmentId": "5df26badde7e1c001743b63e","departmentName": "Default Department","ipAddress": "115.96.30.154","client": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36","sourcePage": "https://www.tiledesk.com/pricing-self-managed/", "projectId": "5df26badde7e1c001743b63c", "requester_id": "ce31d3fd-a358-49c7-9b9f-5aead8330063", "subtype": "info","decoded_jwt": {"_id": "ce31d3fd-a358-49c7-9b9f-5aead8330063","firstname": "Guest", "id": "ce31d3fd-a358-49c7-9b9f-5aead8330063", "fullName": "Guest ","iat": 1596536604,"aud": "https://tiledesk.com","iss": "https://tiledesk.com","sub": "guest","jti": "702a4a7e-e56a-43cf-aadd-376f7c12f633"}},"id_project": "5df26badde7e1c001743b63c","createdBy": "ce31d3fd-a358-49c7-9b9f-5aead8330063","tags": [], "notes": [],"channel": {"name": "chat21"},"createdAt": "2020-08-04T10:23:41.641Z","updatedAt": "2021-03-25T18:01:13.371Z","__v": 3,"assigned_at": "2020-08-04T10:25:26.059Z","channelOutbound": {"name": "chat21"},"snapshot": {"agents": [{"id_user": "5aaa99024c3b110014b478f0"}, {"id_user": "5ac7521787f6b50014e0b592"}, {"id_user": "5de9200d6722370017731969"}, { "id_user": "5e09d16d4d36110017506d7f"}]},"id": "5f29372d690e6f0034edf100","requester_id": "5f29372d690e6f0034edf0ff"}]}}'
        // let test_due = '{ "action": "publish","payload": {"topic": "/5df26badde7e1c001743b63c/requests", "method": "CREATE", "message": [ { "_id": "5f29372d690e6f0034edf100", "status": 200, "preflight": false, "hasBot": true, "participants": ["bot_5df272e8de7e1c001743b645"],  "participantsAgents": [], "participantsBots": ["5df272e8de7e1c001743b645"], "request_id": "support-group-MDszsSJlwqQn1_WCh6u", "requester": "5f29371b690e6f0034edf0f5", "lead": "5f29372d690e6f0034edf0ff", "first_text": "ocourse the email is valid ","department": "5df26badde7e1c001743b63e", "agents": [{"user_available": true,"online_status": "online", "number_assigned_requests": 35, "_id": "5e0f2119705a35001725714d","id_project": "5df26badde7e1c001743b63c", "id_user": "5aaa99024c3b110014b478f0", "role": "admin", "createdBy": "5df26ba1de7e1c001743b637","createdAt": "2020-01-03T11:10:17.123Z", "updatedAt": "2020-01-03T11:10:17.123Z", "__v": 0 }, { "user_available": false, "online_status": "offline", "number_assigned_requests": 0, "_id": "5e1a13824437eb0017f712b4", "id_project": "5df26badde7e1c001743b63c","id_user": "5ac7521787f6b50014e0b592", "role": "admin", "createdBy": "5df26ba1de7e1c001743b637", "createdAt": "2020-01-11T18:27:14.657Z","updatedAt": "2020-01-11T18:27:14.657Z", "__v": 0}, { "user_available": false,"online_status": "offline", "number_assigned_requests": 0, "_id": "5df26bdfde7e1c001743b640", "id_project": "5df26badde7e1c001743b63c", "id_user": "5de9200d6722370017731969","role": "admin","createdBy": "5df26ba1de7e1c001743b637", "createdAt": "2019-12-12T16:33:35.244Z", "updatedAt": "2019-12-12T16:33:35.244Z","__v": 0 }, {"user_available": true, "online_status": "online","number_assigned_requests": -11, "_id": "5eb1a3647ac005003480f54d", "id_project": "5df26badde7e1c001743b63c","id_user": "5e09d16d4d36110017506d7f","role": "owner", "createdBy": "5aaa99024c3b110014b478f0","createdAt": "2020-05-05T17:33:24.328Z", "updatedAt": "2020-05-05T17:33:24.328Z","__v": 0}], "sourcePage": "https://www.tiledesk.com/pricing-self-managed/", "language": "en","userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36","attributes": { "departmentId": "5df26badde7e1c001743b63e","departmentName": "Default Department","ipAddress": "115.96.30.154","client": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36","sourcePage": "https://www.tiledesk.com/pricing-self-managed/", "projectId": "5df26badde7e1c001743b63c", "requester_id": "ce31d3fd-a358-49c7-9b9f-5aead8330063", "subtype": "info","decoded_jwt": {"_id": "ce31d3fd-a358-49c7-9b9f-5aead8330063","firstname": "Guest", "id": "ce31d3fd-a358-49c7-9b9f-5aead8330063", "fullName": "Guest ","iat": 1596536604,"aud": "https://tiledesk.com","iss": "https://tiledesk.com","sub": "guest","jti": "702a4a7e-e56a-43cf-aadd-376f7c12f633"}},"id_project": "5df26badde7e1c001743b63c","createdBy": "ce31d3fd-a358-49c7-9b9f-5aead8330063","tags": [], "notes": [],"channel": {"name": "chat21"},"createdAt": "2020-08-04T10:23:41.641Z","updatedAt": "2021-03-25T18:01:13.371Z","__v": 3,"assigned_at": "2020-08-04T10:25:26.059Z","channelOutbound": {"name": "chat21"},"_snapshot": {"agents": [{"id_user": "5aaa99024c3b110014b478f0"}, {"id_user": "5ac7521787f6b50014e0b592"}, {"id_user": "5de9200d6722370017731969"}, { "id_user": "5e09d16d4d36110017506d7f"}]},"id": "5f29372d690e6f0034edf100","requester_id": "5f29372d690e6f0034edf0ff"}]}}'

        try {
          var json = JSON.parse(message.data);
          // var json = JSON.parse(test_due);
          // this.logger.log('% »»» WebSocketJs - websocket onmessage JSON.parse(message.data) json payload', json.payload);
          // this.logger.log('% »»» WebSocketJs - websocket onmessage JSON.parse(message.data) json payload topic', json.payload.topic);
          // this.logger.log('% »»» WebSocketJs - websocket onmessage JSON.parse(message.data) json ', json);
        } catch (e) {
          that.logger.error('[WEBSOCKET-JS] -  This doesn\'t look like a valid JSON: ', message.data);
          return;
        }


        // -------------------
        // @ heartCheck
        // -------------------
        that.heartCheck();

        // --------------------------------------------------------------------------------------------------------------------
        // @ check the action and the message's text - if action is 'heartbeat' and text is ping send the PONG message and return
        // --------------------------------------------------------------------------------------------------------------------

        if (json.action == "heartbeat") {

          if (json.payload.message.text == "ping") {
            // -------------------
            // @ send PONG
            // -------------------
            // that.logger.log('[WEBSOCKET-JS] -  RECEIVED PING -> SEND PONG MSG');

            that.send(JSON.stringify(that.pongMsg), 'ON-MESSAGE')

          } else {
            // nk
            // this.logger.log('[WEBSOCKET-JS] - NOT RECEIVED PING ');
          }
          return;
        }

        var object = { event: json.payload, data: json };
        if (that.onData) {
          that.onData(json.payload.message, object);
        }

        var callbackObj = that.callbacks.get(object.event.topic);
        if (callbackObj && callbackObj.onData) {
          callbackObj.onData(json.payload.message, object);
        }

        if (json && json.payload && json.payload.message && that.isArray(json.payload.message)) {

          json.payload.message.forEach(element => {

            //let insUp = that.insertOrUpdate(element);
            let insUp = json.payload.method;

            var object = { event: json.payload, data: element };

            var callbackObj = that.callbacks.get(object.event.topic);


            if (insUp == "CREATE") {
              if (that.onCreate) {
                that.onCreate(element, object);
              }

              if (callbackObj) {
                callbackObj.onCreate(element, object);
              }
            }

            if (insUp == "UPDATE") {
              if (that.onUpdate) {
                that.onUpdate(element, object);
              }

              if (callbackObj && callbackObj.onUpdate) {
                callbackObj.onUpdate(element, object);
              }
            }
            resolve({ element: element, object: object });
          });

        } else {
          //let insUp = that.insertOrUpdate(json.payload.message);
          let insUp = json.payload.method;

          var object = { event: json.payload, data: json };
          var callbackObj = that.callbacks.get(object.event.topic);


          if (insUp == "CREATE") {
            if (that.onCreate) {
              that.onCreate(json.payload.message, object);
            }

            if (callbackObj && callbackObj.onCreate) {
              callbackObj.onCreate(json.payload.message, object);
            }
          }

          if (insUp == "UPDATE") {
            if (that.onUpdate) {
              that.onUpdate(json.payload.message, object);
            }

            if (callbackObj && callbackObj.onUpdate) {
              callbackObj.onUpdate(json.payload.message, object);
            }

          }

          resolve({ element: json.payload.message, object: object });
          // resolve:
          // $('#messages').after(json.text + '<br>');
        }
      }
    }); // .PROMISE
  }

  // -------------------------------------
  // !! not use this but the above close()
  // -------------------------------------

  // closeWebsocket() {
  //   this.topics = [];
  //   this.callbacks = [];
  //   this.logger.log('% »»» WebSocketJs WF - closeWebsocket  this.ws ', this.ws)

  //   if (this.ws) {
  //     this.ws.close();
  //     this.logger.log('% »»» WebSocketJs WF - closeWebsocket ')
  //   }
  // }




  isArray(what) {
    return Object.prototype.toString.call(what) === '[object Array]';
  }


}
