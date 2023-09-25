/*
    Chat21Client

    v0.1.12.7

    @Author Andrea Sponziello
    @Member Gabriele Panico
    (c) Tiledesk 2020
*/

//let mqtt = require('mqtt');
//let axios = require('axios');

const _CLIENTADDED = "/clientadded"
const _CLIENTUPDATED = "/clientupdated"
const _CLIENTDELETED = "/clientdeleted"
const CALLBACK_TYPE_ON_MESSAGE_UPDATED_FOR_CONVERSATION = "onMessageUpdatedForConversation"
const CALLBACK_TYPE_ON_MESSAGE_ADDED_FOR_CONVERSATION = "onMessageAddedForConversation"

class Chat21Client {
    constructor(options) {
        // console.log('CHAT21-CLIENT.JS  HELLO ', mqtt)
        this.client = null;
        this.reconnections = 0 // just to check how many reconnections
        this.client_id = this.uuidv4();
        this.log = options.log ? true : false;
        if (options && options.MQTTendpoint) {
            if (options.MQTTendpoint.startsWith('/')) {
                if (this.log) {
                    console.log("MQTTendpoint relative url");
                }
                var loc = window.location, new_uri;
                if(window.frameElement && window.frameElement.getAttribute('tiledesk_context') === 'parent'){
                    loc = window.parent.location
                }
                if (loc.protocol === "https:") {
                    // new_uri = "wss:";
                    new_uri = "mqtt:";
                    
                } else {
                    // new_uri = "ws:";
                    new_uri = "mqtt:";
                }
                new_uri += "//" + loc.host;
                // new_uri += loc.pathname + "/to/ws";
                new_uri += options.MQTTendpoint;
                this.endpoint = new_uri
            } else {
                this.endpoint = options.MQTTendpoint
            }
            
        }
        else {
            this.endpoint = "ws://34.253.207.0:15675/ws"
        }
        this.APIendpoint = options.APIendpoint;
        this.appid = options.appId;
        if (this.log) {
            console.log("final endpoint:", this.endpoint);
        }
        this.user_id = null;
        this.jwt = null;
        this.last_handler = 0;
        
        // this.onMessageCallbacks = new Map();
        // this.onConnectCallbacks = new Map();
        
        this.onConversationAddedCallbacks = new Map();
        this.onConversationUpdatedCallbacks = new Map();
        this.onConversationDeletedCallbacks = new Map();
        this.onArchivedConversationAddedCallbacks = new Map();
        this.onArchivedConversationDeletedCallbacks = new Map();
        this.onMessageAddedCallbacks = new Map();
        this.onMessageUpdatedCallbacks = new Map();
        this.onGroupUpdatedCallbacks = new Map();
        this.callbackHandlers = new Map();
        this.on_message_handler = null;
        this.topic_inbox = null;
        this.connected = false
    }

    subscribeToMyConversations(subscribedCallback) { // MESSAGES ETC.
        // WILDCARS:
        // MQTT: https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/
        // RABBITMQ: https://www.cloudamqp.com/blog/2015-09-03-part4-rabbitmq-for-beginners-exchanges-routing-keys-bindings.html#topic-exchange
        this.topic_inbox = 'apps/tilechat/users/' + this.user_id + "/#"
        if (this.log) {
            console.log("subscribing to:", this.user_id, "topic", this.topic_inbox);
        }
        this.client.subscribe(this.topic_inbox, (err)  => {
            if (err) {
                console.error("An error occurred while subscribing user", this.user_id, "on topic:", this.topic_inbox, "Error:", err);
            }
            if (this.log) {
                console.log("subscribed to:", this.topic_inbox, " with err", err)
            }
            subscribedCallback();
        });
    }

    sendMessage(text, type, recipient_id, recipient_fullname, sender_fullname, attributes, metadata, channel_type, callback) {
        // console.log("sendMessage sattributes:", attributes);
        let dest_topic = `apps/${this.appid}/outgoing/users/${this.user_id}/messages/${recipient_id}/outgoing`
        // console.log("dest_topic:", dest_topic)
        let outgoing_message = {
            text: text,
            type: type,
            recipient_fullname: recipient_fullname,
            sender_fullname: sender_fullname,
            attributes: attributes,
            metadata: metadata,
            channel_type: channel_type
        }
        // console.log("outgoing_message:", outgoing_message)
        const payload = JSON.stringify(outgoing_message)
        this.client.publish(dest_topic, payload, null, (err) => {
            callback(err, outgoing_message)
        })
    }

