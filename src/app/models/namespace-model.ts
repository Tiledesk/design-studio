export class Namespace {
    id: string;
    id_project: string;
    default: boolean
    name: string;
    engine: {
        type: string;
    }
    preview_settings: {
        model: string,
        max_tokens: number,
        temperature: number,
        top_k: number,
        context: string
    };

}