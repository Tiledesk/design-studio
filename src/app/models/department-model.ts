export interface Department {
    _id?: string;
    id?: string;
    updatedAt?: any;
    createdAt?: any;
    name?: string;
    id_project?: string;
    createdBy?: string;
    id_bot?: string;
    bot_only?: boolean;
    id_group?: string;
    routing?: string;
    description?: string;
    default?: boolean;
    status?: number;
    tags?: any;
    __v: any;
    // custom
    groupHasBeenTrashed?: boolean;
    botHasBeenTrashed?: boolean;
    hasDeptName?: string;
    hasBot?: boolean;
    hasGroupName?: string;
}