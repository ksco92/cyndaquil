import {readdirSync} from 'fs';

export default function getFunctionMetadataLocations() {
    return readdirSync('lib/configs/lambdas/', {withFileTypes: true,})
        .filter((dirent) => !dirent.isDirectory())
        .filter((dirent) => dirent.name.includes('.json'))
        .map((dirent) => `lib/configs/lambdas/${dirent.name}`);
}