    basicMessageBuilder(text, type, recipient_fullname, sender_fullname, attributes, metadata, channel_type) {
        let outgoing_message = {
            text: text,
            type: type,
            recipient_fullname: recipient_fullname,
            sender_fullname: sender_fullname,
            attributes: attributes,
            metadata: metadata,
            channel_type: channel_type
        }
        return outgoing_message;
    }

    sendMessageRaw(outgoing_message, recipient_id, callback) {
        // callback - function (err)
        // console.log("recipient_id:", recipient_id)
        let dest_topic = `apps/${this.appid}/outgoing/users/${this.user_id}/messages/${recipient_id}/outgoing`
        if (this.log) {
            console.log("dest_topic:", dest_topic)
        }
        // let outgoing_message = {
        //     text: text,
        //     type: type,
        //     recipient_fullname: recipient_fullname,
        //     sender_fullname: sender_fullname,
        //     attributes: attributes,
        //     metadata: metadata,
        //     channel_type: channel_type
        // }
        // console.log("outgoing_message:", outgoing_message)
        const payload = JSON.stringify(outgoing_message)
        this.client.publish(dest_topic, payload, null, (err) => {
            callback(err, outgoing_message)
        });
    }

    updateMessageStatus(messageId, conversWith, status, callback) {
        // callback - function (err)
        if (this.log) {
            console.log("updating recipient_id:", messageId, "on conversWith", conversWith, "status", status)
        }
        // 'apps/tilechat/users/USER_ID/messages/CONVERS_WITH/MESSAGE_ID/update'
        let dest_topic = `apps/${this.appid}/users/${this.user_id}/messages/${conversWith}/${messageId}/update`
        if (this.log) {
            console.log("update dest_topic:", dest_topic);
        }
        let message_patch = {
            status: status
        }
        const payload = JSON.stringify(message_patch)
        if (this.log) {
            console.log("payload:", payload)
        }
        this.client.publish(dest_topic, payload, null, (err) => {
            if (callback) {
                callback(err, message_patch)
            }
        })
    }

    updateConversationIsNew(conversWith, is_new, callback) {
        // callback - function (err)
        if (this.log) {
            console.log("updating conversation with:", conversWith, "is_new", is_new);
        }
        // 'apps/tilechat/users/USER_ID/conversations/CONVERS_WITH/update'
        let dest_topic = `apps/${this.appid}/users/${this.user_id}/conversations/${conversWith}/update` //'apps/tilechat/users/' + this.user_id + '/conversations/' + conversWith + '/update'
        if (this.log) {
            console.log("update dest_topic:", dest_topic);
        }
        let patch = {
            is_new: is_new
        }
        const payload = JSON.stringify(patch)
        if (this.log) {
            console.log("payload:", payload);
        }
        this.client.publish(dest_topic, payload, null, (err) => {
            if (callback) {
                callback(err)
            }
        })
    }

    groupCreate(name, group_id, members, callback) {
        // example:
        // {
        //     "group_id":"group-tiledeskteam",
        //     "group_name":"Tiledesk Team",
        //     "group_members":{
        //         "608bc83b3d0b3e494f4d0578":1,
        //         "608bc81f3d0b3e494f4d0575":1,
        //         "6067513cb64a9b1ba259839c":1
        //     }
        // }

        // callback - function (err)
        if (this.log) {
            console.log("creating group:", name, "id", group_id, "members", members)
        }
        // who creates the group is also group-owner
        // ex.: http://localhost:8004/api/tilechat/04-ANDREASPONZIELLO/groups
        // let data = {
        //     group_name: name,
        //     group_id: group_id,
        //     group_members: members
        // }
        // let headers = {
        //     "authorization": this.jwt,
        //     "Content-Type": "application/json;charset=UTF-8"
        // }

        const URL = `${this.APIendpoint}/${this.appid}/groups`
        if (this.log) {
            console.log("creating group...", URL)
        }
        let options = {
            url: URL,
            headers: {
                "Authorization": this.jwt,
                "Content-Type": "application/json;charset=UTF-8"
            },
            data: {
                group_name: name,
                group_id: group_id,
                group_members: members
            },
            method: 'POST'
        }
        Chat21Client.myrequest(options, (err, response, json) => {
            if (err) {
                callback(err, null);
            }
            else if (json && callback) {
                callback(null, json);
            }
        }, this.log);
    }

