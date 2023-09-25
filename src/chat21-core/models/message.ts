export class MessageModel {
    constructor(
        public uid: string,
        public language: string,
        public recipient: string,
        public recipient_fullname: string,
        public sender: string,
        public sender_fullname: string,
        public status: number,
        public metadata: any,
        public text: string,
        public timestamp: any,
        public type: string,
        public attributes: any,
        public channel_type: string,
        public isSender: boolean,
        public emoticon?: boolean
    ) { }
}
