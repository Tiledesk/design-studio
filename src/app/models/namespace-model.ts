export class Namespace {
    _id: string;
    id_project: string;
    default: boolean
    namespace_id: string;
    name: string;
    preview_settings: {
        model: string,
        max_tokens: number,
        temperature: number,
        top_k: number,
        context: string
    };

}