    groupData(group_id, callback) {
        const URL = `${this.APIendpoint}/${this.appid}/groups/${group_id}`
        // console.log("creating group...", URL)
        let options = {
            url: URL,
            headers: {
                "Authorization": this.jwt,
                "Content-Type": "application/json;charset=UTF-8"
            },
            method: 'GET'
        }
        Chat21Client.myrequest(options, (err, response, json) => {
            if (err) {
                callback(err, null);
            }
            else if (json && callback) {
                callback(null, json);
            }
        }, this.log);
        // const URL = `${this.APIendpoint}/${this.appid}/groups/${group_id}`
        // console.log("getting group...", URL)
        // var xmlhttp = new XMLHttpRequest();
        // xmlhttp.open("GET", URL, true);
        // xmlhttp.setRequestHeader("authorization", this.jwt);
        // xmlhttp.onreadystatechange = function() {
        //     if (callback && xmlhttp.readyState == 4 && xmlhttp.status == 200 && xmlhttp.responseText) {
        //         try {
        //             const json = JSON.parse(xmlhttp.responseText)
        //             callback(null, json.result)
        //         }
        //         catch (err) {
        //             console.error("parsing json ERROR", err)
        //             callback(err, null)
        //         }
        //     }
        // };
        // xmlhttp.send(null);
    }

    groupLeave(group_id, member_id, callback) {
        if (this.log) {
            console.log("leaving group:", group_id);
        }
        const URL = `${this.APIendpoint}/${this.appid}/groups/${group_id}/members/${member_id}`
        if (this.log) {
            console.log("leaving group:", URL)
        }
        let options = {
            url: URL,
            headers: {
                "Authorization": this.jwt,
                "Content-Type": "application/json;charset=UTF-8"
            },
            method: 'DELETE'
        }
        Chat21Client.myrequest(options, (err, response, json) => {
            if (err) {
                callback(err, null);
            }
            else if (callback) {
                callback(null, json);
            }
        }, this.log);
    }

    groupJoin(group_id, member_id, callback) {
        if (this.log) {
            console.log("leaving group:", group_id);
        }
        const URL = `${this.APIendpoint}/${this.appid}/groups/${group_id}/members`
        if (this.log) {
            console.log("joining group:", URL)
        }
        let options = {
            url: URL,
            headers: {
                "Authorization": this.jwt,
                "Content-Type": "application/json;charset=UTF-8"
            },
            data: {
                member_id: member_id
            },
            method: 'POST'
        }
        Chat21Client.myrequest(options, (err, response, json) => {
            if (err) {
                callback(err, null);
            }
            else if (callback) {
                callback(null, json);
            }
        }, this.log);
    }

    groupSetMembers(group_id, members, callback) {
        // example:
        // {
        //     "members":{
        //         "608bc83b3d0b3e494f4d0578":1,
        //         "608bc81f3d0b3e494f4d0575":1,
        //         "6067513cb64a9b1ba259839c":1
        //     }
        // }
        if (this.log) {
            console.log("setting group members of", group_id, "members", members)
        }
        const URL = `${this.APIendpoint}/${this.appid}/groups/${group_id}/members`
        if (this.log) {
            console.log("setting group members...", URL)
        }
        let options = {
            url: URL,
            headers: {
                "Authorization": this.jwt,
                "Content-Type": "application/json;charset=UTF-8"
            },
            data: {
                members: members
            },
            method: 'PUT'
        }
        Chat21Client.myrequest(options, (err, response, json) => {
            if (err) {
                callback(err, null);
            }
            else if (json && callback) {
                callback(null, json);
            }
        }, this.log);
    }

    saveInstance(instance_id, data, callback) {
        if (this.log) {
            console.log("saving instance_id:", instance_id, "data", data);
        }

        // /:app_id/:user_id/instances/:instance_id
        const URL = `${this.APIendpoint}/${this.appid}/${this.user_id}/instances/${instance_id}`
        if (this.log) {
            console.log("saving instance...");
        }
        let options = {
            url: URL,
            headers: {
                "Authorization": this.jwt,
                "Content-Type": "application/json;charset=UTF-8"
            },
            data: data,
            method: 'POST'
        }
        Chat21Client.myrequest(options, (err, response, json) => {
            if (err) {
                callback(err, null);
            }
            else if (json && callback) {
                callback(null, json);
            }
        }, this.log);
    }

