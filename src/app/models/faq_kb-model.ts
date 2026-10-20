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
    subtype?: string
    parent_id?: string;
    description?: string;
    message_count?: number;
    mainCategory?: any
    language?: string;
    /** Il server lo mette a true a ogni modifica di un intent o del chatbot, e a false
     *  quando il chatbot viene pubblicato. Sta qui e non solo su Chatbot perche' le liste
     *  (per esempio i subagent da pubblicare) arrivano tipizzate FaqKb. */
    modified?: boolean;
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
    slug?: string;
    imageURL: string;
    agents_available?: boolean;
    subtype: string;
}