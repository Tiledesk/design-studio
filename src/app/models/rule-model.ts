export interface IRules {
    [id: string]:Rule[]
}

export interface Rule {
    uid: string,
    name: string,
    description?: string,
    when: {
        regexOption: string,
        text: string, 
        urlMatches: string, 
        triggerEvery: number},
    do: [
        // {wait: number},
        {message: any}
    ]
}