    archiveConversation(conversWith, callback) {
        // callback - function (err) 
        if (this.log) {
            console.log("archiving conversation with:", conversWith)
        }
        // 'apps/tilechat/users/USER_ID/conversations/CONVERS_WITH/archive'
        let dest_topic = 'apps/tilechat/users/' + this.user_id + '/conversations/' + conversWith + '/archive'
        if (this.log) {
            console.log("archive dest_topic:", dest_topic)
        }
        // let patch = {
        //     action: 'archive'
        // }
        const payload = JSON.stringify({})
        // console.log("payload:", payload)
        this.client.publish(dest_topic, payload, null, (err) => {
            if (callback) {
                callback(err)
            }
        })
    }

    // onMessage(callback) {
    //     this.last_handler++
    //     this.onMessageCallbacks.set(this.last_handler, callback)
    //     return this.last_handler;
    // }

    onConversationAdded(callback) {
        this.last_handler++
        this.onConversationAddedCallbacks.set(this.last_handler, callback)
        return this.last_handler;
    }

    onConversationUpdated(callback) {
        this.last_handler++
        this.onConversationUpdatedCallbacks.set(this.last_handler, callback)
        return this.last_handler;
    }

    onConversationDeleted(callback) {
        this.last_handler++
        this.onConversationDeletedCallbacks.set(this.last_handler, callback)
        return this.last_handler;
    }

    onArchivedConversationAdded(callback) {
        this.last_handler++
        this.onArchivedConversationAddedCallbacks.set(this.last_handler, callback)
        return this.last_handler;
    }

    onArchivedConversationDeleted(callback) {
        this.last_handler++
        this.onArchivedConversationDeletedCallbacks.set(this.last_handler, callback)
        return this.last_handler;
    }

    onMessageAdded(callback) {
        this.last_handler++
        this.onMessageAddedCallbacks.set(this.last_handler, callback)
        return this.last_handler;
    }

    onMessageAddedInConversation(conversWith, callback) {
        this.last_handler++
        const callback_obj = {
            "type": CALLBACK_TYPE_ON_MESSAGE_ADDED_FOR_CONVERSATION,
            "conversWith": conversWith,
            "callback": callback
        }
        this.callbackHandlers.set(this.last_handler, callback_obj)
        // TODO (for performance): addToMessageAddedInConversationCallbacks(conversWith, this.last_handler)

        // this.callbackHandlers = new Map();
        // key: handler_id
        // value: {
        //     "type": "messageAddedInConversation",
        //     "conversWith": "ID",
        //     "callback": callback
        // }
        return this.last_handler;
    }

    onMessageUpdatedInConversation(conversWith, callback) {
        this.last_handler++
        const callback_obj = {
            "type": CALLBACK_TYPE_ON_MESSAGE_UPDATED_FOR_CONVERSATION,
            "conversWith": conversWith,
            "callback": callback
        }
        this.callbackHandlers.set(this.last_handler, callback_obj)

        // this.last_handler++
        // callback_obj = {
        //     "conversWith": conversWith,
        //     "callback": callback
        // }
        // this.onMessageUpdatedCallbacks.set(this.last_handler, callback_obj)
        return this.last_handler;
    }

    onMessageUpdated(callback) {
        this.last_handler += 1
        this.onMessageUpdatedCallbacks.set(this.last_handler, callback)
        return this.last_handler;
    }

    onGroupUpdated(callback) {
        this.last_handler += 1
        this.onGroupUpdatedCallbacks.set(this.last_handler, callback)
        return this.last_handler;
    }

    removeOnMessageAddedHandler(handler) {
        this.onMessageAddedCallbacks.delete(handler);
    }

    removeOnGroupUpdatedHandler(handler) {
        this.onGroupUpdatedCallbacks.delete(handler);
    }

