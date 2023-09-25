export interface Project {
    _id: string;
    updatedAt?: any;
    createdAt?: any;
    name?: string;
    activeOperatingHours?: boolean;
    operatingHours?: any
    createdBy?: string;
    id_project?: any;
    widget?: any;
    settings?: any;
    role?: string;
    user_available?: boolean;
    profile_name?: any;
    profile_agents?: any;
    trialExpired?: any;
    trialDaysLeft?: number;
    trialDays?: number;
    // profile_type?: string;
    isActiveSubscription?: boolean;
    profile?: any;
    // subscription_end_date?: any;
    // subscription_id?: any;
    // subscription_creation_date?: any;
    // subscription_start_date?: any;
    __v?: any;
}