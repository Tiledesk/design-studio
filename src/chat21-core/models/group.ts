export class GroupModel {
    constructor(
        public uid: string,
        public createdOn: any,
        public iconURL: string,
        public members: any[],
        public membersinfo: any[],
        public name: string,
        public owner: string,
        public color: string,
        public avatar: string
    ) { }
}