    start(subscribedCallback) {
        if (this.on_message_handler) {
            if (this.log) {
                console.log("this.on_message_handler already subscribed. Reconnected num", this.reconnections)
            }
            subscribedCallback();
            return
        }
        this.subscribeToMyConversations(() => {
            // no more than one "on_message" handler, thanks.
            // console.log("Subscribed to MyConversations.");
            this.on_message_handler = this.client.on('message', (topic, message) => {
                if (this.log) {
                    console.log("topic:" + topic + "\nmessage payload:" + message)
                }
                const _topic = this.parseTopic(topic)
                if (!_topic) {
                    if (this.log) {
                        console.log("Invalid message topic:", topic);
                    }
                    return;
                }
                const conversWith = _topic.conversWith
                try {
                    const message_json = JSON.parse(message.toString())
                    

                    // TEMPORARILY DISABLED, ADDED-CONVERSATIONS ARE OBSERVED BY NEW MESSAGES.
                    // MOVED TO: this.onMessageAddedCallbacks
                    // if (this.onConversationAddedCallbacks) {
                    //     if (topic.includes("/conversations/") && topic.endsWith(_CLIENTADDED)) {
                    //         // map.forEach((value, key, map) =>)
                    //         this.onConversationAddedCallbacks.forEach((callback, handler, map) => {
                    //             callback(message_json, _topic)
                    //         });
                    //     }
                    // }

                    if (this.onConversationUpdatedCallbacks) {
                        // example topic: apps.tilechat.users.ME.conversations.CONVERS-WITH.clientdeleted
                        if (topic.includes("/conversations/") && topic.endsWith(_CLIENTUPDATED)) {
                            if (this.log) {
                                console.log("conversation updated! /conversations/, topic:", topic)
                            }
                            // map.forEach((value, key, map) =>)
                            this.onConversationUpdatedCallbacks.forEach((callback, handler, map) => {
                                callback(JSON.parse(message.toString()), _topic)
                            });
                        }
                    }

                    if (this.onConversationDeletedCallbacks) {
                        if (topic.includes("/conversations/") && topic.endsWith(_CLIENTDELETED)) {
                            // map.forEach((value, key, map) =>)
                            if (this.log) {
                                console.log("conversation deleted! /conversations/, topic:", topic, message.toString() );
                            }
                            this.onConversationDeletedCallbacks.forEach((callback, handler, map) => {
                                callback(JSON.parse(message.toString()), _topic)
                            });
                        }
                    }

                    if (this.onArchivedConversationAddedCallbacks) {
                        if (topic.includes("/archived_conversations/") && topic.endsWith(_CLIENTADDED)) {
                            // map.forEach((value, key, map) =>)
                            this.onArchivedConversationAddedCallbacks.forEach((callback, handler, map) => {
                                callback(JSON.parse(message.toString()), _topic)
                            });
                        }
                    }

                    if (this.onArchivedConversationDeletedCallbacks) {
                        if (topic.includes("/archived_conversations/") && topic.endsWith(_CLIENTDELETED)) {
                            // map.forEach((value, key, map) =>)
                            this.onArchivedConversationDeletedCallbacks.forEach((callback, handler, map) => {
                                callback(JSON.parse(message.toString()), _topic)
                            });
                        }
                    }

                    // *********************************************************
                    // This snippet is important to get all messages and notify
                    // conversation > added (to create a conversation entry)
                    // *********************************************************
                    // if (this.onMessageAddedCallbacks) {
                    //     console.log("ttttttttt")
                    if (topic.includes("/messages/") && topic.endsWith(_CLIENTADDED)) {
                        if (this.onMessageAddedCallbacks) {
                            this.onMessageAddedCallbacks.forEach((callback, handler, map) => {
                                // console.log("DEBUG: MESSAGE:", message)
                                callback(JSON.parse(message.toString()), _topic)
                            });
                        }
                        // Observing conversations added from messages
                        // console.log("Observing conversations added from messages", message_json);
                        // if (this.onConversationAddedCallbacks) {
                        let update_conversation = true;
                        
                        if (message_json.attributes && message_json.attributes.updateconversation == false) {
                            update_conversation = false
                        }
                        if (update_conversation && this.onConversationAddedCallbacks) {
                            this.onConversationAddedCallbacks.forEach((callback, handler, map) => {
                                message_json.is_new = true;
                                const message_for_conv_string = JSON.stringify(message_json);
                                callback(JSON.parse(message_for_conv_string), _topic)
                            });
                        }
                        // }
                    }
                    // }

                    if (this.onMessageUpdatedCallbacks) {
                        if (topic.includes("/messages/") && topic.endsWith(_CLIENTUPDATED)) {
                            this.onMessageUpdatedCallbacks.forEach((callback, handler, map) => {
                                callback(JSON.parse(message.toString()), _topic)
                            });
                        }
                    }

                    if (this.onGroupUpdatedCallbacks) {
                        if (topic.includes("/groups/") && topic.endsWith(_CLIENTUPDATED)) {
                            this.onGroupUpdatedCallbacks.forEach((callback, handler, map) => {
                                callback(JSON.parse(message.toString()), _topic)
                            });
                        }
                    }

                    // // ******* NEW!!
                    this.callbackHandlers.forEach((value, key, map) => {
                        const callback_obj = value
                        // callback_obj = {
                        //     "type": "onMessageUpdatedForConversation",
                        //     "conversWith": conversWith,
                        //     "callback": callback
                        // }
                        const type = callback_obj.type
                        if (topic.includes("/messages/") && topic.endsWith(_CLIENTADDED)) {
                            if (this.log) { console.log("/messages/_CLIENTADDED") }
                            if (type === CALLBACK_TYPE_ON_MESSAGE_ADDED_FOR_CONVERSATION) {
                                if (conversWith === callback_obj.conversWith) {
                                    if (this.log) { console.log("/messages/_CLIENTADDED on: ", conversWith)}
                                    callback_obj.callback(JSON.parse(message.toString()), _topic)
                                }
                            }
                        }
                        if (topic.includes("/messages/") && topic.endsWith(_CLIENTUPDATED)) {
                            if (this.log) {console.log("/messages/_CLIENTUPDATED")}
                            if (type === CALLBACK_TYPE_ON_MESSAGE_UPDATED_FOR_CONVERSATION) {
                                if (conversWith === callback_obj.conversWith) {
                                    if (this.log) {console.log("/messages/_CLIENTUPDATED on: ", conversWith);}
                                    callback_obj.callback(JSON.parse(message.toString()), _topic)
                                }
                            }
                        }
                    })
                    
                    // if (topic.includes("/messages/") && topic.endsWith(_CLIENTUPDATED)) {
                    //     this.onMessageUpdatedInConversationCallbacks.forEach((obj, handler, map) => {
                    //         if (conversWith === obj.conversWith) {
                    //             callback(message_json, _topic)
                    //         }
                    //     });
                    // }
                    

                }
                catch (err) {
                    console.error("ERROR:", err)
                }
            })
            subscribedCallback();
        })
        
        // console.log("HANDLER_:", this.on_message_handler)
    }

