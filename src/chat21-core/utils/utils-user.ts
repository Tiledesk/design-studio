/**
 * getColorBck
 * @param str
 */
export function getColorBck(str: string): string {
    // const arrayBckColor = ['#fba76f', '#80d066', '#73cdd0', '#ecd074', '#6fb1e4', '#f98bae'];
    const arrayBckColor = ['#E17076', '#7BC862', '#65aadd', '#a695e7', '#ee7aae', '#6ec9cb', '#faa774'];
    let num = 0;
    if (str) {
        const code = str.charCodeAt((str.length - 1));
        num = Math.round(code % arrayBckColor.length);
    }
    return arrayBckColor[num];
}

/**
 * avatarPlaceholder
 * @param name
 */
export function avatarPlaceholder(name: string): string {
    let initials = '';
    if (name) {
        const arrayName = name.split(' ');
        arrayName.forEach(member => {
        if (member.trim().length > 1 && initials.length < 3) {
            initials += member.substring(0, 1).toUpperCase();
        }
        });
    }
    return initials;
}

/**
 * getImageUrlThumbFromFirebasestorage
 * @param uid
 * @param FIREBASESTORAGE_BASE_URL_IMAGE
 * @param urlStorageBucket
 */
export function getImageUrlThumbFromFirebasestorage(
    uid: string,
    FIREBASESTORAGE_BASE_URL_IMAGE: string,
    urlStorageBucket: string
): string {
    const imageurl = FIREBASESTORAGE_BASE_URL_IMAGE + urlStorageBucket + uid + '%2Fthumb_photo.jpg?alt=media';
    return imageurl;
}
