import { PLAN_NAME } from "src/chat21-core/utils/constants";

export interface Project {
    _id: string;
    updatedAt?: any;
    createdAt?: any;
    name?: string;
    activeOperatingHours?: boolean;
    operatingHours?: any
    timeSlots?: {
        [key: string]: { name: string, hours: string, active: boolean}
    }
    createdBy?: string;
    id_project?: any;
    widget?: any;
    settings?: any;
    role?: string;
    user_available?: boolean;
    
    trialExpired?: any;
    trialDaysLeft?: number;
    isActiveSubscription?: any;
    profile?: {
        name: PLAN_NAME;
        trialDays: number;
        agents: number;
        type: string;
        subStart: string;
        subEnd: string;
        subscriptionId: string;
        subscription_creation_date: string;
    };
    extra1?: string;
    extra2?: string;
    extra3?: string;
    extra4?: string;
    __v?: any;
}