    parseTopic(topic) {
        var topic_parts = topic.split("/");
        // /apps/tilechat/users/(ME)/messages/RECIPIENT_ID/ACTION
        if (topic_parts.length >= 7) {
            const app_id = topic_parts[1];
            const sender_id = topic_parts[3];
            const recipient_id = topic_parts[5];
            const convers_with = recipient_id;
            const me = sender_id;
            const parsed = {
                "conversWith": convers_with
            }
            return parsed;
        }
        return null;
    }

    lastArchivedConversations(callback) {
        // ex.: http://localhost:8004/tilechat/04-ANDREASPONZIELLO/archived_conversations
        const URL = `${this.APIendpoint}/${this.appid}/${this.user_id}/archived_conversations`
        if (this.log) {console.log("getting last archived conversations...", URL)}
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", URL, true);
        xmlhttp.setRequestHeader("authorization", this.jwt);
        xmlhttp.onreadystatechange = function() {
            // console.log("onreadystatechange!")
            if (callback && xmlhttp.readyState == 4 && xmlhttp.status == 200 && xmlhttp.responseText) {
                try {
                    const json = JSON.parse(xmlhttp.responseText)
                    callback(null, json.result)
                }
                catch (err) {
                    console.error("parsing json ERROR", err)
                    callback(err, null)
                }
            }
        };
        xmlhttp.send(null);
    }

    lastConversations(archived, callback) {
        // ex.: http://localhost:8004/tilechat/04-ANDREASPONZIELLO/conversations
        const archived_url_part = archived ? '/archived' : '';
        const URL = `${this.APIendpoint}/${this.appid}/${this.user_id}/conversations` + archived_url_part;
        if (this.log) {console.log("getting last convs...", URL);}
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", URL, true);
        xmlhttp.setRequestHeader("authorization", this.jwt);
        xmlhttp.onreadystatechange = function() {
            // console.log("onreadystatechange!")
            if (callback && xmlhttp.readyState == 4 && xmlhttp.status == 200 && xmlhttp.responseText) {
                try {
                    const json = JSON.parse(xmlhttp.responseText)
                    callback(null, json.result)
                }
                catch (err) {
                    console.error("parsing json ERROR", err)
                    callback(err, null)
                }
            }
        };
        xmlhttp.send(null);
    }

    conversationDetail(conversWith, callback) {
        if (this.log) {
            console.log("conversationDetail(). searching on user:", this.user_id, " - conversWith:", conversWith)
        }
        this.crossConversationDetail(conversWith, false, callback);
    }

    archivedConversationDetail(conversWith, callback) {
        if (this.log) {
            console.log("archivedConversationDetail(). searching on user:", this.user_id, " - conversWith:", conversWith)
        }
        this.crossConversationDetail(conversWith, true, callback);
    }

