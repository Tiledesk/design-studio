export interface KbSettings {
    _id?: string;
    id_project: string;
    gptkey: string;
    maxKbsNumber: number;
    maxPagesNumber: number;
    kbs: KB[];
}

export interface KB {
    _id?: string;
    name: string;
    url: string;
    createdAt?: Date;
    status?: number;
}