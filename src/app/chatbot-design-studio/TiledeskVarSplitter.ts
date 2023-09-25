export class TiledeskVarSplitter {
    contructor() {
    }

    getSplits(str) {
        const regexp = new RegExp("\\$\\{([0-9a-zA-Z_]+)\\}", "gm");
        let splits = [];
        let match;
        let head_index = 0;
        while ((match = regexp.exec(str)) !== null) {
            const last_index = match.index + match[0].length;
            const head_text = str.substring(head_index, match.index);
            splits.push(
                {
                    type:"text",
                    text: head_text
                });
            const tag_text = str.substring(match.index, last_index)
            splits.push({
                type: "tag",
                name: match[1]
            });
            head_index = last_index;
        }
        splits.push({
            type:"text",
            text: str.substring(head_index)
        });
        return splits;
    }
}

// exports { TiledeskVarSplitter };