    crossConversationDetail(conversWith, archived, callback) {
        if (this.log) {
            console.log("searching on user:", this.user_id, " - conv of conversWith:", conversWith, " - archived:", archived)
        }
        let path = "conversations";
        if (archived) {
            path = "archived_conversations"
        }
        // ex.: http://localhost:8004/tilechat/04-ANDREASPONZIELLO/conversations/CONVERS_WITH
        //const URL = `${this.APIendpoint}/${this.appid}/${this.user_id}/conversations/${conversWith}`
        const URL = `${this.APIendpoint}/${this.appid}/${this.user_id}/${path}/${conversWith}`
        if (this.log) {
            console.log("getting conversation detail:", URL);
            console.log("conversWith:", conversWith);
        }
        
        let options = {
            url: URL,
            headers: {
                "Authorization": this.jwt
                // "Content-Type": "application/json;charset=UTF-8"
            },
            method: 'GET'
        }
        Chat21Client.myrequest(options, (err, response, json) => {
            if (this.log) {
                console.log("JSON...", json);
            }
            if (json && json.result && Array.isArray(json.result) && json.result.length ==1) {
                callback(null, json.result[0]);
            }
            else {
                callback(null, null);
            }
        }, this.log);
        
        // var xmlhttp = new XMLHttpRequest();
        // xmlhttp.open("GET", URL, true);
        // xmlhttp.setRequestHeader("authorization", this.jwt);
        // xmlhttp.onreadystatechange = function() {
        //     if (callback && xmlhttp.readyState == 4 && xmlhttp.status == 200 && xmlhttp.responseText) {
        //         try {
        //             const json = JSON.parse(xmlhttp.responseText);
        //             if (json && json.result && Array.isArray(json.result) && json.result.length ==1) {
        //                 callback(null, json.result[0]);
        //             }
        //             else {
        //                 callback({"message": "Incorrect conversation result."}, null);
        //             }
        //         }
        //         catch (err) {
        //             console.error("parsing json ERROR", err);
        //             callback(err, null);
        //         }
        //     }
        // };
        // xmlhttp.send(null);
    }

    lastMessages(convers_with, callback) {
        // console.log("START: ", this.user_id)
        // ex.: http://localhost:8004/tilechat/04-ANDREASPONZIELLO/conversations
        const URL = this.APIendpoint + "/" + this.appid + "/" + this.user_id + "/conversations/" + convers_with + "/messages"
        // console.log("getting last messages", URL)
        // console.log("END")
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", URL, true);
        xmlhttp.setRequestHeader("authorization", this.jwt);
        xmlhttp.onreadystatechange = function() {
            // console.log("onreadystatechange messages!")
            if (callback && xmlhttp.readyState == 4 && xmlhttp.status == 200 && xmlhttp.responseText) {
                // console.log("xmlhttp...", xmlhttp.responseText)
                try {
                    // console.log("parsing json messages")
                    const json = JSON.parse(xmlhttp.responseText)
                    callback(null, json.result)
                }
                catch (err) {
                    console.error("parsing json messages ERROR", err)
                    callback(err, null)
                }
            }
        };
        xmlhttp.send(null);
    }

    static myrequest(options, callback, log) {
        // url: options.url,
        // headers: options.headers,
        // data: options.data,
        // method: options.method
        if (log) {
          console.log("HTTP Request:", options);
        }
        if (isBrowser()) {
            let xmlhttp = new XMLHttpRequest();
            xmlhttp.open(options.method, options.url, true);
            Object.keys(options.headers).forEach((key) => {
                xmlhttp.setRequestHeader(key, options.headers[key]);
            });
            xmlhttp.onreadystatechange = function() {
                if (callback && xmlhttp.readyState == 4 && xmlhttp.status == 200 && xmlhttp.responseText) {
                    try {
                        const json = JSON.parse(xmlhttp.responseText)
                        callback(null, null, json)
                    }
                    catch (err) {
                        console.error("parsing json ERROR", err)
                        callback(err, null)
                    }
                }
            };
            if (options.method === 'POST') {
                xmlhttp.send(JSON.stringify(options.data));
            }
            else {
                xmlhttp.send(null);
            }
        }
        else {
            axios(
                {
                  url: options.url,
                  method: options.method,
                  data: options.data,
                  headers: options.headers
                })
              .then(function (response) {
                if (log) {console.log("response.status:", response.status);}
                // if (log) {console.log("response.data:", response.data);}
                if (callback) {
                    callback(null, response.headers, response.data);
                }
              })
              .catch(function (error) {
                console.error("Axios call error:", error);
                if (callback) {
                    callback(error, null, null);
                }
              });

            // request(
            //     {
            //       url: options.url,
            //       headers: options.headers,
            //       json: options.json,
            //       method: options.method
            //     },
            //     function(err, res, resbody) {
            //       if (log) {
            //         console.log("** For url:", options.url);
            //         console.log("** Options:", options);
            //         console.log("** Err:", err);
            //         console.log("** Response headers:\n", res.headers);
            //         console.log("** Response body:\n", res.body);
            //       }
            //       if (callback) {
            //         callback(err, res, resbody);
            //       }
            //     }
            // );
        }
        
    }

