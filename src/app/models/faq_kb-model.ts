export interface FaqKb {
    _id?: string;
    updatedAt?: any;
    createdAt?: any;
    name?: string;
    url?: string;
    webhook_enabled?: boolean;
    webhook_url?: string;
    kbkey_remote?: string;
    id_project?: string;
    createdBy?: string;
    __v?: any;
    has_faq?: any;
    faqs_number?: number;
    external?: boolean;
    type?: string;
    description?: string;
    message_count?: number;
    mainCategory?: any
    language?: string;
   
  
}

export interface Chatbot extends FaqKb {
    attributes?: any
    public?: boolean;
    certified?: boolean;
    tags?: any;
    title?: string;
    short_description?: string;
    certifiedTags?: Array<{color: string, name: string}>;
    intentsEngine?: 'none' | 'tiledesk-ai',
    imageURL: string;
}