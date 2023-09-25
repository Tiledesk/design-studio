import { MessageModel } from '../models/message';
import { ConversationModel } from '../models/conversation';
import { v4 as uuidv4 } from 'uuid';
import {
  MESSAGE_TYPE_INFO,
  MESSAGE_TYPE_MINE,
  MESSAGE_TYPE_OTHERS,
  MAX_WIDTH_IMAGES,
  CHANNEL_TYPE_GROUP,
  TYPE_SUPPORT_GROUP
} from '../../chat21-core/utils/constants';

/** */
export function isImage(message: any) {
  if (message && message.type && message.type === 'image' && message.metadata && message.metadata.src) {
    return true;
  }
  return false;
}

export function isFrame(message: any) {
  if (message && message.type && message.type === 'frame' && message.metadata && message.metadata.src) {
    return true;
  }
  return false;
}

/** */
export function isFile(message: any) {
  if (message && message.type && message.type === 'file' && message.metadata && message.metadata.src && !message.metadata.type.includes('audio')) {
    return true;
  }
  return false;
}

export function isAudio(message: any) {
  if (message && message.type && message.type === 'file' && message.metadata && message.metadata.src && message.metadata.type.includes('audio') ) {
    return true;
  }
  return false;
}

/** */
export function isInfo(message: any) {
  if (message.attributes && (message.attributes.subtype === 'info' || message.attributes.subtype === 'info/support')) {
    return true;
  }
  return false;
}

/** */
export function isMine(message: any) {
  if (message.isSender) {
    return true;
  }
  return false;
}

export function isSender(sender: string, currentUserId: string) {
  if (currentUserId) {
      if (sender === currentUserId) {
          return true;
      } else {
          return false;
      }
  } else {
      return false;
  }
}

export function isSameSender(messages, senderId, index):boolean{
  if(senderId && messages[index - 1] && (senderId === messages[index - 1].sender)){
    return true;
  }
  return false;
}

export function isLastMessage(messages, idMessage):boolean {
  if (idMessage === messages[messages.length - 1].uid) {
    return true;
  }
  return false;
}

export function isFirstMessage(messages, senderId, index):boolean{
  if(senderId && index == 0 && messages[index] && (messages[index] !== senderId)){
    return true;
  }
  return false;
}

/** */
export function messageType(msgType: string, message: any) {
  
  if (msgType === MESSAGE_TYPE_INFO) {
    return isInfo(message);
  }
  if (msgType === MESSAGE_TYPE_MINE) {
    return isMine(message);
  }
  if (msgType === MESSAGE_TYPE_OTHERS) {
    if (isInfo(message) === false && isMine(message) === false) {
      return true;
    }
    return false;
  }
}

/** */
export function getSizeImg(message: any, maxWidthImage?: number): any {
  try {
    const metadata = message.metadata;
    const sizeImage = {
      width: metadata.width,
      height: metadata.height
    };
    if (!maxWidthImage) {
      maxWidthImage = MAX_WIDTH_IMAGES;
    }
    if (metadata.width && metadata.width > maxWidthImage) {
      const rapporto = (metadata['width'] / metadata['height']);
      sizeImage.width = maxWidthImage;
      sizeImage.height = maxWidthImage / rapporto;
    }
    return sizeImage;
  } catch (err) {
    console.error('error: ', err);
    return;
  }
}

/** */
export function isChannelTypeGroup(channelType: string) {
  if (channelType === CHANNEL_TYPE_GROUP || channelType === TYPE_SUPPORT_GROUP) {
    return true;
  }
  return false;
}

export function isEmojii(message: any){
  
  // let emoji = '';
  // try {
  //   emoji = message.trim(); // .charAt(0);
  //   if (emoji.length > 2) {
  //     return false;
  //   }
  // } catch (e) {
  //   return false;
  // }
  // // const regex = '(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])'
  // const ranges = ['(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])'];
  // if (emoji.match(ranges.join('|'))) {
  //     return true;
  // } else {
  //     return false;
  // }
  // https://localcoder.org/javascript-detect-if-a-string-contains-only-unicode-emojis
  try {
    if(!message) return false;
    const onlyEmojis = message.replace(new RegExp('[\u0000-\u1eeff]', 'g'), '')
    const visibleChars = message.replace(new RegExp('[\n\r\s]+|( )+', 'g'), '')
    const chineseChars = message.replace(new RegExp('[\u4e00-\u9fa5]', 'g'), '')
    if(onlyEmojis === '' || visibleChars == '' || chineseChars =='') return false
    return (onlyEmojis.length === visibleChars.length && onlyEmojis.length <= 2)
  } catch(e) {
    return false
  }
}

export function isJustRecived(startedAt, time) {
  if (time > startedAt) {
    return true;
  }
  return false;
}

export function checkIfIsMemberJoinedGroup(msg, loggedUser): boolean{
  if(msg && msg.attributes && msg.attributes.messagelabel
      && msg.attributes.messagelabel['key']=== "MEMBER_JOINED_GROUP" 
      && msg.attributes.messagelabel.parameters['member_id'] !== loggedUser.uid
      && !msg.attributes.messagelabel.parameters['member_id'].includes('bot') 
      && !msg.attributes.messagelabel.parameters['member_id'].includes('system')){
          return true
  }
  return false
  
}

export function hideInfoMessage(msg, infoMessageKeyEnabled): boolean{
  if(msg && msg.attributes && msg.attributes.messagelabel
    && infoMessageKeyEnabled.includes(msg.attributes.messagelabel['key'])){
      return false
  }
  return true
}

export function getProjectIdSelectedConversation(conversationWith: string): string{
  const conversationWith_segments = conversationWith.split('-')
  // Removes the last element of the array if is = to the separator
  if (conversationWith_segments[conversationWith_segments.length - 1] === '') {
    conversationWith_segments.pop()
  }
  let projectId = ''
  if (conversationWith_segments.length >= 4) {
    projectId = conversationWith_segments[2]
  }
  return projectId
}

export function conversationToMessage(conversation: ConversationModel, currentUserId: string): MessageModel{
  let message: any = {}
  message.uid = conversation['message_id']? conversation['message_id'] : uuidv4()
  message.text = conversation.text? conversation.text.trim(): conversation.last_message_text.trim()
  message.sender = conversation.sender
  message.sender_fullname = conversation.sender_fullname
  message.recipient = conversation.recipient
  message.recipient_fullname = conversation.recipient_fullname
  message.status = +conversation.status
  message.timestamp = conversation.timestamp
  message.metadata = conversation['metadata']
  message.channel_type = conversation.channel_type
  message.type = conversation.type
  message.isSender = isSender(message.sender, currentUserId)
  message.attributes = conversation.attributes

  return message as MessageModel
}

export function commandToMessage(msg: MessageModel, conversation: ConversationModel, currentUserId: string): MessageModel{
  let message: any = {}
  message.uid = conversation['message_id']? conversation['message_id'] : uuidv4()
  message.text = msg.text? msg.text.trim(): '';
  message.sender = conversation.sender
  message.sender_fullname = conversation.sender_fullname
  message.recipient = conversation.recipient
  message.recipient_fullname = conversation.recipient_fullname
  message.status = +conversation.status
  message.timestamp = conversation.timestamp
  message.metadata = msg['metadata']
  message.channel_type = conversation.channel_type
  message.type = msg.type
  message.isSender = isSender(message.sender, currentUserId)
  message.attributes = conversation.attributes

  return message as MessageModel
}