    connect(user_id, jwt, callback) {
        this.user_id = user_id;
        // console.log("userid:", this.user_id)
        this.jwt = jwt
        if (this.log) {
            console.log("connecting user_id:", user_id)
            console.log("using jwt token:", jwt)
        }
        
        if (this.client) {
            this.client.end()
        }
        this.presence_topic = 'apps/tilechat/users/' + this.user_id + '/presence/' + this.client_id
        let options = {
            keepalive: 10,
            // protocolId: 'MQTT',
            // protocolVersion: 4,
            // clean: true,
            reconnectPeriod: 1000,
            // connectTimeout: 30 * 1000,
            will: {
                topic: this.presence_topic,
                payload: '{"disconnected":true}',
                qos: 1,
                retain: true
            },
            clientId: this.client_id,
            username: 'JWT',
            password: jwt,
            rejectUnauthorized: false
        }
        if (this.log) {console.log("starting mqtt connection with LWT on:", this.presence_topic, this.endpoint)}
        // client = mqtt.connect('mqtt://127.0.0.1:15675/ws',options)
        //console.log("starting mqtt connection with LWT on:", this.presence_topic, this.endpoint)
        this.client = mqtt.connect(this.endpoint,options)
        
        this.client.on('connect', // TODO if token is wrong it must reply with an error!
            () => {
                if (this.log) {
                    console.log("Chat client connected. User:" + user_id)
                    console.log("Chat client connected. this.connected:" + this.connected)
                }
                if (!this.connected) {
                    if (this.log) {console.log("Chat client first connection for:" + user_id)}
                    this.connected = true
                    callback();
                    this.start( () => {
                        // callback();
                    });
                }
                this.client.publish(
                    this.presence_topic,
                    JSON.stringify({connected: true}),
                    null, (err) => {
                        if (err) {
                            console.error("Error con presence publish:", err);
                        }
                    }
                );
            }
        );
        this.client.on('reconnect',
            () => {
                if (this.log) {console.log("Chat client reconnect event");}
            }
        );
        this.client.on('close',
            () => {
                this.connected = false
                if (this.log) {console.log("Chat client close event");}
            }
        );
        this.client.on('offline',
            () => {
                if (this.log) {console.log("Chat client offline event");}
            }
        );
        this.client.on('error',
            (error) => {
                console.error("Chat client error event", error);
            }
        );
    }

    ImHere() {
        if (this.client) {
            this.client.publish(
                this.presence_topic,
                JSON.stringify({connected: true}),
                null, (err) => {
                    if (err) {
                        console.error("Error on presence publish:", err);
                    }
                }
            );
        }
    }

    close(callback) {
        if (this.topic_inbox) {
            this.client.unsubscribe(this.topic_inbox, (err)  => {
                if (this.log) {console.log("unsubscribed from", this.topic_inbox);}
                this.client.end(() => {
                    this.connected = false
                    // reset all subscriptions
                    this.onConversationAddedCallbacks = new Map();
                    this.onConversationUpdatedCallbacks = new Map();
                    this.onConversationDeletedCallbacks = new Map();
                    this.onArchivedConversationAddedCallbacks = new Map();
                    this.onArchivedConversationDeletedCallbacks = new Map();
                    this.onMessageAddedCallbacks = new Map();
                    this.onMessageUpdatedCallbacks = new Map();
                    this.onGroupUpdatedCallbacks = new Map();
                    this.callbackHandlers = new Map();
                    this.on_message_handler = null
                    this.topic_inbox = null;
                    if (callback) {
                        callback();
                    }
                })
            });
        }
    }

    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
    }
}

function isBrowser() {
    return true;
    // return false;
}

export { Chat21Client }; // Browser
//module.exports = { Chat21Client };